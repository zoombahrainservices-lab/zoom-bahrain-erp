import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  accountingAccessGrants,
  accountingAccounts,
  accountingApprovalEvents,
  accountingApprovalPolicies,
  accountingBills,
  accountingEmails,
  accountingExceptions,
  accountingIntercompany,
  accountingItems,
  accountingJournals,
  accountingLocations,
  accountingNotifications,
  accountingNotificationPreferences,
  accountingPayrollRuns,
  accountingReminderRules,
  accountingStockMoves,
  accountingWarehouses,
  accountingVatCodes,
  operationDocumentLines,
  operationEntries,
  users,
} from "@/db/schema";
import { divisions } from "@/lib/divisions";

import { ensureCompanyBooks, postJournalWithin, type AccountingTx, type JournalLineInput } from "./engine";
import { statutoryPayroll, type PayrollScheme } from "./statutory";
import { AccountingError, filsToAmount, toFils } from "./money";
import {
  procurementPostDecision,
  RecognitionOverlapError,
  type LinkedBillState,
} from "./overlap";
import {
  canApproveOwn,
  daysBetween,
  defaultReminderOffsets,
  intercompanySides,
  issueCost,
  matchingReminder,
  movingAverage,
  priceSalesLine,
  stockPostsJournal,
} from "./phase3-rules";

export async function recordException(input: {
  companyId: string;
  kind: string;
  sourceType: string;
  sourceId: string;
  detail: string;
}) {
  await db.insert(accountingExceptions).values({ id: crypto.randomUUID(), ...input, status: "open" });
}

export async function assertBillMayLinkProcurement(input: {
  companyId: string;
  procurementEntryId?: string | null;
}) {
  if (!input.procurementEntryId) return;
  const entry = await db.query.operationEntries.findFirst({
    where: eq(operationEntries.id, input.procurementEntryId),
    with: { operation: { columns: { divisionId: true } } },
  });
  if (!entry || entry.entryType !== "procurement" || entry.operation?.divisionId !== input.companyId) {
    throw new AccountingError(
      "Choose a procurement document on this company. The bill was not saved.",
    );
  }
}

export async function assertProcurementMayPost(input: {
  companyId: string;
  entryId: string;
  tx?: AccountingTx;
}) {
  const query = input.tx ?? db;
  const bill = await query.query.accountingBills.findFirst({
    where: and(
      eq(accountingBills.companyId, input.companyId),
      eq(accountingBills.procurementEntryId, input.entryId),
      ne(accountingBills.status, "reversed"),
    ),
  });
  const state = (bill?.status ?? "none") as LinkedBillState;
  const decision = procurementPostDecision({
    linkedBillState: state,
    linkedBillHasOpenJournal: Boolean(bill?.journalId && bill.status !== "reversed"),
    billNumber: bill?.billNumber,
  });
  if (!decision.post) {
    throw new RecognitionOverlapError(decision.message, input.companyId, input.entryId);
  }
}

export async function queueEmail(input: {
  companyId: string;
  template: string;
  reminderKey: string;
  entityType: string;
  entityId: string;
  toAddress: string;
  subject: string;
  body: string;
  actorId?: string | null;
}) {
  const existing = await db.query.accountingEmails.findFirst({
    where: and(
      eq(accountingEmails.entityType, input.entityType),
      eq(accountingEmails.entityId, input.entityId),
      eq(accountingEmails.template, input.template),
      eq(accountingEmails.reminderKey, input.reminderKey),
    ),
  });
  if (existing) return { id: existing.id, created: false };
  const id = crypto.randomUUID();
  await db.insert(accountingEmails).values({
    id,
    companyId: input.companyId,
    template: input.template,
    reminderKey: input.reminderKey,
    entityType: input.entityType,
    entityId: input.entityId,
    toAddress: input.toAddress,
    subject: input.subject,
    body: input.body,
    status: "queued",
    createdById: input.actorId ?? null,
  });
  return { id, created: true };
}

export async function deliverEmail(id: string) {
  const message = await db.query.accountingEmails.findFirst({ where: eq(accountingEmails.id, id) });
  if (!message) throw new AccountingError("Email not found");
  if (message.status === "sent") return "sent";
  const attempts = message.attempts + 1;
  if (process.env.ZOOM_EMAIL_SUPPRESS === "1") {
    await db.update(accountingEmails).set({
      status: "suppressed",
      attempts,
      lastError: "Suppressed. No email was sent.",
    }).where(eq(accountingEmails.id, id));
    return "suppressed";
  }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.ACCOUNTING_EMAIL_FROM;
  if (!key || !from) {
    await db.update(accountingEmails).set({
      status: "not_configured",
      attempts,
      lastError: "No authorised email provider is configured. The message was not sent.",
    }).where(eq(accountingEmails.id, id));
    return "not_configured";
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [message.toAddress], subject: message.subject, text: message.body }),
  });
  const payload = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
  if (!response.ok || !payload.id) {
    await db.update(accountingEmails).set({
      status: "failed",
      attempts,
      lastError: payload.message || "The provider did not accept the message",
    }).where(eq(accountingEmails.id, id));
    return "failed";
  }
  await db.update(accountingEmails).set({
    status: "sent",
    providerId: payload.id,
    attempts,
    lastError: "",
  }).where(eq(accountingEmails.id, id));
  return "sent";
}

export async function notifyAdmins(input: {
  companyId: string;
  kind: string;
  title: string;
  body: string;
  href: string;
}) {
  const staff = await db.query.users.findMany({
    where: eq(users.role, "admin"),
    columns: { id: true },
  });
  if (staff.length === 0) return;
  await db.insert(accountingNotifications).values(
    staff.map((user) => ({
      id: crypto.randomUUID(),
      companyId: input.companyId,
      userId: user.id,
      kind: input.kind,
      title: input.title,
      body: input.body,
      href: input.href,
    })),
  );
}

export async function runDueReminders(today: string, deliver = true) {
  const rules = await db.query.accountingReminderRules.findMany({
    where: eq(accountingReminderRules.isActive, 1),
  });
  const offsetsByCompany = new Map<string, number[]>();
  for (const rule of rules) {
    const list = offsetsByCompany.get(rule.companyId) ?? [];
    list.push(rule.daysOffset);
    offsetsByCompany.set(rule.companyId, list);
  }
  const invoices = await db.query.operationEntries.findMany({
    where: eq(operationEntries.entryType, "invoice"),
    with: { operation: { with: { organization: true } } },
    limit: 300,
  });
  let queued = 0;
  for (const invoice of invoices) {
    if (!invoice.dueOn || !invoice.operation) continue;
    if (invoice.documentStage !== "sent" && invoice.documentStage !== "overdue") continue;
    const companyId = invoice.operation.divisionId;
    const key = matchingReminder(
      daysBetween(invoice.dueOn, today),
      offsetsByCompany.get(companyId) ?? defaultReminderOffsets(),
    );
    if (!key) continue;
    const email = invoice.operation.organization?.email;
    if (!email) continue;
    const row = await queueEmail({
      companyId,
      template: "payment_reminder",
      reminderKey: key,
      entityType: "invoice",
      entityId: invoice.id,
      toAddress: email,
      subject: `Payment reminder ${invoice.operation.operationCode}`,
      body: `Invoice ${invoice.operation.operationCode} is due ${invoice.dueOn}. Zoom records this reminder. It is sent only when an email provider accepts it.`,
    });
    if (row.created) {
      if (deliver) await deliverEmail(row.id);
      queued += 1;
    }
  }
  await db.update(operationEntries).set({ documentStage: "overdue" }).where(and(
    eq(operationEntries.entryType, "invoice"),
    eq(operationEntries.documentStage, "sent"),
    sql`${operationEntries.dueOn} IS NOT NULL AND ${operationEntries.dueOn} < ${today}::date`,
  ));
  return { queued };
}

export async function postIntercompany(input: {
  fromCompanyId: string;
  toCompanyId: string;
  kind: "expense" | "loan" | "settlement";
  amount: string;
  entryDate: string;
  description: string;
  expenseAccountId?: string | null;
  actorId: string;
}) {
  if (input.fromCompanyId === input.toCompanyId) throw new AccountingError("Choose two different companies");
  const amount = toFils(input.amount);
  if (amount <= 0n) throw new AccountingError("Enter an amount greater than zero");
  await ensureCompanyBooks(input.fromCompanyId);
  await ensureCompanyBooks(input.toCompanyId);
  const sides = intercompanySides(input.kind);
  const text = filsToAmount(amount);
  return db.transaction(async (tx) => {
    const ref = crypto.randomUUID();
    const fromJournal = await postJournalWithin(tx, {
      companyId: input.fromCompanyId,
      entryDate: input.entryDate,
      description: input.description,
      sourceType: "intercompany",
      sourceId: `${ref}:from`,
      status: "posted",
      actorId: input.actorId,
      lines: await slotLines(tx, input.fromCompanyId, sides.fromDebit, sides.fromCredit, text, input.expenseAccountId),
    });
    const toJournal = await postJournalWithin(tx, {
      companyId: input.toCompanyId,
      entryDate: input.entryDate,
      description: input.description,
      sourceType: "intercompany",
      sourceId: `${ref}:to`,
      status: "posted",
      actorId: input.actorId,
      lines: await slotLines(tx, input.toCompanyId, sides.toDebit, sides.toCredit, text, input.expenseAccountId),
    });
    await tx.insert(accountingIntercompany).values({
      id: ref,
      groupRef: ref,
      fromCompanyId: input.fromCompanyId,
      toCompanyId: input.toCompanyId,
      kind: input.kind,
      amount: text,
      entryDate: input.entryDate,
      description: input.description.trim(),
      fromJournalId: fromJournal.id,
      toJournalId: toJournal.id,
      createdById: input.actorId,
    });
    return ref;
  });
}

async function slotLines(
  tx: AccountingTx,
  companyId: string,
  debit: string,
  credit: string,
  amount: string,
  expenseAccountId?: string | null,
) {
  const lines: JournalLineInput[] = [
    { accountId: await slotAccount(tx, companyId, debit, expenseAccountId), debit: amount, credit: "0" },
    { accountId: await slotAccount(tx, companyId, credit, expenseAccountId), debit: "0", credit: amount },
  ];
  return lines;
}

async function slotAccount(tx: AccountingTx, companyId: string, slot: string, expenseAccountId?: string | null) {
  if (slot === "expense") {
    if (!expenseAccountId) throw new AccountingError("Choose the expense account for the company that bears the cost");
    return expenseAccountId;
  }
  const code = slot === "bank" ? "1010" : slot === "due_from" ? "1300" : "2400";
  return accountByCode(tx, companyId, code);
}

async function accountByCode(tx: AccountingTx, companyId: string, code: string) {
  const account = await tx.query.accountingAccounts.findFirst({
    where: and(eq(accountingAccounts.companyId, companyId), eq(accountingAccounts.code, code)),
  });
  if (!account) throw new AccountingError(`Account ${code} is missing for this company`);
  return account.id;
}

export async function moveStock(input: {
  companyId: string;
  sku: string;
  name: string;
  ownership: "company" | "customer";
  warehouseName: string;
  locationName: string;
  quantity: string;
  unitCost: string;
  kind: "receipt" | "sale" | "issue" | "adjustment" | "transfer" | "return";
  movedOn: string;
  actorId: string;
}) {
  await ensureCompanyBooks(input.companyId);
  const qty = toFils(input.quantity);
  const cost = toFils(input.unitCost || "0");
  if (qty <= 0n) throw new AccountingError("Enter a quantity greater than zero");
  return db.transaction(async (tx) => {
    let item = await tx.query.accountingItems.findFirst({
      where: and(eq(accountingItems.companyId, input.companyId), eq(accountingItems.sku, input.sku)),
    });
    if (!item) {
      const id = crypto.randomUUID();
      await tx.insert(accountingItems).values({
        id,
        companyId: input.companyId,
        sku: input.sku,
        name: input.name || input.sku,
        ownership: input.ownership,
        quantity: "0.000",
        averageCost: "0.000",
      });
      item = await tx.query.accountingItems.findFirst({ where: eq(accountingItems.id, id) });
    }
    if (!item) throw new AccountingError("Item was not saved");
    const onHand = toFils(item.quantity);
    const average = toFils(item.averageCost);
    const inbound = input.kind === "receipt" || input.kind === "return";
    const outbound = input.kind === "sale" || input.kind === "issue" || input.kind === "adjustment";
    const valued = inbound
      ? movingAverage(onHand, average, qty, item.ownership === "company" ? cost : 0n)
      : outbound
        ? { quantity: onHand - qty, average }
        : { quantity: onHand, average };
    if (valued.quantity < 0n && item.allowNegative !== 1) {
      throw new AccountingError("This would make stock negative. Negative inventory is not enabled.");
    }
    let warehouse = await tx.query.accountingWarehouses.findFirst({
      where: and(eq(accountingWarehouses.companyId, input.companyId), eq(accountingWarehouses.name, input.warehouseName)),
    });
    if (!warehouse) {
      const id = crypto.randomUUID();
      await tx.insert(accountingWarehouses).values({ id, companyId: input.companyId, name: input.warehouseName });
      warehouse = await tx.query.accountingWarehouses.findFirst({ where: eq(accountingWarehouses.id, id) });
    }
    if (!warehouse) throw new AccountingError("Warehouse was not saved");
    const locationName = input.locationName || "Main";
    let location = await tx.query.accountingLocations.findFirst({
      where: and(eq(accountingLocations.warehouseId, warehouse.id), eq(accountingLocations.name, locationName)),
    });
    if (!location) {
      const id = crypto.randomUUID();
      await tx.insert(accountingLocations).values({
        id,
        warehouseId: warehouse.id,
        name: locationName,
      });
      location = await tx.query.accountingLocations.findFirst({ where: eq(accountingLocations.id, id) });
    }
    if (!location) throw new AccountingError("Storage location was not saved");
    const locationId = location.id;
    let journalId: string | null = null;
    if (stockPostsJournal(item.ownership, input.kind)) {
      const value = input.kind === "receipt" ? (qty * cost) / 1000n : issueCost(qty, average);
      const amount = filsToAmount(value);
      const inventory = await accountByCode(tx, input.companyId, "1200");
      const other = await accountByCode(tx, input.companyId, input.kind === "receipt" ? "2000" : "5610");
      const lines = input.kind === "receipt"
        ? [
            { accountId: inventory, debit: amount, credit: "0", description: input.sku },
            { accountId: other, debit: "0", credit: amount, description: input.sku },
          ]
        : [
            { accountId: other, debit: amount, credit: "0", description: input.sku },
            { accountId: inventory, debit: "0", credit: amount, description: input.sku },
          ];
      const journal = await postJournalWithin(tx, {
        companyId: input.companyId,
        entryDate: input.movedOn,
        description: `${input.kind} ${input.sku}`,
        sourceType: "inventory",
        sourceId: crypto.randomUUID(),
        status: "posted",
        actorId: input.actorId,
        lines,
      });
      journalId = journal.id;
    }
    await tx.update(accountingItems).set({
      quantity: filsToAmount(valued.quantity),
      averageCost: filsToAmount(item.ownership === "company" ? valued.average : 0n),
    }).where(eq(accountingItems.id, item.id));
    const moveId = crypto.randomUUID();
    await tx.insert(accountingStockMoves).values({
      id: moveId,
      companyId: input.companyId,
      itemId: item.id,
      warehouseId: warehouse.id,
      locationId,
      kind: input.kind,
      quantity: filsToAmount(qty),
      unitCost: filsToAmount(cost),
      journalId,
      movedOn: input.movedOn,
      createdById: input.actorId,
    });
    return { moveId, journalId };
  });
}

export async function postPayroll(input: {
  companyId: string;
  periodLabel: string;
  scheme: PayrollScheme;
  wage: string;
  yearsOfService: string;
  otherDeductions: string;
  entryDate: string;
  actorId: string;
}) {
  const amounts = (() => {
    try {
      return statutoryPayroll({
        scheme: input.scheme,
        wage: input.wage,
        yearsOfService: input.yearsOfService,
        otherDeductions: input.otherDeductions,
        entryDate: input.entryDate,
      });
    } catch (error) {
      throw new AccountingError(error instanceof Error ? error.message : "Payroll does not balance");
    }
  })();
  await ensureCompanyBooks(input.companyId);
  return db.transaction(async (tx) => {
    const id = crypto.randomUUID();
    const lines: JournalLineInput[] = [
      { accountId: await accountByCode(tx, input.companyId, "5000"), debit: filsToAmount(amounts.expense), credit: "0" },
    ];
    if (amounts.net + amounts.otherDeductions > 0n) {
      lines.push({
        accountId: await accountByCode(tx, input.companyId, "2410"),
        debit: "0",
        credit: filsToAmount(amounts.net + amounts.otherDeductions),
      });
    }
    if (amounts.statutoryPayable > 0n) {
      lines.push({
        accountId: await accountByCode(tx, input.companyId, "2420"),
        debit: "0",
        credit: filsToAmount(amounts.statutoryPayable),
      });
    }
    const journal = await postJournalWithin(tx, {
      companyId: input.companyId,
      entryDate: input.entryDate,
      description: `Payroll ${input.periodLabel}`,
      sourceType: "payroll",
      sourceId: id,
      status: "posted",
      actorId: input.actorId,
      lines,
    });
    await tx.insert(accountingPayrollRuns).values({
      id,
      companyId: input.companyId,
      periodLabel: input.periodLabel,
      status: "posted",
      gross: filsToAmount(amounts.wage),
      deductions: filsToAmount(amounts.otherDeductions),
      statutory: filsToAmount(amounts.statutoryPayable),
      netPay: filsToAmount(amounts.net),
      journalId: journal.id,
      createdById: input.actorId,
    });
    return id;
  });
}

export async function payPayroll(input: { id: string; paidOn: string; actorId: string }) {
  const run = await db.query.accountingPayrollRuns.findFirst({ where: eq(accountingPayrollRuns.id, input.id) });
  if (!run || run.status !== "posted" || run.paymentJournalId) {
    throw new AccountingError("Pay a posted payroll run that has not already been paid");
  }
  return db.transaction(async (tx) => {
    const journal = await postJournalWithin(tx, {
      companyId: run.companyId,
      entryDate: input.paidOn,
      description: `Payroll payment ${run.periodLabel}`,
      sourceType: "payroll_payment",
      sourceId: run.id,
      status: "posted",
      actorId: input.actorId,
      lines: [
        { accountId: await accountByCode(tx, run.companyId, "2410"), debit: run.netPay, credit: "0" },
        { accountId: await accountByCode(tx, run.companyId, "1010"), debit: "0", credit: run.netPay },
      ],
    });
    await tx.update(accountingPayrollRuns).set({ status: "paid", paymentJournalId: journal.id }).where(eq(accountingPayrollRuns.id, run.id));
    return journal.id;
  });
}

export async function allowedCompanyIds(userId: string, role: string) {
  const grants = await db.query.accountingAccessGrants.findMany({
    where: eq(accountingAccessGrants.userId, userId),
  });
  if (grants.length === 0) return role === "admin" || role === "employee" ? ("all" as const) : [];
  return grants.map((grant) => grant.companyId);
}

export async function assertCompanyAllowed(userId: string, role: string, companyId: string) {
  const allowed = await allowedCompanyIds(userId, role);
  if (allowed === "all" || allowed.includes(companyId)) return;
  throw new AccountingError("You are not authorised for that company");
}

export async function enforceApproval(input: {
  companyId: string;
  documentType: string;
  entityId: string;
  actorId: string;
  creatorId: string;
  amount: string;
  stage: string;
}) {
  const policy = await db.query.accountingApprovalPolicies.findFirst({
    where: and(
      eq(accountingApprovalPolicies.companyId, input.companyId),
      eq(accountingApprovalPolicies.documentType, input.documentType),
    ),
  });
  if (!policy || toFils(input.amount) < toFils(policy.threshold)) return;
  if (!canApproveOwn(input.actorId, input.creatorId, policy.blockSelf === 1)) {
    throw new AccountingError("You cannot approve your own transaction under this company's policy");
  }
  await db.insert(accountingApprovalEvents).values({
    id: crypto.randomUUID(),
    companyId: input.companyId,
    entityType: input.documentType,
    entityId: input.entityId,
    stage: input.stage,
    actorId: input.actorId,
  });
}

export async function grantAccess(input: { userId: string; companyId: string; roleKey: string }) {
  if (!divisions.some((division) => division.id === input.companyId)) {
    throw new AccountingError("Choose a Zoom company");
  }
  await db.insert(accountingAccessGrants).values({ id: crypto.randomUUID(), ...input }).onConflictDoUpdate({
    target: [accountingAccessGrants.userId, accountingAccessGrants.companyId],
    set: { roleKey: input.roleKey },
  });
}

export async function savePreference(userId: string, emailEnabled: boolean) {
  await db.insert(accountingNotificationPreferences).values({
    userId,
    emailEnabled: emailEnabled ? 1 : 0,
    inAppEnabled: 1,
  }).onConflictDoUpdate({
    target: accountingNotificationPreferences.userId,
    set: { emailEnabled: emailEnabled ? 1 : 0 },
  });
}

export async function postTaxedInvoice(input: {
  companyId: string;
  entryId: string;
  operationId: string;
  entryDate: string;
  description: string;
  organizationId: string | null;
  contactId: string | null;
  actorId: string;
  creditNote?: boolean;
}) {
  await ensureCompanyBooks(input.companyId);
  const lines = await db.query.operationDocumentLines.findMany({
    where: eq(operationDocumentLines.entryId, input.entryId),
  });
  return db.transaction(async (tx) => {
    const journalLines: JournalLineInput[] = [];
    let receivable = 0n;
    let revenue = 0n;
    let vat = 0n;
    for (const line of lines) {
      const code = line.vatCodeId
        ? await tx.query.accountingVatCodes.findFirst({
            where: and(eq(accountingVatCodes.id, line.vatCodeId), eq(accountingVatCodes.companyId, input.companyId)),
          })
        : null;
      const priced = priceSalesLine({
        description: line.description,
        quantity: line.quantity,
        unitAmount: line.unitAmount,
        discount: line.discount ?? "0",
        vat: code ? { id: code.id, rate: code.rate, treatment: code.treatment } : null,
      });
      receivable += priced.total;
      revenue += priced.net;
      vat += priced.vat;
    }
    if (receivable <= 0n) throw new AccountingError("The invoice total must be greater than zero");
    const debitReceivable = !input.creditNote;
    const push = (accountId: string, amount: bigint, debit: boolean) => {
      if (amount === 0n) return;
      journalLines.push({
        accountId,
        debit: debit ? filsToAmount(amount) : "0",
        credit: debit ? "0" : filsToAmount(amount),
        organizationId: input.organizationId,
        contactId: input.contactId,
      });
    };
    push(await accountByCode(tx, input.companyId, "1100"), receivable, debitReceivable);
    push(await accountByCode(tx, input.companyId, "4000"), revenue, !debitReceivable);
    push(await accountByCode(tx, input.companyId, "2100"), vat, !debitReceivable);
    return postJournalWithin(tx, {
      companyId: input.companyId,
      entryDate: input.entryDate,
      description: input.description,
      sourceType: input.creditNote ? "customer_credit" : "invoice",
      sourceId: input.entryId,
      status: "posted",
      actorId: input.actorId,
      operationId: input.operationId,
      operationEntryId: input.entryId,
      organizationId: input.organizationId,
      contactId: input.contactId,
      lines: journalLines,
    });
  });
}

export async function postCustomerCredit(input: { entryId: string; entryDate: string; actorId: string }) {
  const entry = await db.query.operationEntries.findFirst({
    where: eq(operationEntries.id, input.entryId),
    with: { operation: true },
  });
  if (!entry?.operation || entry.entryType !== "invoice") {
    throw new AccountingError("Choose a sales invoice");
  }
  if (entry.taxVersion !== 1) {
    throw new AccountingError(
      "This invoice was posted before line VAT. It is left unchanged. Reverse its journal if the old posting must be undone.",
    );
  }
  return postTaxedInvoice({
    companyId: entry.operation.divisionId,
    entryId: entry.id,
    operationId: entry.operation.id,
    entryDate: input.entryDate,
    description: `Credit note for ${entry.operation.operationCode}`,
    organizationId: entry.operation.organizationId,
    contactId: entry.operation.contactId,
    actorId: input.actorId,
    creditNote: true,
  });
}

export async function saveReminderOffset(companyId: string, daysOffset: number) {
  if (!Number.isInteger(daysOffset) || daysOffset < -90 || daysOffset > 180) {
    throw new AccountingError("Use a reminder offset between 90 days before and 180 days after the due date");
  }
  await db.insert(accountingReminderRules).values({
    id: crypto.randomUUID(),
    companyId,
    daysOffset,
    isActive: 1,
  });
}
