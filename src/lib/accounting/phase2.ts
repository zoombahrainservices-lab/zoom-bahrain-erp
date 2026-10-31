import { and, desc, eq, sql } from "drizzle-orm";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { db } from "@/db";
import {
  accountingAccounts,
  accountingAttachments,
  accountingAudit,
  accountingBankAccounts,
  accountingBillLines,
  accountingBills,
  accountingExchangeRates,
  accountingExpenses,
  accountingJournalLines,
  accountingJournals,
  accountingPayments,
  accountingReconciliationMatches,
  accountingReconciliations,
  accountingSettings,
  accountingStatementLines,
  accountingStatements,
  accountingVatCodes,
  accountingVatReturns,
  operationEntries,
  operations,
  organizations,
  type PaymentMethod,
} from "@/db/schema";

import { nbrVatReturn, type TreatmentMovement } from "./nbr-return";
import {
  convertToBhd,
  parseStatementCsv,
  priceBillLine,
  statementFingerprint,
  sumPriced,
  vatDueDate,
  vatOnNet,
  type PricedLine,
  type VatRule,
} from "./documents";
import { parseXlsxSheet } from "./xlsx";
import {
  ensureCompanyBooks,
  postJournalWithin,
  reverseJournal,
  type AccountingTx,
  type JournalLineInput,
} from "./engine";
import { assertBillMayLinkProcurement, enforceApproval, recordException } from "./phase3";
import { AccountingError, filsToAmount, splitInclusiveVat, toFils } from "./money";
import {
  bankMovementDecision,
  costRecognitionDecision,
  linkedPurchaseDecision,
  RecognitionOverlapError,
  settlementDecision,
  paymentRetryDecision,
} from "./overlap";
import { columnExists } from "./schema-ready";

type BillLineInput = {
  description: string;
  quantity: string;
  unitAmount: string;
  discount: string;
  expenseAccountId: string;
  vatCodeId?: string | null;
};

const openBill = ["posted", "partial"] as const;

export async function saveBill(input: {
  billId?: string | null;
  companyId: string;
  supplierOrganizationId: string;
  billDate: string;
  dueDate: string;
  currency: string;
  exchangeRate: string;
  reference: string;
  notes: string;
  operationId?: string | null;
  procurementEntryId?: string | null;
  lines: BillLineInput[];
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  return db.transaction(async (tx) => {
    await lockCompany(tx, input.companyId);
    await assertSupplier(tx, input.supplierOrganizationId);
    await assertOperation(tx, input.companyId, input.operationId);
    await assertBillMayLinkProcurement({
      companyId: input.companyId,
      procurementEntryId: input.procurementEntryId,
    });
    const priced = await priceLines(tx, input.companyId, input.lines);
    const totals = sumPriced(priced);
    const rate = input.currency === "BHD" ? "1.000000" : input.exchangeRate;
    if (input.currency !== "BHD" && toFils(rate) <= 0n) {
      throw new AccountingError("Enter the exchange rate to BHD. No rate is assumed.");
    }
    const values = {
      supplierOrganizationId: input.supplierOrganizationId,
      billDate: input.billDate,
      dueDate: input.dueDate,
      currency: input.currency || "BHD",
      exchangeRate: rate,
      reference: input.reference.trim(),
      notes: input.notes.trim(),
      operationId: input.operationId || null,
      procurementEntryId: input.procurementEntryId || null,
      subtotal: filsToAmount(totals.net + totals.discount),
      discountTotal: filsToAmount(totals.discount),
      vatTotal: filsToAmount(totals.vat),
      total: filsToAmount(totals.supplierTotal),
    };

    let billId = input.billId ?? "";
    if (billId) {
      const current = await loadBill(tx, billId);
      if (current.companyId !== input.companyId) {
        throw new AccountingError("This bill belongs to another company");
      }
      if (current.status !== "draft") {
        throw new AccountingError("Only a draft bill can be edited");
      }
      await tx.update(accountingBills).set(values).where(eq(accountingBills.id, billId));
      await tx.delete(accountingBillLines).where(eq(accountingBillLines.billId, billId));
    } else {
      billId = crypto.randomUUID();
      await tx.insert(accountingBills).values({
        id: billId,
        companyId: input.companyId,
        billNumber: await nextNumber(tx, input.companyId, "BILL"),
        documentKind: "bill",
        status: "draft",
        createdById: input.actorId,
        ...values,
      });
    }
    await insertLines(tx, billId, priced);
    await audit(tx, input.companyId, input.actorId, "save_bill", "bill", billId, values.total);
    return billId;
  });
}

export async function approveBill(billId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const bill = await loadBill(tx, billId);
    if (bill.status !== "draft") throw new AccountingError("Only a draft bill can be approved");
    await tx
      .update(accountingBills)
      .set({ status: "approved", approvedById: actorId })
      .where(eq(accountingBills.id, billId));
    await audit(tx, bill.companyId, actorId, "approve_bill", "bill", billId, bill.billNumber);
  });
}

export async function postBill(billId: string, actorId: string) {
  try {
    return await db.transaction(async (tx) => {
    const bill = await loadBill(tx, billId);
    await lockCompany(tx, bill.companyId);
    if (bill.status !== "approved") {
      throw new AccountingError("Approve the bill before posting it. Draft bills stay off the ledger.");
    }
    if (bill.journalId) throw new AccountingError("This bill is already posted");
    const lines = await tx.query.accountingBillLines.findMany({
      where: eq(accountingBillLines.billId, billId),
      with: { vatCode: true },
    });
    if (lines.length === 0) throw new AccountingError("Add at least one line");
    if (bill.documentKind === "bill" && bill.procurementEntryId) {
      const procurementJournal = await tx.query.accountingJournals.findFirst({
        where: and(
          eq(accountingJournals.sourceType, "procurement"),
          eq(accountingJournals.sourceId, bill.procurementEntryId),
          eq(accountingJournals.status, "posted"),
          sql`${accountingJournals.reversalOfId} IS NULL`,
          sql`${accountingJournals.reversedById} IS NULL`,
        ),
        with: { lines: { with: { account: true } } },
      });
      const payableAmount = (procurementJournal?.lines ?? []).reduce((sum, line) => {
        if (line.account?.code !== "2000") return sum;
        return sum + toFils(line.credit) - toFils(line.debit);
      }, 0n);
      const decision = linkedPurchaseDecision({
        procurementEntryId: bill.procurementEntryId,
        journal: procurementJournal
          ? {
              id: procurementJournal.id,
              number: procurementJournal.journalNumber,
              companyId: procurementJournal.companyId,
              supplierOrganizationId: procurementJournal.organizationId,
              currency: procurementJournal.currency,
              payableAmount,
            }
          : null,
        billCompanyId: bill.companyId,
        billSupplierOrganizationId: bill.supplierOrganizationId,
        billCurrency: bill.currency,
        billTotal: toFils(bill.total),
      });
      if (decision.action === "hold") throw new AccountingError(decision.message);
      if (decision.action === "adopt") {
        await tx
          .update(accountingBills)
          .set({ status: "posted", journalId: decision.journalId })
          .where(eq(accountingBills.id, billId));
        await refreshBillStatus(tx, billId);
        await audit(tx, bill.companyId, actorId, "record_supplier_invoice", "bill", billId, decision.message);
        return { journalId: decision.journalId, note: decision.message };
      }
    }
    const journalLines = await billJournalLines(
      tx,
      bill.companyId,
      bill,
      lines,
      bill.documentKind === "credit_note",
    );
    const journal = await postJournalWithin(tx, {
      companyId: bill.companyId,
      entryDate: bill.billDate,
      description: `${bill.documentKind === "credit_note" ? "Supplier credit" : "Supplier bill"} ${bill.billNumber}`,
      sourceType: bill.documentKind === "credit_note" ? "supplier_credit" : "supplier_bill",
      sourceId: bill.id,
      status: "posted",
      actorId,
      operationId: bill.operationId,
      operationEntryId: bill.procurementEntryId,
      organizationId: bill.supplierOrganizationId,
      billId: bill.id,
      lines: journalLines,
    });
    await tx
      .update(accountingBills)
      .set({ status: "posted", journalId: journal.id })
      .where(eq(accountingBills.id, billId));
    if (bill.creditOfBillId) await refreshBillStatus(tx, bill.creditOfBillId);
    await audit(tx, bill.companyId, actorId, "post_bill", "bill", billId, journal.journalNumber);
    return {
      journalId: journal.id,
      note: bill.procurementEntryId
        ? `Supplier bill ${bill.billNumber} recognised this purchase. The linked procurement will not post a second payable.`
        : "",
    };
    });
  } catch (error) {
    if (error instanceof RecognitionOverlapError) {
      await recordException({
        companyId: error.companyId,
        kind: "duplicate_payable",
        sourceType: "supplier_bill",
        sourceId: error.sourceId,
        detail: error.message,
      });
    }
    throw error;
  }
}

export async function reverseBill(billId: string, actorId: string) {
  const bill = await db.query.accountingBills.findFirst({
    where: eq(accountingBills.id, billId),
  });
  if (!bill?.journalId) throw new AccountingError("This bill has no posted journal");
  const settled = (await paidAmount(db, billId)) + (await procurementSettlements(db, bill));
  if (settled > 0n) {
    throw new AccountingError("Reverse the supplier payments before reversing this bill");
  }
  const journal = await db.query.accountingJournals.findFirst({
    where: eq(accountingJournals.id, bill.journalId),
  });
  const adopted =
    journal?.sourceType === "procurement" &&
    journal.sourceId === bill.procurementEntryId &&
    !journal.reversedById;
  if (adopted) {
    await db.update(accountingBills).set({ status: "reversed" }).where(eq(accountingBills.id, billId));
    await db.insert(accountingAudit).values({
      id: crypto.randomUUID(),
      companyId: bill.companyId,
      actorId,
      action: "reverse_supplier_invoice",
      entityType: "bill",
      entityId: billId,
      detail: `The supplier invoice was reversed. Procurement journal ${journal.journalNumber} remains the payable.`,
    });
    return;
  }
  await reverseJournal(bill.journalId, actorId);
  await db.update(accountingBills).set({ status: "reversed" }).where(eq(accountingBills.id, billId));
  if (bill.creditOfBillId) {
    await db.transaction(async (tx) => refreshBillStatus(tx, bill.creditOfBillId!));
  }
}

export async function saveCreditNote(input: {
  billId: string;
  lines: BillLineInput[];
  billDate: string;
  notes: string;
  actorId: string;
}) {
  return db.transaction(async (tx) => {
    const bill = await loadBill(tx, input.billId);
    if (!openBill.includes(bill.status as (typeof openBill)[number]) && bill.status !== "paid") {
      throw new AccountingError("Credit a posted supplier bill");
    }
    await lockCompany(tx, bill.companyId);
    const priced = await priceLines(tx, bill.companyId, input.lines);
    const totals = sumPriced(priced);
    const outstanding = await outstandingOf(tx, bill.id);
    if (totals.supplierTotal <= 0n) throw new AccountingError("Enter a credit amount");
    if (totals.supplierTotal > outstanding) {
      throw new AccountingError("The credit note is larger than the outstanding bill");
    }
    const id = crypto.randomUUID();
    await tx.insert(accountingBills).values({
      id,
      companyId: bill.companyId,
      billNumber: await nextNumber(tx, bill.companyId, "SCN"),
      documentKind: "credit_note",
      supplierOrganizationId: bill.supplierOrganizationId,
      billDate: input.billDate,
      dueDate: input.billDate,
      status: "approved",
      currency: bill.currency,
      exchangeRate: bill.exchangeRate,
      reference: bill.billNumber,
      notes: input.notes.trim(),
      operationId: bill.operationId,
      creditOfBillId: bill.id,
      subtotal: filsToAmount(totals.net + totals.discount),
      discountTotal: filsToAmount(totals.discount),
      vatTotal: filsToAmount(totals.vat),
      total: filsToAmount(totals.supplierTotal),
      createdById: input.actorId,
      approvedById: input.actorId,
    });
    await insertLines(tx, id, priced);
    await audit(tx, bill.companyId, input.actorId, "credit_note", "bill", id, bill.billNumber);
    return id;
  });
}

export async function payBill(input: {
  billId: string;
  amount: string;
  paidOn: string;
  method: PaymentMethod;
  bankAccountId?: string | null;
  reference: string;
  idempotencyKey?: string | null;
  actorId: string;
}) {
  return db.transaction(async (tx) => {
    const bill = await loadBill(tx, input.billId);
    const paymentId = input.idempotencyKey?.trim() || crypto.randomUUID();
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`acct:${bill.companyId}`}))`);
    if (bill.procurementEntryId) {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`paydoc:${bill.procurementEntryId}`}))`);
    }
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`paydoc:bill:${bill.id}`}))`);
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`paykey:${bill.companyId}:${paymentId}`}))`);
    const existingPayment = await tx.query.accountingPayments.findFirst({
      where: eq(accountingPayments.id, paymentId),
    });
    if (existingPayment) {
      const existingJournal = existingPayment.journalId
        ? await tx.query.accountingJournals.findFirst({
            where: eq(accountingJournals.id, existingPayment.journalId),
          })
        : null;
      const retry = paymentRetryDecision({
        existing: {
          companyId: existingPayment.companyId,
          direction: existingPayment.direction,
          documentId: existingPayment.billId,
          amount: toFils(existingPayment.amount),
          journalOpen: Boolean(existingJournal && existingJournal.status === "posted" && !existingJournal.reversedById),
        },
        request: {
          companyId: bill.companyId,
          direction: "payment",
          documentId: bill.id,
          amount: toFils(input.amount),
        },
      });
      if (retry.action === "refuse") throw new AccountingError(retry.message);
      return existingPayment.id;
    }
    if (bill.documentKind === "credit_note") {
      throw new AccountingError("Apply a credit note to the bill. Do not pay the credit note.");
    }
    if (!openBill.includes(bill.status as (typeof openBill)[number])) {
      throw new AccountingError("Pay a posted bill that still has a balance");
    }
    const amount = toFils(input.amount);
    const outstanding = await outstandingOf(tx, bill.id);
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
          "This payment is larger than the outstanding balance. Supplier advances are not enabled.",
        );
      }
      throw new AccountingError(gate.message);
    }
    const payable = await accountByCode(tx, bill.companyId, "2000");
    const credit = await creditAccount(tx, bill.companyId, input.method, input.bankAccountId);
    const bhd = convertToBhd(amount, bill.exchangeRate);
    const journal = await postJournalWithin(tx, {
      companyId: bill.companyId,
      entryDate: input.paidOn,
      description: `Payment ${bill.billNumber}`,
      sourceType: "supplier_payment",
      sourceId: paymentId,
      status: "posted",
      actorId: input.actorId,
      organizationId: bill.supplierOrganizationId,
      billId: bill.id,
      operationId: bill.operationId,
      operationEntryId: bill.procurementEntryId,
      lines: [
        {
          accountId: payable.id,
          debit: filsToAmount(bhd),
          credit: "0",
          organizationId: bill.supplierOrganizationId,
          description: bill.billNumber,
        },
        {
          accountId: credit.id,
          debit: "0",
          credit: filsToAmount(bhd),
          description: input.reference || bill.billNumber,
        },
      ],
    });
    await tx.insert(accountingPayments).values({
      id: paymentId,
      companyId: bill.companyId,
      direction: "payment",
      organizationId: bill.supplierOrganizationId,
      billId: bill.id,
      journalId: journal.id,
      amount: filsToAmount(amount),
      paidOn: input.paidOn,
      method: input.method,
      reference: input.reference.trim(),
      createdById: input.actorId,
    });
    await refreshBillStatus(tx, bill.id);
    await audit(tx, bill.companyId, input.actorId, "pay_bill", "bill", bill.id, filsToAmount(amount));
    return paymentId;
  });
}

export async function saveExpense(input: {
  expenseId?: string | null;
  companyId: string;
  expenseDate: string;
  accountId: string;
  organizationId?: string | null;
  operationId?: string | null;
  operationEntryId?: string | null;
  description: string;
  reference: string;
  method: PaymentMethod;
  bankAccountId?: string | null;
  vatCodeId?: string | null;
  currency: string;
  exchangeRate: string;
  amount: string;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  return db.transaction(async (tx) => {
    await lockCompany(tx, input.companyId);
    await assertOperation(tx, input.companyId, input.operationId);
    const priced = await priceExpense(tx, input.companyId, input.amount, input.vatCodeId);
    const rate = input.currency === "BHD" ? "1.000000" : input.exchangeRate;
    if (input.currency !== "BHD" && toFils(rate) <= 0n) {
      throw new AccountingError("Enter the exchange rate to BHD. No rate is assumed.");
    }
    const values = {
      expenseDate: input.expenseDate,
      accountId: input.accountId,
      organizationId: input.organizationId || null,
      operationId: input.operationId || null,
      description: input.description.trim(),
      reference: input.reference.trim(),
      method: input.method,
      bankAccountId: input.bankAccountId || null,
      vatCodeId: input.vatCodeId || null,
      currency: input.currency || "BHD",
      exchangeRate: rate,
      netAmount: filsToAmount(priced.net),
      vatAmount: filsToAmount(priced.vat),
      totalAmount: filsToAmount(priced.total),
    };
    if (!values.description) throw new AccountingError("Describe the expense");
    if (input.operationEntryId) {
      const note = await tx.query.operationEntries.findFirst({
        where: eq(operationEntries.id, input.operationEntryId),
        with: { operation: { columns: { divisionId: true } } },
      });
      if (!note || note.entryType !== "cost" || note.operation?.divisionId !== input.companyId) {
        throw new AccountingError(
          "Choose a cost note on this company. Matching amounts are not linked, and the expense was not saved.",
        );
      }
      const ready = await columnExists(tx, "accounting_expenses", "operation_entry_id");
      if (!ready) {
        throw new AccountingError(
          "Linking an expense to a cost note needs the overlap migration, which has not been applied. The expense was not saved. Save it again without the cost note, or apply the migration first.",
        );
      }
    }
    const account = await tx.query.accountingAccounts.findFirst({
      where: and(
        eq(accountingAccounts.id, input.accountId),
        eq(accountingAccounts.companyId, input.companyId),
        eq(accountingAccounts.accountType, "expense"),
      ),
    });
    if (!account) throw new AccountingError("Choose an expense account from this company's chart");

    let expenseId = input.expenseId ?? "";
    if (expenseId) {
      const current = await loadExpense(tx, expenseId);
      if (current.status !== "draft") throw new AccountingError("Only a draft expense can be edited");
      await tx.update(accountingExpenses).set(values).where(eq(accountingExpenses.id, current.id));
    } else {
      expenseId = crypto.randomUUID();
      await tx.insert(accountingExpenses).values({
        id: expenseId,
        companyId: input.companyId,
        expenseNumber: await nextNumber(tx, input.companyId, "EXP"),
        status: "draft",
        createdById: input.actorId,
        ...values,
      });
      await audit(tx, input.companyId, input.actorId, "save_expense", "expense", expenseId, values.totalAmount);
    }
    if (input.operationEntryId) {
      await tx.execute(
        sql`UPDATE accounting_expenses SET operation_entry_id = ${input.operationEntryId} WHERE id = ${expenseId}`,
      );
    }
    return expenseId;
  });
}

export async function approveExpense(expenseId: string, actorId: string) {
  const expense = await db.query.accountingExpenses.findFirst({
    where: eq(accountingExpenses.id, expenseId),
  });
  if (!expense || (expense.status !== "draft" && expense.status !== "submitted")) {
    throw new AccountingError("Only a draft expense can be approved");
  }
  await enforceApproval({
    companyId: expense.companyId,
    documentType: "expense",
    entityId: expense.id,
    actorId,
    creatorId: expense.createdById,
    amount: expense.totalAmount,
    stage: "finance",
  });
  await db
    .update(accountingExpenses)
    .set({ status: "approved", approvedById: actorId })
    .where(eq(accountingExpenses.id, expenseId));
}

export async function postExpense(expenseId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const expense = await loadExpense(tx, expenseId);
    await lockCompany(tx, expense.companyId);
    if (expense.status !== "approved") {
      throw new AccountingError("Approve the expense before posting it");
    }
    const linkedEntryId = await linkedCostEntryId(tx, expense.id);
    if (linkedEntryId) {
      const costJournal = await tx.query.accountingJournals.findFirst({
        where: and(
          eq(accountingJournals.companyId, expense.companyId),
          eq(accountingJournals.sourceType, "operation_cost"),
          eq(accountingJournals.sourceId, linkedEntryId),
          eq(accountingJournals.status, "posted"),
          sql`${accountingJournals.reversalOfId} IS NULL`,
          sql`${accountingJournals.reversedById} IS NULL`,
        ),
      });
      const decision = costRecognitionDecision({
        intent: "expense",
        linkedEntryId,
        openCostJournal: Boolean(costJournal),
        openExpenseJournal: false,
      });
      if (!decision.post) {
        throw new RecognitionOverlapError(decision.message, expense.companyId, linkedEntryId);
      }
    }
    const priced = await priceExpense(tx, expense.companyId, expense.totalAmount, expense.vatCodeId);
    const bhdNet = convertToBhd(priced.net, expense.exchangeRate);
    const bhdVat = convertToBhd(priced.vat, expense.exchangeRate);
    const bhdTotal = convertToBhd(priced.total, expense.exchangeRate);
    const credit = await creditAccount(
      tx,
      expense.companyId,
      expense.method as PaymentMethod,
      expense.bankAccountId,
    );
    const lines: JournalLineInput[] = [
      {
        accountId: expense.accountId,
        debit: filsToAmount(priced.recoverable || priced.selfAssessed ? bhdNet : bhdTotal),
        credit: "0",
        description: expense.description,
        organizationId: expense.organizationId,
        vatCodeId: expense.vatCodeId,
      },
    ];
    if (priced.vat > 0n && (priced.recoverable || priced.selfAssessed)) {
      lines.push({
        accountId: (await accountByCode(tx, expense.companyId, "1150")).id,
        debit: filsToAmount(bhdVat),
        credit: "0",
        description: "Input VAT",
        vatCodeId: expense.vatCodeId,
      });
    }
    if (priced.vat > 0n && priced.selfAssessed) {
      lines.push({
        accountId: (await accountByCode(tx, expense.companyId, "2100")).id,
        debit: "0",
        credit: filsToAmount(bhdVat),
        description: "Self-assessed VAT",
        vatCodeId: expense.vatCodeId,
      });
    }
    lines.push({
      accountId: credit.id,
      debit: "0",
      credit: filsToAmount(bhdTotal),
      description: expense.description,
    });
    const journal = await postJournalWithin(tx, {
      companyId: expense.companyId,
      entryDate: expense.expenseDate,
      description: expense.description,
      sourceType: "expense",
      sourceId: expense.id,
      status: "posted",
      actorId,
      organizationId: expense.organizationId,
      operationId: expense.operationId,
      operationEntryId: linkedEntryId,
      lines,
    });
    await tx
      .update(accountingExpenses)
      .set({
        status: "posted",
        journalId: journal.id,
        netAmount: filsToAmount(priced.net),
        vatAmount: filsToAmount(priced.vat),
        totalAmount: filsToAmount(priced.total),
      })
      .where(eq(accountingExpenses.id, expense.id));
    return journal.id;
  });
}

export async function reverseExpense(expenseId: string, actorId: string) {
  const expense = await db.query.accountingExpenses.findFirst({
    where: eq(accountingExpenses.id, expenseId),
  });
  if (!expense?.journalId) throw new AccountingError("This expense has no posted journal");
  await reverseJournal(expense.journalId, actorId);
  await db
    .update(accountingExpenses)
    .set({ status: "reversed" })
    .where(eq(accountingExpenses.id, expenseId));
}

export async function saveAttachment(input: {
  companyId: string;
  entityType: "bill" | "expense";
  entityId: string;
  fileName: string;
  mimeType: string;
  bytes: Buffer;
  actorId: string;
}) {
  if (input.bytes.byteLength > 5 * 1024 * 1024) {
    throw new AccountingError("Attachments are limited to 5 MB");
  }
  const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(input.mimeType)) {
    throw new AccountingError("Attach a PDF or an image");
  }
  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80) || "file";
  const id = crypto.randomUUID();
  const relative = path.join("storage", "accounting", input.companyId, `${id}-${safeName}`);
  const absolute = path.join(process.cwd(), relative);
  await mkdir(path.dirname(absolute), { recursive: true });
  await writeFile(absolute, input.bytes);
  await db.insert(accountingAttachments).values({
    id,
    companyId: input.companyId,
    entityType: input.entityType,
    entityId: input.entityId,
    fileName: safeName,
    mimeType: input.mimeType,
    storagePath: relative,
    uploadedById: input.actorId,
  });
  return id;
}

function excelDate(value: string) {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  if (/^\d{5}(\.\d+)?$/.test(trimmed)) {
    const serial = Math.floor(Number(trimmed));
    const date = new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  const parts = trimmed.split(/[/.]/);
  if (parts.length === 3 && parts[2].length === 4) {
    return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
  }
  throw new AccountingError(`Unrecognised statement date: ${value}`);
}

function rowsToStatement(rows: string[][]) {
  if (rows.length < 2) throw new AccountingError("The workbook needs a header and at least one line");
  const header = rows[0].map((cell) => cell.trim().toLowerCase());
  const dateIndex = header.findIndex((cell) => cell === "date");
  const amountIndex = header.findIndex((cell) => cell === "amount");
  const debitIndex = header.findIndex((cell) => cell === "debit");
  const creditIndex = header.findIndex((cell) => cell === "credit");
  const descriptionIndex = header.findIndex((cell) => cell.includes("description") || cell === "details");
  const referenceIndex = header.findIndex((cell) => cell === "reference" || cell === "ref");
  if (dateIndex < 0) throw new AccountingError("Map a date column in the first row");
  if (amountIndex < 0 && (debitIndex < 0 || creditIndex < 0)) {
    throw new AccountingError("Map an amount column, or debit and credit columns");
  }
  return rows.slice(1).filter((row) => row.some((cell) => cell.trim())).map((row) => {
    let amount = amountIndex >= 0 ? row[amountIndex] ?? "0" : "0";
    if (amountIndex < 0) {
      amount = filsToAmount(toFils(row[debitIndex] || "0") - toFils(row[creditIndex] || "0"));
    }
    return {
      date: excelDate(row[dateIndex] ?? ""),
      amount,
      description: descriptionIndex >= 0 ? row[descriptionIndex] ?? "" : "",
      reference: referenceIndex >= 0 ? row[referenceIndex] ?? "" : "",
    };
  });
}

export async function importStatement(input: {
  companyId: string;
  bankAccountId: string;
  fileName: string;
  statementDate: string;
  csv: string;
  workbookBase64?: string;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  const bank = await db.query.accountingBankAccounts.findFirst({
    where: and(
      eq(accountingBankAccounts.id, input.bankAccountId),
      eq(accountingBankAccounts.companyId, input.companyId),
    ),
  });
  if (!bank) throw new AccountingError("Choose a bank account for this company");
  const parsed = input.workbookBase64
    ? rowsToStatement(parseXlsxSheet(Buffer.from(input.workbookBase64, "base64")))
    : parseStatementCsv(input.csv);
  return db.transaction(async (tx) => {
    const statementId = crypto.randomUUID();
    await tx.insert(accountingStatements).values({
      id: statementId,
      companyId: input.companyId,
      bankAccountId: bank.id,
      fileName: input.fileName,
      statementDate: input.statementDate,
      importedById: input.actorId,
    });
    let imported = 0;
    let skipped = 0;
    for (const line of parsed) {
      try {
        await tx.insert(accountingStatementLines).values({
          id: crypto.randomUUID(),
          statementId,
          bankAccountId: bank.id,
          lineDate: line.date,
          amount: filsToAmount(toFils(line.amount)),
          description: line.description.slice(0, 240),
          reference: line.reference.slice(0, 120),
          fingerprint: statementFingerprint(line),
        });
        imported += 1;
      } catch (error) {
        if (!isUnique(error)) throw error;
        skipped += 1;
      }
    }
    await audit(
      tx,
      input.companyId,
      input.actorId,
      "import_statement",
      "statement",
      statementId,
      `${imported} imported, ${skipped} duplicates skipped`,
    );
    return { statementId, imported, skipped };
  });
}

export async function openReconciliation(input: {
  companyId: string;
  bankAccountId: string;
  periodStart: string;
  periodEnd: string;
  statementBalance: string;
  actorId: string;
}) {
  const bank = await db.query.accountingBankAccounts.findFirst({
    where: and(
      eq(accountingBankAccounts.id, input.bankAccountId),
      eq(accountingBankAccounts.companyId, input.companyId),
    ),
  });
  if (!bank) throw new AccountingError("Choose a bank account for this company");
  const ledger = await ledgerBalance(input.companyId, bank.accountId, input.periodEnd);
  const statement = toFils(input.statementBalance);
  const id = crypto.randomUUID();
  await db.insert(accountingReconciliations).values({
    id,
    companyId: input.companyId,
    bankAccountId: bank.id,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    statementBalance: filsToAmount(statement),
    ledgerBalance: filsToAmount(ledger),
    difference: filsToAmount(statement - ledger),
    status: "open",
  });
  await db.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    actorId: input.actorId,
    action: "open_reconciliation",
    entityType: "reconciliation",
    entityId: id,
    detail: filsToAmount(statement - ledger),
  });
  return id;
}

export async function matchReconciliation(input: {
  reconciliationId: string;
  statementLineIds: string[];
  journalLineIds: string[];
  actorId: string;
}) {
  if (input.statementLineIds.length === 0 || input.journalLineIds.length === 0) {
    throw new AccountingError("Choose at least one statement line and one ledger line");
  }
  return db.transaction(async (tx) => {
    const reconciliation = await tx.query.accountingReconciliations.findFirst({
      where: eq(accountingReconciliations.id, input.reconciliationId),
    });
    if (!reconciliation || reconciliation.status !== "open") {
      throw new AccountingError("Match lines on an open reconciliation");
    }
    const bank = await tx.query.accountingBankAccounts.findFirst({
      where: eq(accountingBankAccounts.id, reconciliation.bankAccountId),
    });
    if (!bank) throw new AccountingError("Bank account missing");
    const statementLines = await tx.query.accountingStatementLines.findMany({
      where: and(eq(accountingStatementLines.bankAccountId, bank.id)),
    });
    const selectedStatement = statementLines.filter((line) =>
      input.statementLineIds.includes(line.id),
    );
    if (selectedStatement.length !== input.statementLineIds.length) {
      throw new AccountingError("Those statement lines are not on this bank account");
    }
    const journalLines = await tx.query.accountingJournalLines.findMany({
      where: eq(accountingJournalLines.accountId, bank.accountId),
      with: { journal: true },
    });
    const selectedJournal = journalLines.filter(
      (line) =>
        input.journalLineIds.includes(line.id) &&
        line.journal?.status === "posted" &&
        !line.journal.reversedById,
    );
    if (selectedJournal.length !== input.journalLineIds.length) {
      throw new AccountingError("Match posted ledger lines on this bank account");
    }
    const already = await tx.query.accountingReconciliationMatches.findMany({
      where: eq(accountingReconciliationMatches.reconciliationId, reconciliation.id),
    });
    const usedStatements = new Set(already.map((row) => row.statementLineId).filter(Boolean));
    const usedJournals = new Set(already.map((row) => row.journalLineId).filter(Boolean));
    if (
      selectedStatement.some((line) => usedStatements.has(line.id)) ||
      selectedJournal.some((line) => usedJournals.has(line.id))
    ) {
      throw new AccountingError("One of those lines is already matched");
    }
    const statementSum = selectedStatement.reduce((sum, line) => sum + toFils(line.amount), 0n);
    const journalSum = selectedJournal.reduce(
      (sum, line) => sum + toFils(line.debit) - toFils(line.credit),
      0n,
    );
    if (statementSum !== journalSum) {
      throw new AccountingError("The statement amount and the ledger amount do not match");
    }
    const group = crypto.randomUUID();
    await tx.insert(accountingReconciliationMatches).values([
      ...selectedStatement.map((line) => ({
        id: crypto.randomUUID(),
        reconciliationId: reconciliation.id,
        matchGroup: group,
        statementLineId: line.id,
        amount: line.amount,
      })),
      ...selectedJournal.map((line) => ({
        id: crypto.randomUUID(),
        reconciliationId: reconciliation.id,
        matchGroup: group,
        journalLineId: line.id,
        amount: filsToAmount(toFils(line.debit) - toFils(line.credit)),
      })),
    ]);
    await audit(tx, reconciliation.companyId, input.actorId, "match", "reconciliation", reconciliation.id, group);
  });
}

export async function completeReconciliation(reconciliationId: string, actorId: string) {
  return db.transaction(async (tx) => {
    const reconciliation = await tx.query.accountingReconciliations.findFirst({
      where: eq(accountingReconciliations.id, reconciliationId),
    });
    if (!reconciliation || reconciliation.status !== "open") {
      throw new AccountingError("This reconciliation is not open");
    }
    const bank = await tx.query.accountingBankAccounts.findFirst({
      where: eq(accountingBankAccounts.id, reconciliation.bankAccountId),
    });
    if (!bank) throw new AccountingError("Bank account missing");
    const ledger = await ledgerBalance(reconciliation.companyId, bank.accountId, reconciliation.periodEnd);
    const statement = toFils(reconciliation.statementBalance);
    if (statement !== ledger) {
      throw new AccountingError(
        "The statement balance and the ledger balance still differ. Record the bank charge or deposit, then match it. Importing a statement does not post a journal.",
      );
    }
    const unmatched = await unmatchedCounts(tx, reconciliation.id, bank.id, bank.accountId, reconciliation.periodStart, reconciliation.periodEnd);
    if (unmatched.statement > 0 || unmatched.ledger > 0) {
      throw new AccountingError("Match every statement line and ledger line in this period before locking");
    }
    await tx
      .update(accountingReconciliations)
      .set({
        status: "completed",
        ledgerBalance: filsToAmount(ledger),
        difference: "0.000",
        completedAt: new Date(),
        completedById: actorId,
      })
      .where(eq(accountingReconciliations.id, reconciliationId));
    await audit(tx, reconciliation.companyId, actorId, "complete_reconciliation", "reconciliation", reconciliationId, "locked");
  });
}

export async function reopenReconciliation(reconciliationId: string, actorId: string) {
  const reconciliation = await db.query.accountingReconciliations.findFirst({
    where: eq(accountingReconciliations.id, reconciliationId),
  });
  if (!reconciliation || reconciliation.status !== "completed") {
    throw new AccountingError("Only a completed reconciliation can be reopened");
  }
  await db
    .update(accountingReconciliations)
    .set({ status: "open", completedAt: null, completedById: null })
    .where(eq(accountingReconciliations.id, reconciliationId));
  await db.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: reconciliation.companyId,
    actorId,
    action: "reopen_reconciliation",
    entityType: "reconciliation",
    entityId: reconciliationId,
    detail: "reopened",
  });
}

export async function saveCompanySettings(input: {
  companyId: string;
  legalName: string;
  address: string;
  phone: string;
  email: string;
  crNumber: string;
  vatRegistered: boolean;
  vatNumber: string;
  vatEffectiveFrom: string;
  filingFrequency: string;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  const frequency = ["monthly", "quarterly", "none"].includes(input.filingFrequency)
    ? input.filingFrequency
    : "quarterly";
  await db
    .insert(accountingSettings)
    .values({
      companyId: input.companyId,
      legalName: input.legalName.trim(),
      address: input.address.trim(),
      phone: input.phone.trim(),
      email: input.email.trim(),
      crNumber: input.crNumber.trim(),
      vatRegistered: input.vatRegistered ? 1 : 0,
      vatNumber: input.vatNumber.trim(),
      vatEffectiveFrom: input.vatEffectiveFrom || null,
      filingFrequency: frequency,
    })
    .onConflictDoUpdate({
      target: accountingSettings.companyId,
      set: {
        legalName: input.legalName.trim(),
        address: input.address.trim(),
        phone: input.phone.trim(),
        email: input.email.trim(),
        crNumber: input.crNumber.trim(),
        vatRegistered: input.vatRegistered ? 1 : 0,
        vatNumber: input.vatNumber.trim(),
        vatEffectiveFrom: input.vatEffectiveFrom || null,
        filingFrequency: frequency,
      },
    });
  await db.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    actorId: input.actorId,
    action: "vat_settings",
    entityType: "settings",
    entityId: input.companyId,
    detail: input.vatRegistered ? input.vatNumber.trim() : "not registered",
  });
}

export async function saveExchangeRate(input: {
  companyId: string;
  currency: string;
  rateToBhd: string;
  effectiveOn: string;
  actorId: string;
}) {
  const currency = input.currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency) || currency === "BHD") {
    throw new AccountingError("Enter a foreign currency code");
  }
  if (toFils(input.rateToBhd) <= 0n) throw new AccountingError("Enter a rate greater than zero");
  await db.insert(accountingExchangeRates).values({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    currency,
    rateToBhd: input.rateToBhd,
    effectiveOn: input.effectiveOn,
    createdById: input.actorId,
  });
}

export async function prepareVatReturn(input: {
  companyId: string;
  periodStart: string;
  periodEnd: string;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  const settings = await db.query.accountingSettings.findFirst({
    where: eq(accountingSettings.companyId, input.companyId),
  });
  if (!settings?.vatRegistered) {
    throw new AccountingError("Mark this company as VAT registered before preparing a return");
  }
  const totals = await vatPosition(input.companyId, input.periodStart, input.periodEnd);
  const dueOn = vatDueDate(input.periodEnd);
  const existing = await db.query.accountingVatReturns.findFirst({
    where: and(
      eq(accountingVatReturns.companyId, input.companyId),
      eq(accountingVatReturns.periodStart, input.periodStart),
      eq(accountingVatReturns.periodEnd, input.periodEnd),
    ),
  });
  if (existing?.status === "locked") {
    throw new AccountingError("This VAT period is locked");
  }
  if (existing) {
    await db
      .update(accountingVatReturns)
      .set({
        outputVat: filsToAmount(totals.output),
        inputVat: filsToAmount(totals.input),
        netVat: filsToAmount(totals.net),
        dueOn,
        status: "draft",
        preparerId: input.actorId,
      })
      .where(eq(accountingVatReturns.id, existing.id));
    return existing.id;
  }
  const id = crypto.randomUUID();
  await db.insert(accountingVatReturns).values({
    id,
    companyId: input.companyId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    dueOn,
    status: "draft",
    outputVat: filsToAmount(totals.output),
    inputVat: filsToAmount(totals.input),
    netVat: filsToAmount(totals.net),
    preparerId: input.actorId,
  });
  return id;
}

export async function reviewVatReturn(id: string, actorId: string) {
  const row = await db.query.accountingVatReturns.findFirst({
    where: eq(accountingVatReturns.id, id),
  });
  if (!row || row.status === "locked") throw new AccountingError("Review a draft VAT return");
  await db
    .update(accountingVatReturns)
    .set({ status: "reviewed", reviewerId: actorId })
    .where(eq(accountingVatReturns.id, id));
}

export async function lockVatReturn(id: string, actorId: string) {
  const row = await db.query.accountingVatReturns.findFirst({
    where: eq(accountingVatReturns.id, id),
  });
  if (!row || row.status !== "reviewed") {
    throw new AccountingError("A reviewer approves the return before the period is locked");
  }
  await db.update(accountingVatReturns).set({ status: "locked" }).where(eq(accountingVatReturns.id, id));
  await db.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: row.companyId,
    actorId,
    action: "lock_vat_return",
    entityType: "vat_return",
    entityId: id,
    detail: "Period locked. The return can now be filed in the National Bureau for Revenue boxes.",
  });
}

export async function recordVatFiling(input: {
  id: string;
  filingReference: string;
  paymentStatus: string;
  actorId: string;
}) {
  const row = await db.query.accountingVatReturns.findFirst({
    where: eq(accountingVatReturns.id, input.id),
  });
  if (!row || row.status !== "locked") {
    throw new AccountingError("Record a filing reference on a locked return");
  }
  const paymentStatus = ["unpaid", "paid", "refund"].includes(input.paymentStatus)
    ? input.paymentStatus
    : "unpaid";
  await db
    .update(accountingVatReturns)
    .set({ filingReference: input.filingReference.trim(), paymentStatus })
    .where(eq(accountingVatReturns.id, input.id));
  await db.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: row.companyId,
    actorId: input.actorId,
    action: "record_vat_filing",
    entityType: "vat_return",
    entityId: input.id,
    detail: input.filingReference.trim(),
  });
}

export async function nbrVatStatement(companyId: string, from: string, to: string) {
  const rows = await db.execute(sql`
    SELECT COALESCE(c.treatment, 'out_of_scope') AS treatment,
           COALESCE(SUM(CASE WHEN a.account_type = 'income' THEN l.credit - l.debit ELSE 0 END), 0)::text AS sales_net,
           COALESCE(SUM(CASE WHEN a.subtype = 'vat_output' THEN l.credit - l.debit ELSE 0 END), 0)::text AS output_vat,
           COALESCE(SUM(CASE WHEN a.account_type = 'expense' OR a.subtype IN ('inventory', 'purchases') THEN l.debit - l.credit ELSE 0 END), 0)::text AS purchase_net,
           COALESCE(SUM(CASE WHEN a.subtype = 'vat_input' THEN l.debit - l.credit ELSE 0 END), 0)::text AS input_vat
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    LEFT JOIN accounting_vat_codes c ON c.id = l.vat_code_id
    WHERE j.status = 'posted'
      AND j.reversed_by_id IS NULL
      AND j.company_id = ${companyId}
      AND j.entry_date >= ${from}::date
      AND j.entry_date <= ${to}::date
    GROUP BY c.treatment
  `);
  const movements: TreatmentMovement[] = rowsOf<{
    treatment: string;
    sales_net: string;
    output_vat: string;
    purchase_net: string;
    input_vat: string;
  }>(rows).map((row) => ({
    treatment: row.treatment,
    salesNet: toFils(row.sales_net),
    outputVat: toFils(row.output_vat),
    purchaseNet: toFils(row.purchase_net),
    inputVat: toFils(row.input_vat),
  }));
  return nbrVatReturn(movements);
}

export async function fileVatReturn(id: string, actorId: string, paymentStatus: string) {
  const row = await db.query.accountingVatReturns.findFirst({
    where: eq(accountingVatReturns.id, id),
  });
  if (!row || row.status !== "locked") {
    throw new AccountingError("Lock the return before filing it with the National Bureau for Revenue");
  }
  const settings = await db.query.accountingSettings.findFirst({
    where: eq(accountingSettings.companyId, row.companyId),
  });
  const vatNumber = settings?.vatNumber.trim() ?? "";
  if (!settings?.vatRegistered || !vatNumber) {
    throw new AccountingError("Enter this company's VAT account number before filing with the National Bureau for Revenue");
  }
  const boxes = await nbrVatStatement(row.companyId, row.periodStart, row.periodEnd);
  const position = await vatPosition(row.companyId, row.periodStart, row.periodEnd);
  const reference = `NBR-${vatNumber}-${row.periodEnd.replaceAll("-", "")}`;
  const status = ["unpaid", "paid", "refund"].includes(paymentStatus) ? paymentStatus : "unpaid";
  await db
    .update(accountingVatReturns)
    .set({
      status: "filed",
      outputVat: filsToAmount(position.output),
      inputVat: filsToAmount(position.input),
      netVat: filsToAmount(position.net),
      filingReference: reference,
      paymentStatus: status,
    })
    .where(eq(accountingVatReturns.id, id));
  await db.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId: row.companyId,
    actorId,
    action: "file_vat_return",
    entityType: "vat_return",
    entityId: id,
    detail: [
      reference,
      `standard sales ${filsToAmount(boxes.standardSales)} vat ${filsToAmount(boxes.standardSalesVat)}`,
      `zero-rated ${filsToAmount(boxes.zeroRatedSales)}`,
      `exempt ${filsToAmount(boxes.exemptSales)}`,
      `standard purchases ${filsToAmount(boxes.standardPurchases)} vat ${filsToAmount(boxes.standardPurchasesVat)}`,
      `imports ${filsToAmount(boxes.imports)} vat ${filsToAmount(boxes.importVat)}`,
      `reverse charge ${filsToAmount(boxes.reverseChargePurchases)} vat ${filsToAmount(boxes.reverseChargeVat)}`,
      `net ${filsToAmount(position.net)}`,
    ].join(" · "),
  });
  return { reference, net: filsToAmount(position.net) };
}

export async function vatPosition(companyId: string, from: string, to: string) {
  const rows = await db.execute(sql`
    SELECT COALESCE(a.subtype, '') AS subtype,
           COALESCE(SUM(l.debit), 0)::text AS debit,
           COALESCE(SUM(l.credit), 0)::text AS credit
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    INNER JOIN accounting_accounts a ON a.id = l.account_id
    WHERE j.status = 'posted'
      AND j.reversed_by_id IS NULL
      AND j.company_id = ${companyId}
      AND j.entry_date >= ${from}::date
      AND j.entry_date <= ${to}::date
      AND a.subtype IN ('vat_input', 'vat_output')
    GROUP BY a.subtype
  `);
  let output = 0n;
  let input = 0n;
  for (const row of rowsOf<{ subtype: string; debit: string; credit: string }>(rows)) {
    if (row.subtype === "vat_output") output += toFils(row.credit) - toFils(row.debit);
    if (row.subtype === "vat_input") input += toFils(row.debit) - toFils(row.credit);
  }
  return { output, input, net: output - input };
}

async function billJournalLines(
  tx: AccountingTx,
  companyId: string,
  bill: { currency: string; exchangeRate: string; supplierOrganizationId: string | null },
  lines: Array<{
    expenseAccountId: string;
    description: string;
    netAmount: string;
    vatAmount: string;
    lineTotal: string;
    vatCode: { treatment: string; id: string } | null;
  }>,
  creditNote: boolean,
) {
  const payable = await accountByCode(tx, companyId, "2000");
  const inputVat = await accountByCode(tx, companyId, "1150");
  const outputVat = await accountByCode(tx, companyId, "2100");
  const journal: JournalLineInput[] = [];
  let payableTotal = 0n;
  const debitExpense = !creditNote;
  for (const line of lines) {
    const treatment = line.vatCode?.treatment ?? "out_of_scope";
    const net = convertToBhd(toFils(line.netAmount), bill.exchangeRate);
    const vat = convertToBhd(toFils(line.vatAmount), bill.exchangeRate);
    const recoverable = treatment === "standard" || treatment === "reverse_charge" || treatment === "import";
    const selfAssessed = treatment === "reverse_charge" || treatment === "import";
    const supplier = treatment === "non_recoverable" || treatment === "standard" ? net + vat : net;
    const expense = treatment === "non_recoverable" ? net + vat : net;
    payableTotal += supplier;
    push(journal, line.expenseAccountId, expense, debitExpense, line.description, bill.supplierOrganizationId, line.vatCode?.id);
    if (vat > 0n && recoverable) {
      push(journal, inputVat.id, vat, debitExpense, "Input VAT", bill.supplierOrganizationId, line.vatCode?.id);
    }
    if (vat > 0n && selfAssessed) {
      push(journal, outputVat.id, vat, !debitExpense, "Self-assessed VAT", bill.supplierOrganizationId, line.vatCode?.id);
    }
  }
  push(journal, payable.id, payableTotal, !debitExpense, "Accounts payable", bill.supplierOrganizationId, null);
  return journal;
}

function push(
  lines: JournalLineInput[],
  accountId: string,
  amount: bigint,
  debit: boolean,
  description: string,
  organizationId: string | null,
  vatCodeId?: string | null,
) {
  if (amount === 0n) return;
  lines.push({
    accountId,
    debit: debit ? filsToAmount(amount) : "0",
    credit: debit ? "0" : filsToAmount(amount),
    description,
    organizationId,
    vatCodeId: vatCodeId ?? null,
  });
}

async function priceLines(tx: AccountingTx, companyId: string, lines: BillLineInput[]) {
  if (lines.length === 0) throw new AccountingError("Add at least one line");
  const priced: PricedLine[] = [];
  for (const line of lines) {
    const account = await tx.query.accountingAccounts.findFirst({
      where: and(
        eq(accountingAccounts.id, line.expenseAccountId),
        eq(accountingAccounts.companyId, companyId),
        eq(accountingAccounts.accountType, "expense"),
        eq(accountingAccounts.isActive, 1),
      ),
    });
    if (!account) throw new AccountingError("Choose an expense account for every line");
    let vat: VatRule | null = null;
    if (line.vatCodeId) {
      const code = await tx.query.accountingVatCodes.findFirst({
        where: and(
          eq(accountingVatCodes.id, line.vatCodeId),
          eq(accountingVatCodes.companyId, companyId),
          eq(accountingVatCodes.isActive, 1),
        ),
      });
      if (!code) throw new AccountingError("Choose a VAT code for this company");
      vat = { id: code.id, rate: code.rate, treatment: code.treatment };
    }
    priced.push(priceBillLine({ ...line, vat }));
  }
  return priced;
}

async function priceExpense(
  tx: AccountingTx,
  companyId: string,
  amount: string,
  vatCodeId?: string | null,
) {
  const gross = toFils(amount);
  if (gross <= 0n) throw new AccountingError("Enter an amount greater than zero");
  if (!vatCodeId) return { net: gross, vat: 0n, total: gross, recoverable: false, selfAssessed: false };
  const code = await tx.query.accountingVatCodes.findFirst({
    where: and(
      eq(accountingVatCodes.id, vatCodeId),
      eq(accountingVatCodes.companyId, companyId),
      eq(accountingVatCodes.isActive, 1),
    ),
  });
  if (!code) throw new AccountingError("Choose a VAT code for this company");
  if (code.treatment === "standard" || code.treatment === "non_recoverable") {
    const split = splitInclusiveVat(gross, code.rate);
    return {
      net: split.net,
      vat: split.vat,
      total: gross,
      recoverable: code.treatment === "standard",
      selfAssessed: false,
    };
  }
  if (code.treatment === "reverse_charge" || code.treatment === "import") {
    const vat = vatOnNet(gross, code.rate);
    return { net: gross, vat, total: gross, recoverable: true, selfAssessed: true };
  }
  return { net: gross, vat: 0n, total: gross, recoverable: false, selfAssessed: false };
}

async function insertLines(tx: AccountingTx, billId: string, lines: PricedLine[]) {
  await tx.insert(accountingBillLines).values(
    lines.map((line, index) => ({
      id: crypto.randomUUID(),
      billId,
      expenseAccountId: line.expenseAccountId,
      vatCodeId: line.vatCodeId,
      description: line.description,
      quantity: filsToAmount(line.quantity),
      unitAmount: filsToAmount(line.unitAmount),
      discount: filsToAmount(line.discount),
      netAmount: filsToAmount(line.net),
      vatAmount: filsToAmount(line.vat),
      lineTotal: filsToAmount(line.supplierTotal),
      sortOrder: index,
    })),
  );
}

async function outstandingOf(tx: AccountingTx | typeof db, billId: string) {
  const bill = await loadBill(tx, billId);
  const paid = await paidAmount(tx, billId);
  const prior = await procurementSettlements(tx, bill);
  const credits = await creditedAmount(tx, billId);
  return toFils(bill.total) - paid - prior - credits;
}

async function procurementSettlements(
  tx: AccountingTx | typeof db,
  bill: { id: string; companyId: string; procurementEntryId: string | null },
) {
  if (!bill.procurementEntryId) return 0n;
  const rows = await tx.execute(sql`
    SELECT COALESCE(SUM(p.amount), 0)::text AS amount
    FROM accounting_payments p
    INNER JOIN accounting_journals j ON j.id = p.journal_id
    WHERE p.operation_entry_id = ${bill.procurementEntryId}
      AND p.bill_id IS NULL
      AND p.company_id = ${bill.companyId}
      AND p.direction = 'payment'
      AND j.status = 'posted'
      AND j.reversed_by_id IS NULL
  `);
  return toFils(rowsOf<{ amount: string }>(rows)[0]?.amount ?? "0");
}

export async function loadBillSettlement(billId: string) {
  const bill = await db.query.accountingBills.findFirst({ where: eq(accountingBills.id, billId) });
  if (!bill) return null;
  const paidOnBill = await paidAmount(db, billId);
  const prior = await procurementSettlements(db, bill);
  const credits = await creditedAmount(db, billId);
  return {
    paid: paidOnBill + prior,
    credits,
    outstanding: toFils(bill.total) - paidOnBill - prior - credits,
  };
}

async function paidAmount(tx: AccountingTx | typeof db, billId: string) {
  const rows = await tx.execute(sql`
    SELECT COALESCE(SUM(p.amount), 0)::text AS amount
    FROM accounting_payments p
    INNER JOIN accounting_journals j ON j.id = p.journal_id
    WHERE p.bill_id = ${billId}
      AND j.status = 'posted'
      AND j.reversed_by_id IS NULL
  `);
  const row = rowsOf<{ amount: string }>(rows)[0];
  return toFils(row?.amount ?? "0");
}

async function creditedAmount(tx: AccountingTx | typeof db, billId: string) {
  const rows = await tx.execute(sql`
    SELECT COALESCE(SUM(total), 0)::text AS amount
    FROM accounting_bills
    WHERE credit_of_bill_id = ${billId}
      AND document_kind = 'credit_note'
      AND status IN ('posted', 'partial', 'paid')
  `);
  return toFils(rowsOf<{ amount: string }>(rows)[0]?.amount ?? "0");
}

async function refreshBillStatus(tx: AccountingTx, billId: string) {
  const bill = await loadBill(tx, billId);
  if (bill.status === "reversed" || bill.status === "draft" || bill.status === "approved") return;
  const remaining = await outstandingOf(tx, billId);
  const paid = await paidAmount(tx, billId);
  const status = remaining <= 0n ? "paid" : paid > 0n ? "partial" : "posted";
  await tx.update(accountingBills).set({ status }).where(eq(accountingBills.id, billId));
}

async function creditAccount(
  tx: AccountingTx,
  companyId: string,
  method: PaymentMethod,
  bankAccountId?: string | null,
) {
  if (method === "card") return accountByCode(tx, companyId, "2350");
  if (bankAccountId) {
    const bank = await tx.query.accountingBankAccounts.findFirst({
      where: and(
        eq(accountingBankAccounts.id, bankAccountId),
        eq(accountingBankAccounts.companyId, companyId),
        eq(accountingBankAccounts.isActive, 1),
      ),
    });
    if (!bank) throw new AccountingError("Choose a bank account for this company");
    const account = await tx.query.accountingAccounts.findFirst({
      where: eq(accountingAccounts.id, bank.accountId),
    });
    if (!account) throw new AccountingError("Bank account is not linked to the ledger");
    return account;
  }
  return accountByCode(tx, companyId, method === "cash" ? "1000" : "1010");
}

async function accountByCode(tx: AccountingTx, companyId: string, code: string) {
  const account = await tx.query.accountingAccounts.findFirst({
    where: and(
      eq(accountingAccounts.companyId, companyId),
      eq(accountingAccounts.code, code),
      eq(accountingAccounts.isActive, 1),
    ),
  });
  if (!account) throw new AccountingError(`Account ${code} is not available for this company`);
  return account;
}

async function ledgerBalance(companyId: string, accountId: string, asOf: string) {
  const rows = await db.execute(sql`
    SELECT COALESCE(SUM(l.debit - l.credit), 0)::text AS net
    FROM accounting_journal_lines l
    INNER JOIN accounting_journals j ON j.id = l.journal_id
    WHERE j.status = 'posted'
      AND j.reversed_by_id IS NULL
      AND j.company_id = ${companyId}
      AND l.account_id = ${accountId}
      AND j.entry_date <= ${asOf}::date
  `);
  return toFils(rowsOf<{ net: string }>(rows)[0]?.net ?? "0");
}

async function unmatchedCounts(
  tx: AccountingTx,
  reconciliationId: string,
  bankAccountId: string,
  accountId: string,
  from: string,
  to: string,
) {
  const matches = await tx.query.accountingReconciliationMatches.findMany({
    where: eq(accountingReconciliationMatches.reconciliationId, reconciliationId),
  });
  const statementIds = new Set(matches.map((row) => row.statementLineId).filter(Boolean));
  const journalIds = new Set(matches.map((row) => row.journalLineId).filter(Boolean));
  const statementLines = await tx.query.accountingStatementLines.findMany({
    where: eq(accountingStatementLines.bankAccountId, bankAccountId),
  });
  const journalLines = await tx.query.accountingJournalLines.findMany({
    where: eq(accountingJournalLines.accountId, accountId),
    with: { journal: true },
  });
  const statement = statementLines.filter(
    (line) => line.lineDate >= from && line.lineDate <= to && !statementIds.has(line.id),
  ).length;
  const ledger = journalLines.filter(
    (line) =>
      line.journal?.status === "posted" &&
      !line.journal.reversedById &&
      line.journal.entryDate >= from &&
      line.journal.entryDate <= to &&
      !journalIds.has(line.id),
  ).length;
  return { statement, ledger };
}

async function nextNumber(tx: AccountingTx, companyId: string, prefix: string) {
  const start = prefix.length + 2;
  const rows =
    prefix === "EXP"
      ? await tx.execute(sql`
          SELECT COALESCE(MAX(CAST(SUBSTRING(expense_number FROM ${sql.raw(String(start))}) AS INTEGER)), 0)::int AS max
          FROM accounting_expenses
          WHERE company_id = ${companyId} AND expense_number LIKE ${`${prefix}-%`}
        `)
      : await tx.execute(sql`
          SELECT COALESCE(MAX(CAST(SUBSTRING(bill_number FROM ${sql.raw(String(start))}) AS INTEGER)), 0)::int AS max
          FROM accounting_bills
          WHERE company_id = ${companyId} AND bill_number LIKE ${`${prefix}-%`}
        `);
  const max = Number(rowsOf<{ max: number }>(rows)[0]?.max ?? 0);
  return `${prefix}-${String(max + 1).padStart(5, "0")}`;
}

async function loadBill(tx: AccountingTx | typeof db, id: string) {
  const bill = await tx.query.accountingBills.findFirst({ where: eq(accountingBills.id, id) });
  if (!bill) throw new AccountingError("Bill not found");
  return bill;
}

async function linkedCostEntryId(tx: AccountingTx, expenseId: string) {
  const ready = await columnExists(tx, "accounting_expenses", "operation_entry_id");
  if (!ready) return null;
  const rows = await tx.execute(
    sql`SELECT operation_entry_id AS entry_id FROM accounting_expenses WHERE id = ${expenseId}`,
  );
  const row = rowsOf<{ entry_id: string | null }>(rows)[0];
  return row?.entry_id || null;
}

async function loadExpense(tx: AccountingTx, id: string) {
  const expense = await tx.query.accountingExpenses.findFirst({
    where: eq(accountingExpenses.id, id),
  });
  if (!expense) throw new AccountingError("Expense not found");
  return expense;
}

async function assertSupplier(tx: AccountingTx, organizationId: string) {
  const organization = await tx.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
    columns: { id: true },
  });
  if (!organization) throw new AccountingError("Choose a supplier organization");
}

async function assertOperation(tx: AccountingTx, companyId: string, operationId?: string | null) {
  if (!operationId) return;
  const operation = await tx.query.operations.findFirst({
    where: eq(operations.id, operationId),
    columns: { divisionId: true },
  });
  if (!operation || operation.divisionId !== companyId) {
    throw new AccountingError("That operation belongs to a different company");
  }
}

async function lockCompany(tx: AccountingTx, companyId: string) {
  await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${`acct:${companyId}`}))`);
}

async function audit(
  tx: AccountingTx,
  companyId: string,
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  detail: string,
) {
  await tx.insert(accountingAudit).values({
    id: crypto.randomUUID(),
    companyId,
    actorId,
    action,
    entityType,
    entityId,
    detail,
  });
}

function rowsOf<T = any>(rows: unknown): T[] {
  if (Array.isArray(rows)) return rows as T[];
  if (rows && typeof rows === "object" && "rows" in rows) {
    const nested = (rows as { rows?: unknown }).rows;
    return Array.isArray(nested) ? (nested as T[]) : [];
  }
  return [];
}

function isUnique(error: unknown) {
  let current: unknown = error;
  const seen = new Set<unknown>();
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    if ("code" in current && (current as { code: unknown }).code === "23505") return true;
    current = "cause" in current ? (current as { cause: unknown }).cause : null;
  }
  return false;
}

export async function recordBankMovement(input: {
  companyId: string;
  bankAccountId: string;
  entryDate: string;
  amount: string;
  kind: "deposit" | "withdrawal" | "charge" | "interest";
  offsetAccountId: string;
  description: string;
  settlementPaymentId?: string | null;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  const settlementId = input.settlementPaymentId?.trim() || null;
  const movement = bankMovementDecision({ settlementPaymentId: settlementId });
  return db.transaction(async (tx) => {
    if (!movement.post) {
      const payment = await tx.query.accountingPayments.findFirst({
        where: eq(accountingPayments.id, settlementId ?? ""),
      });
      if (!payment || payment.companyId !== input.companyId) {
        throw new AccountingError(
          "That payment was not found in this company. The bank movement was not posted.",
        );
      }
      throw new AccountingError(movement.message);
    }
    const amount = toFils(input.amount);
    if (amount <= 0n) throw new AccountingError("Enter an amount greater than zero");
    const bank = await tx.query.accountingBankAccounts.findFirst({
      where: and(
        eq(accountingBankAccounts.id, input.bankAccountId),
        eq(accountingBankAccounts.companyId, input.companyId),
      ),
    });
    if (!bank) throw new AccountingError("Choose a bank account for this company");
    const offset = await tx.query.accountingAccounts.findFirst({
      where: and(
        eq(accountingAccounts.id, input.offsetAccountId),
        eq(accountingAccounts.companyId, input.companyId),
        eq(accountingAccounts.isActive, 1),
      ),
    });
    if (!offset) throw new AccountingError("Choose an offset account for this company");
    const moneyIn = input.kind === "deposit" || input.kind === "interest";
    const journal = await postJournalWithin(tx, {
      companyId: input.companyId,
      entryDate: input.entryDate,
      description: input.description.trim() || input.kind,
      sourceType: "bank_movement",
      sourceId: crypto.randomUUID(),
      status: "posted",
      actorId: input.actorId,
      lines: [
        {
          accountId: bank.accountId,
          debit: moneyIn ? filsToAmount(amount) : "0",
          credit: moneyIn ? "0" : filsToAmount(amount),
          description: input.kind,
        },
        {
          accountId: offset.id,
          debit: moneyIn ? "0" : filsToAmount(amount),
          credit: moneyIn ? filsToAmount(amount) : "0",
          description: input.kind,
        },
      ],
    });
    await audit(tx, input.companyId, input.actorId, "bank_movement", "journal", journal.id, input.kind);
    return journal.id;
  });
}

export async function listBills(companyId: string) {
  return db.query.accountingBills.findMany({
    where: companyId === "all" ? undefined : eq(accountingBills.companyId, companyId),
    with: { supplier: true, lines: true },
    orderBy: [desc(accountingBills.billDate)],
    limit: 100,
  });
}

export async function listExpenses(companyId: string) {
  return db.query.accountingExpenses.findMany({
    where: companyId === "all" ? undefined : eq(accountingExpenses.companyId, companyId),
    with: { account: true, organization: true },
    orderBy: [desc(accountingExpenses.expenseDate)],
    limit: 100,
  });
}
