import { NextResponse } from "next/server";
import { z } from "zod";

import { accountingError, requireAccounting } from "@/lib/accounting/http";
import {
  approveBill,
  approveExpense,
  completeReconciliation,
  importStatement,
  fileVatReturn,
  lockVatReturn,
  matchReconciliation,
  openReconciliation,
  payBill,
  postBill,
  postExpense,
  prepareVatReturn,
  recordBankMovement,
  recordVatFiling,
  reopenReconciliation,
  reverseBill,
  reverseExpense,
  reviewVatReturn,
  saveBill,
  saveCompanySettings,
  saveCreditNote,
  saveExchangeRate,
  saveExpense,
} from "@/lib/accounting/phase2";

export const runtime = "nodejs";

const postActions = new Set([
  "approveBill",
  "postBill",
  "reverseBill",
  "approveExpense",
  "postExpense",
  "reverseExpense",
  "completeReconciliation",
  "reopenReconciliation",
  "reviewVat",
  "lockVat",
  "fileVat",
  "recordFiling",
  "bankMovement",
  "creditBill",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string; companyId?: string } | null;
  const action = body?.action ?? "";
  const kind =
    action === "saveSettings"
      ? "settings"
      : action === "payBill"
        ? "pay"
        : postActions.has(action)
          ? "post"
          : "draft";
  const access = await requireAccounting(kind);
  if ("error" in access && access.error) return access.error;
  const actorId = access.session.userId;
  if (body && typeof body.companyId === "string") {
    const { assertCompanyAllowed } = await import("@/lib/accounting/phase3");
    await assertCompanyAllowed(access.session.userId, access.session.role, body.companyId);
  }

  try {
    if (action === "saveBill") {
      const input = billSchema.parse(body);
      const id = await saveBill({ ...input, actorId });
      return NextResponse.json({ id });
    }
    if (action === "approveBill") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      await approveBill(input.id, actorId);
      return NextResponse.json({ ok: true });
    }
    if (action === "postBill") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      const posted = await postBill(input.id, actorId);
      return NextResponse.json({ id: posted.journalId, note: posted.note });
    }
    if (action === "reverseBill") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      await reverseBill(input.id, actorId);
      return NextResponse.json({ ok: true });
    }
    if (action === "creditBill") {
      const input = creditSchema.parse(body);
      const id = await saveCreditNote({ ...input, actorId });
      const posted = await postBill(id, actorId);
      return NextResponse.json({ id, journalId: posted.journalId, note: posted.note });
    }
    if (action === "payBill") {
      const input = paySchema.parse(body);
      const id = await payBill({ ...input, actorId });
      return NextResponse.json({ id });
    }
    if (action === "saveExpense") {
      const input = expenseSchema.parse(body);
      const id = await saveExpense({ ...input, actorId });
      return NextResponse.json({ id });
    }
    if (action === "approveExpense") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      await approveExpense(input.id, actorId);
      return NextResponse.json({ ok: true });
    }
    if (action === "postExpense") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      const journalId = await postExpense(input.id, actorId);
      return NextResponse.json({ id: journalId });
    }
    if (action === "reverseExpense") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      await reverseExpense(input.id, actorId);
      return NextResponse.json({ ok: true });
    }
    if (action === "importStatement") {
      const input = statementSchema.parse(body);
      const result = await importStatement({ ...input, actorId });
      return NextResponse.json(result);
    }
    if (action === "openReconciliation") {
      const input = reconciliationSchema.parse(body);
      const id = await openReconciliation({ ...input, actorId });
      return NextResponse.json({ id });
    }
    if (action === "matchReconciliation") {
      const input = z
        .object({
          reconciliationId: z.string().min(1),
          statementLineIds: z.array(z.string()).min(1),
          journalLineIds: z.array(z.string()).min(1),
        })
        .parse(body);
      await matchReconciliation({ ...input, actorId });
      return NextResponse.json({ ok: true });
    }
    if (action === "completeReconciliation") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      await completeReconciliation(input.id, actorId);
      return NextResponse.json({ ok: true });
    }
    if (action === "reopenReconciliation") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      await reopenReconciliation(input.id, actorId);
      return NextResponse.json({ ok: true });
    }
    if (action === "bankMovement") {
      const input = movementSchema.parse(body);
      const id = await recordBankMovement({ ...input, actorId });
      return NextResponse.json({ id });
    }
    if (action === "saveSettings") {
      const input = settingsSchema.parse(body);
      await saveCompanySettings({ ...input, actorId });
      return NextResponse.json({ ok: true });
    }
    if (action === "saveRate") {
      const input = z
        .object({
          companyId: z.string().min(1),
          currency: z.string().min(3),
          rateToBhd: z.string().min(1),
          effectiveOn: z.string().min(1),
        })
        .parse(body);
      await saveExchangeRate({ ...input, actorId });
      return NextResponse.json({ ok: true });
    }
    if (action === "prepareVat") {
      const input = z
        .object({
          companyId: z.string().min(1),
          periodStart: z.string().min(1),
          periodEnd: z.string().min(1),
        })
        .parse(body);
      const id = await prepareVatReturn({ ...input, actorId });
      return NextResponse.json({ id });
    }
    if (action === "reviewVat") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      await reviewVatReturn(input.id, actorId);
      return NextResponse.json({ ok: true });
    }
    if (action === "lockVat") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      await lockVatReturn(input.id, actorId);
      return NextResponse.json({ ok: true });
    }
    if (action === "fileVat") {
      const input = z.object({ id: z.string().min(1), paymentStatus: z.string() }).parse(body);
      const filed = await fileVatReturn(input.id, actorId, input.paymentStatus);
      return NextResponse.json(filed);
    }
    if (action === "recordFiling") {
      const input = z
        .object({
          id: z.string().min(1),
          filingReference: z.string(),
          paymentStatus: z.string(),
        })
        .parse(body);
      await recordVatFiling({ ...input, actorId });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return accountingError(error);
  }
}

const lineSchema = z.object({
  description: z.string(),
  quantity: z.string().min(1),
  unitAmount: z.string().min(1),
  discount: z.string().optional().default("0"),
  expenseAccountId: z.string().min(1),
  vatCodeId: z.string().nullable().optional(),
});

const billSchema = z.object({
  billId: z.string().nullable().optional(),
  companyId: z.string().min(1),
  supplierOrganizationId: z.string().min(1),
  billDate: z.string().min(1),
  dueDate: z.string().min(1),
  currency: z.string().min(3),
  exchangeRate: z.string().optional().default("1"),
  reference: z.string().optional().default(""),
  notes: z.string().optional().default(""),
  operationId: z.string().nullable().optional(),
  procurementEntryId: z.string().nullable().optional(),
  lines: z.array(lineSchema).min(1),
});

const creditSchema = z.object({
  billId: z.string().min(1),
  billDate: z.string().min(1),
  notes: z.string().optional().default(""),
  lines: z.array(lineSchema).min(1),
});

const paySchema = z.object({
  billId: z.string().min(1),
  amount: z.string().min(1),
  paidOn: z.string().min(1),
  method: z.enum(["cash", "bank", "card"]),
  bankAccountId: z.string().nullable().optional(),
  reference: z.string().optional().default(""),
  idempotencyKey: z.string().nullable().optional(),
});

const expenseSchema = z.object({
  expenseId: z.string().nullable().optional(),
  companyId: z.string().min(1),
  expenseDate: z.string().min(1),
  accountId: z.string().min(1),
  organizationId: z.string().nullable().optional(),
  operationId: z.string().nullable().optional(),
  operationEntryId: z.string().nullable().optional(),
  description: z.string().min(1),
  reference: z.string().optional().default(""),
  method: z.enum(["cash", "bank", "card"]),
  bankAccountId: z.string().nullable().optional(),
  vatCodeId: z.string().nullable().optional(),
  currency: z.string().min(3),
  exchangeRate: z.string().optional().default("1"),
  amount: z.string().min(1),
});

const statementSchema = z.object({
  companyId: z.string().min(1),
  bankAccountId: z.string().min(1),
  fileName: z.string().optional().default("statement.csv"),
  statementDate: z.string().min(1),
  csv: z.string().optional().default(""),
  workbookBase64: z.string().optional(),
}).refine((input) => input.csv.trim().length > 0 || (input.workbookBase64 ?? "").length > 0, {
  message: "Choose a CSV or XLSX statement",
});

const reconciliationSchema = z.object({
  companyId: z.string().min(1),
  bankAccountId: z.string().min(1),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  statementBalance: z.string().min(1),
});

const movementSchema = z.object({
  companyId: z.string().min(1),
  bankAccountId: z.string().min(1),
  entryDate: z.string().min(1),
  amount: z.string().min(1),
  kind: z.enum(["deposit", "withdrawal", "charge", "interest"]),
  offsetAccountId: z.string().min(1),
  description: z.string().optional().default(""),
  settlementPaymentId: z.string().nullable().optional(),
});

const settingsSchema = z.object({
  companyId: z.string().min(1),
  legalName: z.string().optional().default(""),
  address: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z.string().optional().default(""),
  crNumber: z.string().optional().default(""),
  vatRegistered: z.boolean(),
  vatNumber: z.string().optional().default(""),
  vatEffectiveFrom: z.string().optional().default(""),
  filingFrequency: z.string().optional().default("quarterly"),
});
