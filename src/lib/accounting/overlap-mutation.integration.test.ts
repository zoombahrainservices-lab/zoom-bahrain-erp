import assert from "node:assert/strict";
import test from "node:test";
import postgres from "postgres";
import { eq, sql } from "drizzle-orm";

import { closeDatabase, db } from "@/db";
import {
  accountingAccounts,
  accountingBills,
  accountingJournals,
  accountingPayments,
  operationEntries,
  operations,
  organizations,
  users,
} from "@/db/schema";
import { applyOverlapGuards } from "@/db/migrate-overlap-guards";

import { ensureCompanyBooks, postDocumentToLedger, recordExpense, recordPayment, reverseJournal } from "./engine";
import { AccountingError } from "./money";
import { RecognitionOverlapError } from "./overlap";
import { assertProcurementMayPost } from "./phase3";
import {
  approveBill,
  approveExpense,
  payBill,
  postBill,
  postExpense,
  reverseBill,
  reverseExpense,
  saveBill,
  saveExpense,
} from "./phase2";

const databaseUrl = process.env.DATABASE_URL ?? "";
const isolated = databaseUrl.includes("127.0.0.1") || databaseUrl.includes("localhost");
test.after(async () => {
  if (isolated) await closeDatabase().catch(() => undefined);
});

const companyId = "administration";
const otherCompanyId = "events";
const actorId = "overlap-mutation-user";
const supplierId = "overlap-mutation-supplier";
const operationId = "overlap-mutation-operation";

test("linked purchases, payments, costs, and reversals use one recognition", { skip: isolated ? false : "isolated database was not configured", timeout: 180_000 }, async () => {
  assert.match(databaseUrl, /127\.0\.0\.1|localhost/);
  await db.execute(sql`
    DELETE FROM accounting_journal_lines
    WHERE journal_id IN (SELECT id FROM accounting_journals WHERE company_id IN (${companyId}, ${otherCompanyId}))
  `);
  await db.execute(sql`DELETE FROM accounting_payments WHERE company_id IN (${companyId}, ${otherCompanyId})`);
  await db.execute(sql`DELETE FROM accounting_journals WHERE company_id IN (${companyId}, ${otherCompanyId})`);
  await db.execute(sql`
    DELETE FROM accounting_bill_lines
    WHERE bill_id IN (SELECT id FROM accounting_bills WHERE company_id IN (${companyId}, ${otherCompanyId}))
  `);
  await db.execute(sql`DELETE FROM accounting_bills WHERE company_id IN (${companyId}, ${otherCompanyId})`);
  await db.execute(sql`DELETE FROM accounting_expenses WHERE company_id IN (${companyId}, ${otherCompanyId})`);
  await db.execute(sql`DELETE FROM accounting_audit WHERE company_id IN (${companyId}, ${otherCompanyId})`);
  await db.execute(sql`DELETE FROM operation_entries WHERE operation_id = ${operationId}`);
  const guard = postgres(databaseUrl, { prepare: false, ssl: false, max: 1 });
  await applyOverlapGuards(guard);
  await guard.end({ timeout: 5 });

  await db.insert(users).values({
    id: actorId,
    username: "overlap-mutation",
    passwordHash: "not-a-login",
    name: "Overlap mutation",
    role: "admin",
  }).onConflictDoNothing();
  await ensureCompanyBooks(companyId);
  await ensureCompanyBooks(otherCompanyId);
  await db.insert(organizations).values({
    id: supplierId,
    name: "Overlap supplier",
    roles: "[]",
    status: "active",
  }).onConflictDoNothing();
  await db.insert(operations).values({
    id: operationId,
    operationCode: "OVL-1",
    divisionId: companyId,
    title: "Overlap purchase",
    createdById: actorId,
  }).onConflictDoNothing();

  const purchases = await db.query.accountingAccounts.findFirst({
    where: sql`${accountingAccounts.companyId} = ${companyId} AND ${accountingAccounts.code} = '5600'`,
  });
  assert.ok(purchases, "chart account 5600 was not created");

  const receipt = await procurement("proc-received-first", "25.000");
  await postDocumentToLedger(ledgerInput(receipt, "25.000"));
  const matching = await draftBill(receipt, "25.000", "INV-MATCH");
  await approveBill(matching, actorId);
  const adopted = await postBill(matching, actorId);
  const adoptedBill = await db.query.accountingBills.findFirst({ where: eq(accountingBills.id, matching) });
  assert.equal(adoptedBill?.status, "posted");
  assert.equal(adoptedBill?.journalId, adopted.journalId);
  assert.match(adopted.note, /No second payable/);
  assert.equal(await purchaseJournals(receipt), 1);
  assert.equal(await sourceCount(receipt, "supplier_bill"), 0);

  const mismatchEntry = await procurement("proc-mismatch", "25.000");
  await postDocumentToLedger(ledgerInput(mismatchEntry, "25.000"));
  const mismatchBill = await draftBill(mismatchEntry, "30.000", "INV-DIFF");
  await approveBill(mismatchBill, actorId);
  await assert.rejects(() => postBill(mismatchBill, actorId), (error: unknown) => {
    assert.ok(error instanceof AccountingError);
    assert.match(error.message, /amount/);
    assert.match(error.message, /Nothing was overwritten/);
    return true;
  });
  const held = await db.query.accountingBills.findFirst({ where: eq(accountingBills.id, mismatchBill) });
  assert.equal(held?.status, "approved");
  assert.equal(held?.journalId, null);
  assert.equal(held?.total, "30.000");

  const firstPay = await payBill({
    billId: matching,
    amount: "10.000",
    paidOn: "2026-10-31",
    method: "cash",
    reference: "part",
    idempotencyKey: "pay-match-1",
    actorId,
  });
  const samePay = await payBill({
    billId: matching,
    amount: "10.000",
    paidOn: "2026-10-31",
    method: "cash",
    reference: "part",
    idempotencyKey: "pay-match-1",
    actorId,
  });
  assert.equal(samePay, firstPay);
  assert.equal(await paymentCount(matching), 1);
  await assert.rejects(
    () => payBill({
      billId: matching,
      amount: "5.000",
      paidOn: "2026-10-31",
      method: "cash",
      reference: "changed",
      idempotencyKey: "pay-match-1",
      actorId,
    }),
    /different company, document, direction, or amount/,
  );
  assert.equal(await paymentCount(matching), 1);
  await payBill({
    billId: matching,
    amount: "15.000",
    paidOn: "2026-10-31",
    method: "cash",
    reference: "rest",
    idempotencyKey: "pay-match-2",
    actorId,
  });
  const settled = await db.query.accountingBills.findFirst({ where: eq(accountingBills.id, matching) });
  assert.equal(settled?.status, "paid");
  await assert.rejects(
    () => payBill({
      billId: matching,
      amount: "1.000",
      paidOn: "2026-10-31",
      method: "cash",
      reference: "over",
      idempotencyKey: "pay-match-3",
      actorId,
    }),
    /no outstanding ledger balance|outstanding balance|still has a balance/,
  );
  await assert.rejects(
    () => recordPayment({
      companyId,
      direction: "payment",
      amount: "1.000",
      paidOn: "2026-10-31",
      method: "cash",
      actorId,
      operationEntryId: receipt,
      idempotencyKey: "pay-match-direct",
    }),
    /Settle this payable on supplier bill/,
  );

  const concurrentBill = await postedStandalone("40.000", "proc-concurrent-pay");
  const results = await Promise.allSettled([
    payBill({ billId: concurrentBill, amount: "40.000", paidOn: "2026-10-31", method: "cash", reference: "a", idempotencyKey: "race-a", actorId }),
    payBill({ billId: concurrentBill, amount: "40.000", paidOn: "2026-10-31", method: "cash", reference: "b", idempotencyKey: "race-b", actorId }),
  ]);
  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(results.filter((result) => result.status === "rejected").length, 1);
  assert.equal(await paymentCount(concurrentBill), 1);

  const receiptPayment = await recordPayment({
    companyId,
    direction: "receipt",
    amount: "8.000",
    paidOn: "2026-10-31",
    method: "cash",
    actorId,
    organizationId: supplierId,
    idempotencyKey: "direction-key",
  });
  const repeated = await recordPayment({
    companyId,
    direction: "receipt",
    amount: "8.000",
    paidOn: "2026-10-31",
    method: "cash",
    actorId,
    organizationId: supplierId,
    idempotencyKey: "direction-key",
  });
  assert.equal(repeated.paymentId, receiptPayment.paymentId);
  await assert.rejects(
    () => recordPayment({
      companyId: otherCompanyId,
      direction: "receipt",
      amount: "8.000",
      paidOn: "2026-10-31",
      method: "cash",
      actorId,
      organizationId: supplierId,
      idempotencyKey: "direction-key",
    }),
    /different company, document, direction, or amount/,
  );
  await assert.rejects(
    () => recordPayment({
      companyId,
      direction: "payment",
      amount: "8.000",
      paidOn: "2026-10-31",
      method: "cash",
      actorId,
      organizationId: supplierId,
      idempotencyKey: "direction-key",
    }),
    /different company, document, direction, or amount/,
  );

  const billFirstEntry = await procurement("proc-bill-first", "12.000");
  const billFirst = await draftBill(billFirstEntry, "12.000", "INV-FIRST");
  await approveBill(billFirst, actorId);
  const own = await postBill(billFirst, actorId);
  assert.match(own.note, /will not post a second payable/);
  await assert.rejects(() => postDocumentToLedger(ledgerInput(billFirstEntry, "12.000")), RecognitionOverlapError);
  assert.equal(await purchaseJournals(billFirstEntry), 1);
  assert.equal(await sourceCount(billFirstEntry, "supplier_bill"), 1);

  const raceEntry = await procurement("proc-race", "9.000");
  const raceBill = await draftBill(raceEntry, "9.000", "INV-RACE");
  await approveBill(raceBill, actorId);
  await Promise.allSettled([
    postBill(raceBill, actorId),
    postDocumentToLedger(ledgerInput(raceEntry, "9.000")),
  ]);
  assert.equal(await purchaseJournals(raceEntry), 1);
  const raced = await db.query.accountingBills.findFirst({ where: eq(accountingBills.id, raceBill) });
  assert.equal(raced?.status, "posted");

  const reversibleEntry = await procurement("proc-reverse", "7.000");
  await postDocumentToLedger(ledgerInput(reversibleEntry, "7.000"));
  const reversibleBill = await draftBill(reversibleEntry, "7.000", "INV-REV");
  await approveBill(reversibleBill, actorId);
  const reversiblePost = await postBill(reversibleBill, actorId);
  await reverseBill(reversibleBill, actorId);
  const reversedInvoice = await db.query.accountingBills.findFirst({ where: eq(accountingBills.id, reversibleBill) });
  assert.equal(reversedInvoice?.status, "reversed");
  const stillOpen = await db.query.accountingJournals.findFirst({ where: eq(accountingJournals.id, reversiblePost.journalId) });
  assert.equal(stillOpen?.reversedById, null);
  assert.equal(await purchaseJournals(reversibleEntry), 1);

  const replacement = await draftBill(reversibleEntry, "7.000", "INV-REV-2");
  await approveBill(replacement, actorId);
  await postBill(replacement, actorId);
  await reverseJournal(reversiblePost.journalId, actorId);
  const released = await db.query.accountingBills.findFirst({ where: eq(accountingBills.id, replacement) });
  assert.equal(released?.status, "approved");
  assert.equal(released?.journalId, null);
  assert.equal(await purchaseJournals(reversibleEntry), 0);
  const revised = await postBill(replacement, actorId);
  assert.notEqual(revised.journalId, reversiblePost.journalId);
  await assert.rejects(() => postDocumentToLedger(ledgerInput(reversibleEntry, "7.000")), RecognitionOverlapError);
  assert.equal(await purchaseJournals(reversibleEntry), 1);
  await reverseBill(replacement, actorId);
  assert.equal(await purchaseJournals(reversibleEntry), 0);
  await postDocumentToLedger(ledgerInput(reversibleEntry, "7.000"));
  assert.equal(await purchaseJournals(reversibleEntry), 1);

  const costEntry = "cost-linked";
  await db.insert(operationEntries).values({
    id: costEntry,
    operationId,
    entryType: "cost",
    body: "Site cost",
    createdById: actorId,
    activityDate: new Date("2026-10-31"),
    amount: "6.000",
  });
  const expenseId = await saveExpense({
    companyId,
    expenseDate: "2026-10-31",
    accountId: purchases.id,
    description: "Linked site cost",
    reference: "COST-1",
    method: "cash",
    currency: "BHD",
    exchangeRate: "1.000000",
    amount: "6.000",
    operationId,
    operationEntryId: costEntry,
    actorId,
  });
  await approveExpense(expenseId, actorId);
  await postExpense(expenseId, actorId);
  await assert.rejects(
    () => recordExpense({
      companyId,
      entryDate: "2026-10-31",
      amount: "6.000",
      expenseAccountId: purchases.id,
      method: "cash",
      description: "Same cost again",
      operationId,
      operationEntryId: costEntry,
      actorId,
    }),
    /already posted|already in the ledger|already recognised/,
  );
  assert.equal(await costJournals(costEntry), 1);
  await reverseExpense(expenseId, actorId);
  assert.equal(await costJournals(costEntry), 0);
  await recordExpense({
    companyId,
    entryDate: "2026-10-31",
    amount: "6.000",
    expenseAccountId: purchases.id,
    method: "cash",
    description: "Cost after reversal",
    operationId,
    operationEntryId: costEntry,
    actorId,
  });
  assert.equal(await costJournals(costEntry), 1);
  await assert.rejects(
    () => recordExpense({
      companyId,
      entryDate: "2026-10-31",
      amount: "6.000",
      expenseAccountId: purchases.id,
      method: "cash",
      description: "Concurrent second cost",
      operationId,
      operationEntryId: costEntry,
      actorId,
    }),
    /already/,
  );
  assert.equal(await costJournals(costEntry), 1);
});

async function procurement(id: string, amount: string) {
  await db.insert(operationEntries).values({
    id,
    operationId,
    entryType: "procurement",
    body: id,
    createdById: actorId,
    activityDate: new Date("2026-10-31"),
    documentStage: "received",
    amount,
    vendorOrganizationId: supplierId,
  });
  return id;
}

function ledgerInput(entryId: string, amount: string) {
  return {
    companyId,
    entryId,
    operationId,
    entryDate: "2026-10-31",
    amount,
    description: `Purchase ${entryId}`,
    sourceType: "procurement" as const,
    debitCode: "5600",
    creditCode: "2000",
    organizationId: supplierId,
    contactId: null,
    actorId,
    guard: async (tx: Parameters<NonNullable<Parameters<typeof postDocumentToLedger>[0]["guard"]>>[0]) => {
      await assertProcurementMayPost({ companyId, entryId, tx });
    },
  };
}

async function draftBill(entryId: string, amount: string, reference: string) {
  const account = await db.query.accountingAccounts.findFirst({
    where: sql`${accountingAccounts.companyId} = ${companyId} AND ${accountingAccounts.code} = '5600'`,
  });
  if (!account) throw new Error("missing purchases account");
  return saveBill({
    companyId,
    supplierOrganizationId: supplierId,
    billDate: "2026-10-31",
    dueDate: "2026-11-30",
    currency: "BHD",
    exchangeRate: "1.000000",
    reference,
    notes: "",
    operationId,
    procurementEntryId: entryId,
    lines: [{
      description: reference,
      quantity: "1.000",
      unitAmount: amount,
      discount: "0.000",
      expenseAccountId: account.id,
    }],
    actorId,
  });
}

async function postedStandalone(amount: string, entryId: string) {
  await procurement(entryId, amount);
  const billId = await draftBill(entryId, amount, entryId);
  await approveBill(billId, actorId);
  await postBill(billId, actorId);
  return billId;
}

async function purchaseJournals(entryId: string) {
  const rows = await db.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n
    FROM accounting_journals
    WHERE operation_entry_id = ${entryId}
      AND status = 'posted'
      AND reversed_by_id IS NULL
      AND reversal_of_id IS NULL
      AND source_type IN ('procurement', 'supplier_bill')
  `);
  return countOf(rows);
}

async function sourceCount(entryId: string, sourceType: string) {
  const rows = await db.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n
    FROM accounting_journals
    WHERE operation_entry_id = ${entryId}
      AND source_type = ${sourceType}
      AND status = 'posted'
      AND reversed_by_id IS NULL
      AND reversal_of_id IS NULL
  `);
  return countOf(rows);
}

async function costJournals(entryId: string) {
  const rows = await db.execute<{ n: number }>(sql`
    SELECT count(*)::int AS n
    FROM accounting_journals
    WHERE operation_entry_id = ${entryId}
      AND status = 'posted'
      AND reversed_by_id IS NULL
      AND reversal_of_id IS NULL
      AND source_type IN ('operation_cost', 'expense')
  `);
  return countOf(rows);
}

function countOf(rows: unknown) {
  const list = Array.isArray(rows)
    ? rows as Array<{ n?: number }>
    : rows && typeof rows === "object" && "rows" in rows
      ? (rows as { rows: Array<{ n?: number }> }).rows
      : [];
  return Number(list[0]?.n ?? 0);
}

async function paymentCount(billId: string) {
  const rows = await db.select().from(accountingPayments).where(eq(accountingPayments.billId, billId));
  return rows.length;
}
