import { and, eq, gte, inArray, isNull, lte, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  accountingAccounts,
  accountingAudit,
  accountingBankAccounts,
  accountingBills,
  accountingJournalLines,
  accountingJournals,
  accountingPayments,
  accountingPeriods,
  accountingSettings,
  accountingVatCodes,
  accountingVatReturns,
  operationEntries,
  operations,
  type JournalStatus,
  type PaymentDirection,
  type PaymentMethod,
  type VatTreatment,
} from "@/db/schema";
import { divisions, getDivisionById } from "@/lib/divisions";

import { defaultChart, defaultVatCodes } from "./chart";
import { vatOnNet } from "./documents";
import { costRecognitionDecision, paymentRetryDecision, settlementDecision } from "./overlap";
import {
  AccountingError,
  assertBalanced,
  filsToAmount,
  isIsoDate,
  lineSide,
  splitInclusiveVat,
  toFils,
} from "./money";

export type AccountingTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type JournalLineInput = {
  accountId?: string;
  accountCode?: string;
  organizationId?: string | null;
  contactId?: string | null;
  vatCodeId?: string | null;
  description?: string;
  debit: string;
  credit: string;
};

export type PostJournalInput = {
  companyId: string;
  entryDate: string;
  description: string;
  sourceType: string;
  sourceId?: string | null;
  status: JournalStatus;
  lines: JournalLineInput[];
  actorId: string;
  operationId?: string | null;
  operationEntryId?: string | null;
  billId?: string | null;
  organizationId?: string | null;
  contactId?: string | null;
  reversalOfId?: string | null;
};

export function postJournalWithin(tx: AccountingTx, input: PostJournalInput) {
  return postJournalTx(tx, input);
}

const readyCompanies = new Set<string>();
let booksInflight: Promise<void> | null = null;

export async function prepareAccounting(companyId: string) {
  const ids =
    companyId === "all" ? divisions.map((division) => division.id) : [companyId];
  for (const id of ids) {
    if (!getDivisionById(id)) throw new AccountingError("Choose a Zoom company");
  }
  if (ids.every((id) => readyCompanies.has(id))) return;
  await prepareAllCompanyBooks();
}

export async function ensureCompanyBooks(companyId: string) {
  await prepareAccounting(companyId);
}

function prepareAllCompanyBooks() {
  if (!booksInflight) {
    const ids = divisions.map((division) => division.id);
    booksInflight = ensureBooksBatch(ids)
      .then(() => {
        for (const id of ids) readyCompanies.add(id);
      })
      .finally(() => {
        booksInflight = null;
      });
  }
  return booksInflight;
}

async function ensureBooksBatch(companyIds: string[]) {
  if (companyIds.length === 0) return;
  const year = new Date().getFullYear();
  const fiscalYears = [year - 2, year - 1, year, year + 1];

  const [accounts, vatRows, settings, periods, banks] = await Promise.all([
    db
      .select({
        id: accountingAccounts.id,
        companyId: accountingAccounts.companyId,
        code: accountingAccounts.code,
      })
      .from(accountingAccounts)
      .where(inArray(accountingAccounts.companyId, companyIds)),
    db
      .select({
        companyId: accountingVatCodes.companyId,
        code: accountingVatCodes.code,
      })
      .from(accountingVatCodes)
      .where(inArray(accountingVatCodes.companyId, companyIds)),
    db
      .select({ companyId: accountingSettings.companyId })
      .from(accountingSettings)
      .where(inArray(accountingSettings.companyId, companyIds)),
    db
      .select({
        companyId: accountingPeriods.companyId,
        name: accountingPeriods.name,
      })
      .from(accountingPeriods)
      .where(inArray(accountingPeriods.companyId, companyIds)),
    db
      .select({ accountId: accountingBankAccounts.accountId })
      .from(accountingBankAccounts)
      .where(inArray(accountingBankAccounts.companyId, companyIds)),
  ]);

  const accountCodes = new Map<string, Set<string>>();
  const accountIds = new Map<string, Map<string, string>>();
  for (const row of accounts) {
    const codes = accountCodes.get(row.companyId) ?? new Set<string>();
    codes.add(row.code);
    accountCodes.set(row.companyId, codes);
    const ids = accountIds.get(row.companyId) ?? new Map<string, string>();
    ids.set(row.code, row.id);
    accountIds.set(row.companyId, ids);
  }
  const vatCodes = new Map<string, Set<string>>();
  for (const row of vatRows) {
    const codes = vatCodes.get(row.companyId) ?? new Set<string>();
    codes.add(row.code);
    vatCodes.set(row.companyId, codes);
  }
  const settingsIds = new Set(settings.map((row) => row.companyId));
  const periodNames = new Map<string, Set<string>>();
  for (const row of periods) {
    const names = periodNames.get(row.companyId) ?? new Set<string>();
    names.add(row.name);
    periodNames.set(row.companyId, names);
  }
  const linkedBankAccounts = new Set(banks.map((row) => row.accountId));

  const missingAccounts: Array<typeof accountingAccounts.$inferInsert> = [];
  const missingVat: Array<typeof accountingVatCodes.$inferInsert> = [];
  const missingSettings: Array<typeof accountingSettings.$inferInsert> = [];
  const missingPeriods: Array<typeof accountingPeriods.$inferInsert> = [];

  for (const companyId of companyIds) {
    const codes = accountCodes.get(companyId) ?? new Set<string>();
    const ids = accountIds.get(companyId) ?? new Map<string, string>();
    accountCodes.set(companyId, codes);
    accountIds.set(companyId, ids);
    for (const account of defaultChart) {
      if (codes.has(account.code)) continue;
      const id = crypto.randomUUID();
      codes.add(account.code);
      ids.set(account.code, id);
      missingAccounts.push({
        id,
        companyId,
        code: account.code,
        name: account.name,
        accountType: account.accountType,
        subtype: account.subtype,
        normalBalance: account.normalBalance,
        isActive: 1,
        isSystem: 1,
        currency: "BHD",
      });
    }

    if (!settingsIds.has(companyId)) {
      missingSettings.push({ companyId, currency: "BHD" });
    }

    const names = periodNames.get(companyId) ?? new Set<string>();
    for (const fiscalYear of fiscalYears) {
      const name = `FY ${fiscalYear}`;
      if (names.has(name)) continue;
      missingPeriods.push({
        id: crypto.randomUUID(),
        companyId,
        name,
        startsOn: `${fiscalYear}-01-01`,
        endsOn: `${fiscalYear}-12-31`,
        status: "open",
      });
    }

    const presentVat = vatCodes.get(companyId) ?? new Set<string>();
    for (const code of defaultVatCodes) {
      if (presentVat.has(code.code)) continue;
      missingVat.push({
        id: crypto.randomUUID(),
        companyId,
        code: code.code,
        name: code.name,
        rate: code.rate,
        treatment: code.treatment,
        isActive: 1,
      });
    }
  }

  const writes = [];
  if (missingAccounts.length > 0) {
    writes.push(
      db
        .insert(accountingAccounts)
        .values(missingAccounts)
        .onConflictDoNothing({
          target: [accountingAccounts.companyId, accountingAccounts.code],
        }),
    );
  }
  if (missingSettings.length > 0) {
    writes.push(
      db.insert(accountingSettings).values(missingSettings).onConflictDoNothing(),
    );
  }
  if (missingPeriods.length > 0) {
    writes.push(
      db
        .insert(accountingPeriods)
        .values(missingPeriods)
        .onConflictDoNothing({
          target: [accountingPeriods.companyId, accountingPeriods.name],
        }),
    );
  }
  if (missingVat.length > 0) {
    writes.push(
      db
        .insert(accountingVatCodes)
        .values(missingVat)
        .onConflictDoNothing({
          target: [accountingVatCodes.companyId, accountingVatCodes.code],
        }),
    );
  }
  if (writes.length > 0) await Promise.all(writes);

  let idsByCompany = accountIds;
  if (missingAccounts.length > 0) {
    const refreshed = await db
      .select({
        id: accountingAccounts.id,
        companyId: accountingAccounts.companyId,
        code: accountingAccounts.code,
      })
      .from(accountingAccounts)
      .where(inArray(accountingAccounts.companyId, companyIds));
    idsByCompany = new Map();
    for (const row of refreshed) {
      const ids = idsByCompany.get(row.companyId) ?? new Map<string, string>();
      ids.set(row.code, row.id);
      idsByCompany.set(row.companyId, ids);
    }
  }

  const missingBanks: Array<typeof accountingBankAccounts.$inferInsert> = [];
  for (const companyId of companyIds) {
    const ids = idsByCompany.get(companyId);
    const cashId = ids?.get("1000");
    const bankId = ids?.get("1010");
    if (cashId && !linkedBankAccounts.has(cashId)) {
      missingBanks.push({
        id: crypto.randomUUID(),
        companyId,
        accountId: cashId,
        name: "Cash",
        institution: "",
        accountNumber: "",
        currency: "BHD",
        kind: "cash",
        isActive: 1,
      });
    }
    if (bankId && !linkedBankAccounts.has(bankId)) {
      missingBanks.push({
        id: crypto.randomUUID(),
        companyId,
        accountId: bankId,
        name: "Bank",
        institution: "",
        accountNumber: "",
        currency: "BHD",
        kind: "bank",
        isActive: 1,
      });
    }
  }
  if (missingBanks.length > 0) {
    await db
      .insert(accountingBankAccounts)
      .values(missingBanks)
      .onConflictDoNothing({ target: accountingBankAccounts.accountId });
  }
}

export async function postJournal(input: PostJournalInput) {
  await ensureCompanyBooks(input.companyId);
  return db.transaction(async (tx) => postJournalTx(tx, input));
}

export async function reverseJournal(
  journalId: string,
  actorId: string,
  entryDate?: string,
) {
  return db.transaction(async (tx) => {
    const journal = await tx.query.accountingJournals.findFirst({
      where: eq(accountingJournals.id, journalId),
      with: { lines: true },
    });
    if (!journal) throw new AccountingError("Journal not found");
    if (journal.status !== "posted") {
      throw new AccountingError("Only a posted journal can be reversed");
    }
    if (journal.reversedById) {
      throw new AccountingError("This journal has already been reversed");
    }
    if (journal.reversalOfId) {
      throw new AccountingError("Reverse the original journal instead");
    }

    if (journal.sourceType === "procurement" && journal.sourceId) {
      const linked = await tx.query.accountingBills.findFirst({
        where: and(
          eq(accountingBills.companyId, journal.companyId),
          eq(accountingBills.procurementEntryId, journal.sourceId),
          eq(accountingBills.journalId, journal.id),
          ne(accountingBills.status, "reversed"),
        ),
      });
      if (linked) {
        const settled = await tx.execute<{ amount: string }>(sql`
          SELECT COALESCE(SUM(p.amount), 0)::text AS amount
          FROM accounting_payments p
          INNER JOIN accounting_journals j ON j.id = p.journal_id
          WHERE p.company_id = ${linked.companyId}
            AND j.status = 'posted'
            AND j.reversed_by_id IS NULL
            AND (
              p.bill_id = ${linked.id}
              OR (p.operation_entry_id = ${linked.procurementEntryId} AND p.bill_id IS NULL AND p.direction = 'payment')
            )
        `);
        const settledAmount = toFils(firstRow<{ amount?: string }>(settled).amount ?? "0");
        if (settledAmount > 0n || linked.status === "partial" || linked.status === "paid") {
          throw new AccountingError(
            `Supplier bill ${linked.billNumber} settles this payable. Reverse those payments before reversing the purchase.`,
          );
        }
        await tx
          .update(accountingBills)
          .set({ status: "approved", journalId: null })
          .where(eq(accountingBills.id, linked.id));
        await writeAudit(tx, {
          companyId: journal.companyId,
          actorId,
          action: "release_supplier_invoice",
          entityType: "bill",
          entityId: linked.id,
          detail: `Procurement journal ${journal.journalNumber} is being reversed. Supplier bill ${linked.billNumber} is approved again and is not an open payable.`,
        });
      }
    }

    const reversal = await postJournalTx(tx, {
      companyId: journal.companyId,
      entryDate:
        entryDate && isIsoDate(entryDate) ? entryDate : journal.entryDate,
      description: `Reversal of ${journal.journalNumber}`,
      sourceType: "reversal",
      sourceId: journal.id,
      status: "posted",
      reversalOfId: journal.id,
      actorId,
      operationId: journal.operationId,
      operationEntryId: journal.operationEntryId,
      organizationId: journal.organizationId,
      contactId: journal.contactId,
      lines: journal.lines.map((line) => ({
        accountId: line.accountId,
        organizationId: line.organizationId,
        contactId: line.contactId,
        vatCodeId: line.vatCodeId,
        description: line.description,
        debit: line.credit,
        credit: line.debit,
      })),
    });

    await tx
      .update(accountingJournals)
      .set({ reversedById: reversal.id })
      .where(eq(accountingJournals.id, journal.id));

    await writeAudit(tx, {
      companyId: journal.companyId,
      actorId,
      action: "reverse",
      entityType: "journal",
      entityId: journal.id,
      detail: reversal.journalNumber,
    });

    return reversal;
  });
}

export async function replaceDraft(
  journalId: string,
  input: PostJournalInput,
) {
  await ensureCompanyBooks(input.companyId);
  return db.transaction(async (tx) => {
    const journal = await tx.query.accountingJournals.findFirst({
      where: eq(accountingJournals.id, journalId),
    });
    if (!journal) throw new AccountingError("Journal not found");
    if (journal.status !== "draft") {
      throw new AccountingError("Posted journals cannot be edited");
    }
    if (journal.companyId !== input.companyId) {
      throw new AccountingError("This journal belongs to a different company");
    }

    const resolved = await resolveLines(tx, input);
    await tx
      .delete(accountingJournalLines)
      .where(eq(accountingJournalLines.journalId, journalId));

    if (resolved.length > 0) {
      await tx.insert(accountingJournalLines).values(
        resolved.map((row, index) => ({
          id: crypto.randomUUID(),
          journalId,
          accountId: row.account.id,
          organizationId: row.line.organizationId ?? null,
          contactId: row.line.contactId ?? null,
          vatCodeId: row.line.vatCodeId ?? null,
          description: row.line.description?.trim() ?? "",
          debit: filsToAmount(row.side.debit),
          credit: filsToAmount(row.side.credit),
          sortOrder: index,
        })),
      );
    }

    await tx
      .update(accountingJournals)
      .set({
        entryDate: input.entryDate,
        description: input.description.trim(),
        organizationId: input.organizationId ?? null,
        contactId: input.contactId ?? null,
        operationId: input.operationId ?? null,
      })
      .where(eq(accountingJournals.id, journalId));

    await writeAudit(tx, {
      companyId: journal.companyId,
      actorId: input.actorId,
      action: "edit_draft",
      entityType: "journal",
      entityId: journalId,
      detail: journal.journalNumber,
    });

    return journal;
  });
}

export async function deleteDraft(journalId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const journal = await tx.query.accountingJournals.findFirst({
      where: eq(accountingJournals.id, journalId),
    });
    if (!journal) throw new AccountingError("Journal not found");
    if (journal.status !== "draft") {
      throw new AccountingError("Posted journals cannot be deleted");
    }
    await tx
      .delete(accountingJournals)
      .where(eq(accountingJournals.id, journalId));
    await writeAudit(tx, {
      companyId: journal.companyId,
      actorId,
      action: "delete_draft",
      entityType: "journal",
      entityId: journalId,
      detail: journal.journalNumber,
    });
  });
}

export async function postDraft(journalId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const journal = await tx.query.accountingJournals.findFirst({
      where: eq(accountingJournals.id, journalId),
      with: { lines: true },
    });
    if (!journal) throw new AccountingError("Journal not found");
    if (journal.status !== "draft") {
      throw new AccountingError("This journal is already posted");
    }

    await assertPeriodOpen(tx, journal.companyId, journal.entryDate);
    assertBalanced(
      journal.lines.map((line) => lineSide(line.debit, line.credit)),
    );

    const now = new Date();
    await tx
      .update(accountingJournals)
      .set({ status: "posted", postedAt: now, postedById: actorId })
      .where(eq(accountingJournals.id, journalId));

    await writeAudit(tx, {
      companyId: journal.companyId,
      actorId,
      action: "post",
      entityType: "journal",
      entityId: journalId,
      detail: journal.journalNumber,
    });
  });
}

export async function recordPayment(input: {
  companyId: string;
  direction: PaymentDirection;
  amount: string;
  paidOn: string;
  method: PaymentMethod;
  bankAccountId?: string | null;
  reference?: string;
  actorId: string;
  operationEntryId?: string | null;
  organizationId?: string | null;
  contactId?: string | null;
  idempotencyKey?: string | null;
}) {
  await ensureCompanyBooks(input.companyId);
  return db.transaction(async (tx) => {
    const amount = toFils(input.amount);
    if (amount <= 0n) {
      throw new AccountingError("Enter an amount greater than zero");
    }
    const paymentId = input.idempotencyKey?.trim() || crypto.randomUUID();
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`acct:${input.companyId}`}))`);
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`paykey:${input.companyId}:${paymentId}`}))`,
    );
    if (input.operationEntryId) {
      await tx.execute(
        sql`SELECT pg_advisory_xact_lock(hashtext(${`paydoc:${input.operationEntryId}`}))`,
      );
    }
    const existingPayment = await tx.query.accountingPayments.findFirst({
      where: eq(accountingPayments.id, paymentId),
    });
    if (existingPayment) {
      const journal = existingPayment.journalId
        ? await tx.query.accountingJournals.findFirst({
            where: eq(accountingJournals.id, existingPayment.journalId),
          })
        : null;
      const retry = paymentRetryDecision({
        existing: {
          companyId: existingPayment.companyId,
          direction: existingPayment.direction,
          documentId: existingPayment.billId ?? existingPayment.operationEntryId,
          amount: toFils(existingPayment.amount),
          journalOpen: Boolean(journal && journal.status === "posted" && !journal.reversedById),
        },
        request: {
          companyId: input.companyId,
          direction: input.direction,
          documentId: input.operationEntryId ?? null,
          amount,
        },
      });
      if (retry.action === "refuse") throw new AccountingError(retry.message);
      if (!journal) throw new AccountingError("The earlier payment has no journal");
      return { paymentId: existingPayment.id, journal };
    }

    let organizationId = input.organizationId ?? null;
    let contactId = input.contactId ?? null;
    let operationId: string | null = null;
    let description =
      input.direction === "receipt" ? "Customer receipt" : "Supplier payment";

    if (input.operationEntryId) {
      const entry = await tx.query.operationEntries.findFirst({
        where: eq(operationEntries.id, input.operationEntryId),
        with: { operation: true },
      });
      if (!entry?.operation) throw new AccountingError("Document not found");
      if (entry.operation.divisionId !== input.companyId) {
        throw new AccountingError("That document belongs to a different company");
      }
      const expected = input.direction === "receipt" ? "invoice" : "procurement";
      if (entry.entryType !== expected) {
        throw new AccountingError(
          input.direction === "receipt"
            ? "Receipts are applied to customer invoices"
            : "Supplier payments are applied to purchase bills",
        );
      }

      if (input.direction === "payment" && entry.entryType === "procurement") {
        const linkedBill = await tx.query.accountingBills.findFirst({
          where: and(
            eq(accountingBills.companyId, input.companyId),
            eq(accountingBills.procurementEntryId, entry.id),
            ne(accountingBills.status, "reversed"),
          ),
        });
        if (linkedBill && ["posted", "partial", "paid"].includes(linkedBill.status)) {
          throw new AccountingError(
            `Settle this payable on supplier bill ${linkedBill.billNumber}. A second payment was not posted.`,
          );
        }
      }

      const subtype = input.direction === "receipt" ? "receivable" : "payable";
      const outstanding = await entryControlBalance(tx, entry.id, subtype);
      const gate = settlementDecision({
        idempotencyKey: paymentId,
        existingPaymentForKey: false,
        keyBelongsToThisSettlement: true,
        outstanding,
        amount,
      });
      if (gate.action === "refuse") {
        if (outstanding > 0n && amount > outstanding) {
          throw new AccountingError(
            `Amount is above the outstanding balance of ${filsToAmount(outstanding)}`,
          );
        }
        throw new AccountingError(
          outstanding <= 0n
            ? "This document has no outstanding ledger balance"
            : gate.message,
        );
      }

      organizationId =
        input.direction === "receipt"
          ? entry.operation.organizationId
          : entry.vendorOrganizationId;
      contactId =
        input.direction === "receipt"
          ? entry.operation.contactId
          : entry.vendorContactId;
      operationId = entry.operation.id;
      description = `${input.direction === "receipt" ? "Receipt" : "Payment"} ${entry.operation.operationCode}`;
    } else if (!organizationId && !contactId) {
      throw new AccountingError("Choose a customer or supplier");
    }

    const cashAccount = await resolveCashAccount(
      tx,
      input.companyId,
      input.method,
      input.bankAccountId,
    );
    const control = await accountByCode(
      tx,
      input.companyId,
      input.direction === "receipt" ? "1100" : "2000",
    );
    const amountText = filsToAmount(amount);
    const reference = input.reference?.trim() ?? "";
    const party = { organizationId, contactId };

    const journal = await postJournalTx(tx, {
      companyId: input.companyId,
      entryDate: input.paidOn,
      description: reference ? `${description} · ${reference}` : description,
      sourceType: input.direction,
      sourceId: paymentId,
      status: "posted",
      actorId: input.actorId,
      operationId,
      operationEntryId: input.operationEntryId ?? null,
      organizationId,
      contactId,
      lines:
        input.direction === "receipt"
          ? [
              {
                accountId: cashAccount.id,
                debit: amountText,
                credit: "0",
                description,
                ...party,
              },
              {
                accountId: control.id,
                debit: "0",
                credit: amountText,
                description,
                ...party,
              },
            ]
          : [
              {
                accountId: control.id,
                debit: amountText,
                credit: "0",
                description,
                ...party,
              },
              {
                accountId: cashAccount.id,
                debit: "0",
                credit: amountText,
                description,
                ...party,
              },
            ],
    });

    await tx.insert(accountingPayments).values({
      id: paymentId,
      companyId: input.companyId,
      direction: input.direction,
      organizationId,
      contactId,
      operationEntryId: input.operationEntryId ?? null,
      journalId: journal.id,
      amount: amountText,
      paidOn: input.paidOn,
      method: input.method,
      reference,
      createdById: input.actorId,
    });

    if (input.operationEntryId && input.direction === "receipt") {
      const remaining = await entryControlBalance(
        tx,
        input.operationEntryId,
        "receivable",
      );
      if (remaining <= 0n) {
        await tx
          .update(operationEntries)
          .set({ documentStage: "paid" })
          .where(
            and(
              eq(operationEntries.id, input.operationEntryId),
              inArray(operationEntries.documentStage, ["sent", "overdue"]),
            ),
          );
      }
    }

    await writeAudit(tx, {
      companyId: input.companyId,
      actorId: input.actorId,
      action: input.direction,
      entityType: "payment",
      entityId: paymentId,
      detail: amountText,
    });

    return { paymentId, journal };
  });
}

export async function recordExpense(input: {
  companyId: string;
  entryDate: string;
  amount: string;
  expenseAccountId: string;
  method: PaymentMethod | "credit";
  bankAccountId?: string | null;
  vatCodeId?: string | null;
  organizationId?: string | null;
  description: string;
  operationId?: string | null;
  operationEntryId?: string | null;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  return db.transaction(async (tx) => {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`acct:${input.companyId}`}))`);
    const gross = toFils(input.amount);
    if (gross <= 0n) {
      throw new AccountingError("Enter an amount greater than zero");
    }
    if (!input.description.trim()) {
      throw new AccountingError("Describe the expense");
    }

    if (input.operationId) {
      const operation = await tx.query.operations.findFirst({
        where: eq(operations.id, input.operationId),
        columns: { id: true, divisionId: true },
      });
      if (!operation || operation.divisionId !== input.companyId) {
        throw new AccountingError("That operation belongs to a different company");
      }
    }

    if (input.operationEntryId) {
      const existing = await openSourceJournal(tx, {
        companyId: input.companyId,
        sourceType: "operation_cost",
        sourceId: input.operationEntryId,
      });
      const expenseJournal = await tx.query.accountingJournals.findFirst({
        where: and(
          eq(accountingJournals.companyId, input.companyId),
          eq(accountingJournals.sourceType, "expense"),
          eq(accountingJournals.operationEntryId, input.operationEntryId),
          eq(accountingJournals.status, "posted"),
          isNull(accountingJournals.reversalOfId),
          isNull(accountingJournals.reversedById),
        ),
      });
      const decision = costRecognitionDecision({
        intent: "operation_cost",
        linkedEntryId: input.operationEntryId,
        openCostJournal: Boolean(existing),
        openExpenseJournal: Boolean(expenseJournal),
      });
      if (!decision.post) throw new AccountingError(decision.message);
    }

    let net = gross;
    let vat = 0n;
    let vatCodeId: string | null = null;
    if (input.vatCodeId) {
      const vatCode = await tx.query.accountingVatCodes.findFirst({
        where: and(
          eq(accountingVatCodes.id, input.vatCodeId),
          eq(accountingVatCodes.companyId, input.companyId),
          eq(accountingVatCodes.isActive, 1),
        ),
      });
      if (!vatCode) throw new AccountingError("Choose a VAT code for this company");
      vatCodeId = vatCode.id;
      if (vatCode.treatment === "standard" || vatCode.treatment === "non_recoverable") {
        const split = splitInclusiveVat(gross, vatCode.rate);
        net = split.net;
        vat = split.vat;
      } else if (vatCode.treatment === "reverse_charge" || vatCode.treatment === "import") {
        vat = vatOnNet(gross, vatCode.rate);
      }
    }

    const expense = await tx.query.accountingAccounts.findFirst({
      where: and(
        eq(accountingAccounts.id, input.expenseAccountId),
        eq(accountingAccounts.companyId, input.companyId),
        eq(accountingAccounts.accountType, "expense"),
        eq(accountingAccounts.isActive, 1),
      ),
    });
    if (!expense) throw new AccountingError("Choose an expense account");

    const treatment = vatCodeId
      ? (
          await tx.query.accountingVatCodes.findFirst({
            where: eq(accountingVatCodes.id, vatCodeId),
          })
        )?.treatment
      : undefined;
    const selfAssessed = treatment === "reverse_charge" || treatment === "import";
    const recoverable = treatment === "standard" || selfAssessed;
    const creditAccount =
      input.method === "credit"
        ? await accountByCode(tx, input.companyId, "2000")
        : input.method === "card"
          ? await accountByCode(tx, input.companyId, "2350")
          : await resolveCashAccount(
              tx,
              input.companyId,
              input.method,
              input.bankAccountId,
            );

    const lines: JournalLineInput[] = [
      {
        accountId: expense.id,
        debit: filsToAmount(recoverable ? net : gross),
        credit: "0",
        description: input.description,
        organizationId: input.organizationId ?? null,
        vatCodeId,
      },
    ];
    if (vat > 0n && recoverable) {
      const inputVat = await accountByCode(tx, input.companyId, "1150");
      lines.push({
        accountId: inputVat.id,
        debit: filsToAmount(vat),
        credit: "0",
        description: "Input VAT",
        organizationId: input.organizationId ?? null,
        vatCodeId,
      });
    }
    if (vat > 0n && selfAssessed) {
      const outputVat = await accountByCode(tx, input.companyId, "2100");
      lines.push({
        accountId: outputVat.id,
        debit: "0",
        credit: filsToAmount(vat),
        description: treatment === "import" ? "Import VAT" : "Reverse charge VAT",
        organizationId: input.organizationId ?? null,
        vatCodeId,
      });
    }
    lines.push({
      accountId: creditAccount.id,
      debit: "0",
      credit: filsToAmount(gross),
      description: input.description,
      organizationId: input.organizationId ?? null,
    });

    return postJournalTx(tx, {
      companyId: input.companyId,
      entryDate: input.entryDate,
      description: input.description.trim(),
      sourceType: input.operationEntryId ? "operation_cost" : "expense",
      sourceId: input.operationEntryId ?? crypto.randomUUID(),
      status: "posted",
      actorId: input.actorId,
      operationId: input.operationId ?? null,
      operationEntryId: input.operationEntryId ?? null,
      organizationId: input.organizationId ?? null,
      lines,
    });
  });
}

export async function recordTransfer(input: {
  companyId: string;
  entryDate: string;
  amount: string;
  fromBankAccountId: string;
  toBankAccountId: string;
  description?: string;
  actorId: string;
}) {
  if (input.fromBankAccountId === input.toBankAccountId) {
    throw new AccountingError("Choose two different accounts");
  }
  await ensureCompanyBooks(input.companyId);
  return db.transaction(async (tx) => {
    const amount = toFils(input.amount);
    if (amount <= 0n) {
      throw new AccountingError("Enter an amount greater than zero");
    }
    const from = await loadBankAccount(tx, input.companyId, input.fromBankAccountId);
    const to = await loadBankAccount(tx, input.companyId, input.toBankAccountId);
    const amountText = filsToAmount(amount);
    return postJournalTx(tx, {
      companyId: input.companyId,
      entryDate: input.entryDate,
      description:
        input.description?.trim() || `Transfer from ${from.name} to ${to.name}`,
      sourceType: "bank_transfer",
      sourceId: crypto.randomUUID(),
      status: "posted",
      actorId: input.actorId,
      lines: [
        {
          accountId: to.accountId,
          debit: amountText,
          credit: "0",
          description: `From ${from.name}`,
        },
        {
          accountId: from.accountId,
          debit: "0",
          credit: amountText,
          description: `To ${to.name}`,
        },
      ],
    });
  });
}

export async function postOpeningBalance(input: {
  companyId: string;
  accountId: string;
  entryDate: string;
  debit: string;
  credit: string;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  return db.transaction(async (tx) => {
    const account = await tx.query.accountingAccounts.findFirst({
      where: and(
        eq(accountingAccounts.id, input.accountId),
        eq(accountingAccounts.companyId, input.companyId),
      ),
    });
    if (!account) throw new AccountingError("Account not found");
    if (account.code === "3990") {
      throw new AccountingError(
        "Opening balance equity is the offset account. Choose the account being opened.",
      );
    }
    const existing = await openSourceJournal(tx, {
      companyId: input.companyId,
      sourceType: "opening",
      sourceId: account.id,
    });
    if (existing) {
      throw new AccountingError(
        "An opening balance is already posted for this account. Reverse it before posting another.",
      );
    }
    const side = lineSide(input.debit || "0", input.credit || "0");
    const offset = await accountByCode(tx, input.companyId, "3990");
    return postJournalTx(tx, {
      companyId: input.companyId,
      entryDate: input.entryDate,
      description: `Opening balance ${account.code} ${account.name}`,
      sourceType: "opening",
      sourceId: account.id,
      status: "posted",
      actorId: input.actorId,
      lines: [
        {
          accountId: account.id,
          debit: filsToAmount(side.debit),
          credit: filsToAmount(side.credit),
          description: "Opening balance",
        },
        {
          accountId: offset.id,
          debit: filsToAmount(side.credit),
          credit: filsToAmount(side.debit),
          description: "Opening balance offset",
        },
      ],
    });
  });
}

export async function createAccount(input: {
  companyId: string;
  code: string;
  name: string;
  accountType: (typeof defaultChart)[number]["accountType"];
  normalBalance: (typeof defaultChart)[number]["normalBalance"];
  parentId?: string | null;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  const code = input.code.trim();
  const name = input.name.trim();
  if (!/^\d{3,8}$/.test(code)) {
    throw new AccountingError("Use a numeric account code");
  }
  if (!name) throw new AccountingError("Account name is required");

  if (input.parentId) {
    const parent = await db.query.accountingAccounts.findFirst({
      where: and(
        eq(accountingAccounts.id, input.parentId),
        eq(accountingAccounts.companyId, input.companyId),
      ),
    });
    if (!parent) throw new AccountingError("Parent account not found");
    if (parent.accountType !== input.accountType) {
      throw new AccountingError("A subaccount uses the same category as its parent");
    }
  }

  const id = crypto.randomUUID();
  try {
    await db.insert(accountingAccounts).values({
      id,
      companyId: input.companyId,
      code,
      name,
      accountType: input.accountType,
      subtype: null,
      parentId: input.parentId ?? null,
      normalBalance: input.normalBalance,
      isActive: 1,
      isSystem: 0,
      currency: "BHD",
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AccountingError("That account code is already used in this company");
    }
    throw error;
  }

  await db.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    actorId: input.actorId,
    action: "create_account",
    entityType: "account",
    entityId: id,
    detail: `${code} ${name}`,
  });

  return id;
}

export async function createBankAccount(input: {
  companyId: string;
  name: string;
  institution: string;
  accountNumber: string;
  actorId: string;
}) {
  const name = input.name.trim();
  if (!name) throw new AccountingError("Bank account name is required");
  await ensureCompanyBooks(input.companyId);

  return db.transaction(async (tx) => {
    const parent = await accountByCode(tx, input.companyId, "1010");
    const accounts = await tx.query.accountingAccounts.findMany({
      where: eq(accountingAccounts.companyId, input.companyId),
      columns: { code: true },
    });
    const codes = new Set(accounts.map((account) => account.code));
    let codeNumber = 1011;
    while (codes.has(String(codeNumber))) codeNumber += 1;

    const accountId = crypto.randomUUID();
    await tx.insert(accountingAccounts).values({
      id: accountId,
      companyId: input.companyId,
      code: String(codeNumber),
      name,
      accountType: "asset",
      subtype: "bank",
      parentId: parent.id,
      normalBalance: "debit",
      isActive: 1,
      isSystem: 0,
      currency: "BHD",
    });

    const id = crypto.randomUUID();
    await tx.insert(accountingBankAccounts).values({
      id,
      companyId: input.companyId,
      accountId,
      name,
      institution: input.institution.trim(),
      accountNumber: input.accountNumber.trim(),
      currency: "BHD",
      kind: "bank",
      isActive: 1,
    });

    await writeAudit(tx, {
      companyId: input.companyId,
      actorId: input.actorId,
      action: "create_bank",
      entityType: "bank_account",
      entityId: id,
      detail: name,
    });

    return id;
  });
}

export async function createVatCode(input: {
  companyId: string;
  code: string;
  name: string;
  rate: string;
  treatment: VatTreatment;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  const code = input.code.trim().toUpperCase();
  const name = input.name.trim();
  if (!code || !name) throw new AccountingError("Code and name are required");
  const rate = toFils(input.rate);
  if (rate < 0n) throw new AccountingError("VAT rate cannot be negative");
  const zeroRate = input.treatment === "zero" || input.treatment === "exempt" || input.treatment === "out_of_scope";
  if (zeroRate && rate !== 0n) {
    throw new AccountingError("Zero-rated, exempt, and out-of-scope codes use a zero rate");
  }

  const id = crypto.randomUUID();
  try {
    await db.insert(accountingVatCodes).values({
      id,
      companyId: input.companyId,
      code,
      name,
      rate: filsToAmount(rate),
      treatment: input.treatment,
      isActive: 1,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AccountingError("That VAT code already exists for this company");
    }
    throw error;
  }

  await db.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    actorId: input.actorId,
    action: "create_vat_code",
    entityType: "vat_code",
    entityId: id,
    detail: code,
  });
}

export async function setPeriodStatus(
  periodId: string,
  status: "open" | "closed",
  actorId: string,
) {
  const period = await db.query.accountingPeriods.findFirst({
    where: eq(accountingPeriods.id, periodId),
  });
  if (!period) throw new AccountingError("Fiscal period not found");

  await db
    .update(accountingPeriods)
    .set({
      status,
      closedAt: status === "closed" ? new Date() : null,
      closedById: status === "closed" ? actorId : null,
    })
    .where(eq(accountingPeriods.id, periodId));

  await db.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: period.companyId,
    actorId,
    action: status === "closed" ? "close_period" : "reopen_period",
    entityType: "period",
    entityId: periodId,
    detail: period.name,
  });
}

export async function postDocumentToLedger(input: {
  companyId: string;
  entryId: string;
  operationId: string;
  entryDate: string;
  amount: string;
  description: string;
  sourceType: "invoice" | "procurement";
  debitCode: string;
  creditCode: string;
  organizationId: string | null;
  contactId: string | null;
  actorId: string;
  guard?: (tx: AccountingTx) => Promise<void>;
}) {
  await ensureCompanyBooks(input.companyId);
  const amount = toFils(input.amount);
  if (amount <= 0n) {
    throw new AccountingError(
      "Add a document total before it can be posted to the ledger",
    );
  }
  if (!input.organizationId && !input.contactId) {
    throw new AccountingError(
      "Link a company or contact before posting this document",
    );
  }

  return db.transaction(async (tx) => {
    await tx.execute(
      sql`SELECT pg_advisory_xact_lock(hashtext(${`acct:${input.companyId}`}))`,
    );
    const existing = await openSourceJournal(tx, {
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.entryId,
    });
    if (existing) return existing;
    if (input.guard) await input.guard(tx);

    const debit = await accountByCode(tx, input.companyId, input.debitCode);
    const credit = await accountByCode(tx, input.companyId, input.creditCode);
    const amountText = filsToAmount(amount);
    const party = {
      organizationId: input.organizationId,
      contactId: input.contactId,
    };

    return postJournalTx(tx, {
      companyId: input.companyId,
      entryDate: input.entryDate,
      description: input.description,
      sourceType: input.sourceType,
      sourceId: input.entryId,
      status: "posted",
      actorId: input.actorId,
      operationId: input.operationId,
      operationEntryId: input.entryId,
      organizationId: input.organizationId,
      contactId: input.contactId,
      lines: [
        {
          accountId: debit.id,
          debit: amountText,
          credit: "0",
          description: input.description,
          ...party,
        },
        {
          accountId: credit.id,
          debit: "0",
          credit: amountText,
          description: input.description,
          ...party,
        },
      ],
    });
  });
}

export async function reverseDocumentJournal(input: {
  companyId: string;
  sourceType: "invoice" | "procurement";
  entryId: string;
  actorId: string;
}) {
  const journal = await db.query.accountingJournals.findFirst({
    where: and(
      eq(accountingJournals.companyId, input.companyId),
      eq(accountingJournals.sourceType, input.sourceType),
      eq(accountingJournals.sourceId, input.entryId),
      eq(accountingJournals.status, "posted"),
      isNull(accountingJournals.reversalOfId),
      isNull(accountingJournals.reversedById),
    ),
  });
  if (!journal) return null;
  return reverseJournal(journal.id, input.actorId);
}

async function postJournalTx(tx: AccountingTx, input: PostJournalInput) {
  if (!getDivisionById(input.companyId)) {
    throw new AccountingError("Choose a Zoom company");
  }
  if (!input.description.trim()) {
    throw new AccountingError("Description is required");
  }

  await tx.execute(
    sql`SELECT pg_advisory_xact_lock(hashtext(${`acct:${input.companyId}`}))`,
  );

  if (input.status === "posted") {
    await assertPeriodOpen(tx, input.companyId, input.entryDate);
    if (input.lines.some((line) => line.vatCodeId)) {
      const locked = await tx.query.accountingVatReturns.findFirst({
        where: and(
          eq(accountingVatReturns.companyId, input.companyId),
          eq(accountingVatReturns.status, "locked"),
          lte(accountingVatReturns.periodStart, input.entryDate),
          gte(accountingVatReturns.periodEnd, input.entryDate),
        ),
      });
      if (locked) {
        throw new AccountingError("This date is inside a locked VAT period.");
      }
    }
  } else if (!isIsoDate(input.entryDate)) {
    throw new AccountingError("Choose a valid date");
  }

  if (input.sourceId && input.status === "posted" && !input.reversalOfId) {
    const existing = await openSourceJournal(tx, {
      companyId: input.companyId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    });
    if (existing) return existing;
  }

  const resolved = await resolveLines(tx, input);
  if (input.status === "posted") {
    assertBalanced(resolved.map((row) => row.side));
  }

  const journalId = crypto.randomUUID();
  const journalNumber = await nextJournalNumber(tx, input.companyId);
  const now = new Date();
  const currency = await companyCurrency(tx, input.companyId);

  await tx.execute(sql`SAVEPOINT journal_source`);
  try {
    await tx.insert(accountingJournals).values({
      id: journalId,
      companyId: input.companyId,
      journalNumber,
      entryDate: input.entryDate,
      description: input.description.trim(),
      sourceType: input.sourceType,
      sourceId: input.sourceId ?? null,
      status: input.status,
      reversalOfId: input.reversalOfId ?? null,
      operationId: input.operationId ?? null,
      operationEntryId: input.operationEntryId ?? null,
      billId: input.billId ?? null,
      organizationId: input.organizationId ?? null,
      contactId: input.contactId ?? null,
      currency,
      postedAt: input.status === "posted" ? now : null,
      postedById: input.status === "posted" ? input.actorId : null,
      createdById: input.actorId,
    });
  } catch (error) {
    await tx.execute(sql`ROLLBACK TO SAVEPOINT journal_source`);
    if (isUniqueViolation(error) && input.sourceId) {
      const existing = await openSourceJournal(tx, {
        companyId: input.companyId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,
      });
      if (existing) return existing;
    }
    const constraint = constraintName(error);
    if (constraint === "accounting_journals_purchase_entry_once") {
      throw new AccountingError(
        "This purchase is already recognised on that procurement or supplier bill. A second journal was not posted.",
      );
    }
    if (constraint === "accounting_journals_cost_entry_once") {
      throw new AccountingError(
        "This cost note is already recognised. A second expense journal was not posted.",
      );
    }
    throw error;
  }
  await tx.execute(sql`RELEASE SAVEPOINT journal_source`);

  if (resolved.length > 0) {
    await tx.insert(accountingJournalLines).values(
      resolved.map((row, index) => ({
        id: crypto.randomUUID(),
        journalId,
        accountId: row.account.id,
        organizationId: row.line.organizationId ?? null,
        contactId: row.line.contactId ?? null,
        vatCodeId: row.line.vatCodeId ?? null,
        description: row.line.description?.trim() ?? "",
        debit: filsToAmount(row.side.debit),
        credit: filsToAmount(row.side.credit),
        sortOrder: index,
      })),
    );
  }

  await writeAudit(tx, {
    companyId: input.companyId,
    actorId: input.actorId,
    action: input.status === "posted" ? "post" : "draft",
    entityType: "journal",
    entityId: journalId,
    detail: `${journalNumber} ${input.sourceType}`,
  });

  const created = await tx.query.accountingJournals.findFirst({
    where: eq(accountingJournals.id, journalId),
  });
  if (!created) throw new AccountingError("Journal could not be saved");
  return created;
}

async function resolveLines(tx: AccountingTx, input: PostJournalInput) {
  const lines = input.lines.filter((line) => {
    const hasAmount = Boolean(line.debit?.trim() || line.credit?.trim());
    const hasAccount = Boolean(line.accountId || line.accountCode);
    return hasAmount || hasAccount;
  });

  const resolved = [];
  for (const line of lines) {
    const side = lineSide(line.debit || "0", line.credit || "0");
    const account = line.accountId
      ? await tx.query.accountingAccounts.findFirst({
          where: and(
            eq(accountingAccounts.id, line.accountId),
            eq(accountingAccounts.companyId, input.companyId),
          ),
        })
      : await accountByCode(tx, input.companyId, line.accountCode ?? "");
    if (!account || account.isActive !== 1) {
      throw new AccountingError("Choose an active account in this company");
    }
    resolved.push({ line, side, account });
  }
  return resolved;
}

async function openSourceJournal(
  tx: AccountingTx,
  input: { companyId: string; sourceType: string; sourceId: string },
) {
  return tx.query.accountingJournals.findFirst({
    where: and(
      eq(accountingJournals.companyId, input.companyId),
      eq(accountingJournals.sourceType, input.sourceType),
      eq(accountingJournals.sourceId, input.sourceId),
      eq(accountingJournals.status, "posted"),
      isNull(accountingJournals.reversalOfId),
      isNull(accountingJournals.reversedById),
    ),
  });
}

async function accountByCode(
  tx: AccountingTx,
  companyId: string,
  code: string,
) {
  const account = await tx.query.accountingAccounts.findFirst({
    where: and(
      eq(accountingAccounts.companyId, companyId),
      eq(accountingAccounts.code, code),
      eq(accountingAccounts.isActive, 1),
    ),
  });
  if (!account) {
    throw new AccountingError(`Account ${code} is not available for this company`);
  }
  return account;
}

async function resolveCashAccount(
  tx: AccountingTx,
  companyId: string,
  method: PaymentMethod,
  bankAccountId?: string | null,
) {
  if (bankAccountId) {
    const bank = await loadBankAccount(tx, companyId, bankAccountId);
    const account = await tx.query.accountingAccounts.findFirst({
      where: eq(accountingAccounts.id, bank.accountId),
    });
    if (!account) throw new AccountingError("Bank account is not linked to the ledger");
    return account;
  }
  return accountByCode(tx, companyId, method === "cash" ? "1000" : "1010");
}

async function loadBankAccount(
  tx: AccountingTx,
  companyId: string,
  bankAccountId: string,
) {
  const bank = await tx.query.accountingBankAccounts.findFirst({
    where: and(
      eq(accountingBankAccounts.id, bankAccountId),
      eq(accountingBankAccounts.companyId, companyId),
      eq(accountingBankAccounts.isActive, 1),
    ),
  });
  if (!bank) throw new AccountingError("Choose a cash or bank account for this company");
  return bank;
}

async function entryControlBalance(
  tx: AccountingTx,
  entryId: string,
  subtype: "receivable" | "payable",
) {
  const rows = await tx.execute<{ net: string }>(sql`
    SELECT COALESCE(SUM(l.debit - l.credit), 0)::text AS net
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.operation_entry_id = ${entryId}
      AND j.status = 'posted'
      AND a.subtype = ${subtype}
  `);
  const net = toFils(firstRow<{ net?: string }>(rows).net ?? "0");
  return subtype === "receivable" ? net : -net;
}

async function assertPeriodOpen(
  tx: AccountingTx,
  companyId: string,
  entryDate: string,
) {
  if (!isIsoDate(entryDate)) throw new AccountingError("Choose a valid date");
  const periods = await tx.query.accountingPeriods.findMany({
    where: eq(accountingPeriods.companyId, companyId),
  });
  const matches = periods.filter(
    (period) => period.startsOn <= entryDate && period.endsOn >= entryDate,
  );
  if (matches.length > 1) {
    throw new AccountingError("More than one fiscal period covers this date");
  }
  if (matches.length === 1) {
    if (matches[0].status === "closed") {
      throw new AccountingError("This fiscal period is closed");
    }
    return;
  }

  const year = entryDate.slice(0, 4);
  try {
    await tx.insert(accountingPeriods).values({
      id: crypto.randomUUID(),
      companyId,
      name: `FY ${year}`,
      startsOn: `${year}-01-01`,
      endsOn: `${year}-12-31`,
      status: "open",
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }
}

async function nextJournalNumber(tx: AccountingTx, companyId: string) {
  const rows = await tx.execute<{ last: number }>(sql`
    SELECT COALESCE(MAX(CAST(SUBSTRING(journal_number FROM 5) AS INTEGER)), 0)::int AS last
    FROM accounting_journals
    WHERE company_id = ${companyId}
      AND journal_number ~ '^JNL-[0-9]+$'
  `);
  const last = Number(firstRow<{ last?: number }>(rows).last ?? 0);
  return `JNL-${String(last + 1).padStart(5, "0")}`;
}

async function companyCurrency(tx: AccountingTx, companyId: string) {
  const settings = await tx.query.accountingSettings.findFirst({
    where: eq(accountingSettings.companyId, companyId),
  });
  return settings?.currency || "BHD";
}

async function writeAudit(
  tx: AccountingTx,
  input: {
    companyId: string;
    actorId: string;
    action: string;
    entityType: string;
    entityId: string;
    detail: string;
  },
) {
  await tx.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    actorId: input.actorId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    detail: input.detail,
  });
}

function firstRow<T>(rows: unknown): T {
  if (Array.isArray(rows)) return (rows[0] ?? {}) as T;
  if (rows && typeof rows === "object" && "rows" in rows) {
    const list = (rows as { rows: T[] }).rows;
    return (list[0] ?? {}) as T;
  }
  return {} as T;
}

function constraintName(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("constraint" in current && typeof (current as { constraint: unknown }).constraint === "string") {
      return (current as { constraint: string }).constraint;
    }
    current = "cause" in current ? (current as { cause: unknown }).cause : null;
  }
  return "";
}

function isUniqueViolation(error: unknown) {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && (current as { code: unknown }).code === "23505") {
      return true;
    }
    const message = current instanceof Error ? current.message : "";
    if (message.toLowerCase().includes("duplicate key")) return true;
    current = "cause" in current ? (current as { cause: unknown }).cause : null;
  }
  return false;
}
