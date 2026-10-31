import { NextResponse } from "next/server";
import { z } from "zod";

import { accountingError, requireAccounting } from "@/lib/accounting/http";
import {
  assertCompanyAllowed,
  deliverEmail,
  grantAccess,
  payPayroll,
  postCustomerCredit,
  postIntercompany,
  postPayroll,
  runDueReminders,
  savePreference,
  saveReminderOffset,
} from "@/lib/accounting/phase3";
import { payrollSchemes } from "@/lib/accounting/statutory";
import { todayInputDate } from "@/lib/utils";

export const runtime = "nodejs";

const postActions = new Set([
  "runReminders",
  "deliverEmail",
  "intercompany",
  "stock",
  "payroll",
  "payPayroll",
  "grant",
  "creditInvoice",
]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { action?: string; companyId?: string } | null;
  const action = body?.action ?? "";
  const access = await requireAccounting(postActions.has(action) ? "post" : "draft");
  if ("error" in access && access.error) return access.error;
  const actorId = access.session.userId;
  try {
    if (body?.companyId) {
      await assertCompanyAllowed(access.session.userId, access.session.role, body.companyId);
    }
    if (action === "runReminders") {
      const input = z.object({ deliver: z.boolean().optional() }).parse(body);
      const result = await runDueReminders(todayInputDate(), input.deliver === true);
      return NextResponse.json({
        ...result,
        note: "A queued message is not a delivered email. Delivery is attempted only when you ask for it and a provider is configured.",
      });
    }
    if (action === "deliverEmail") {
      const input = z.object({ id: z.string().min(1) }).parse(body);
      const status = await deliverEmail(input.id);
      return NextResponse.json({ status });
    }
    if (action === "reminder") {
      const input = z.object({ companyId: z.string().min(1), daysOffset: z.number().int() }).parse(body);
      await saveReminderOffset(input.companyId, input.daysOffset);
      return NextResponse.json({ ok: true });
    }
    if (action === "intercompany") {
      const input = z.object({
        fromCompanyId: z.string().min(1),
        toCompanyId: z.string().min(1),
        kind: z.enum(["expense", "loan", "settlement"]),
        amount: z.string().min(1),
        entryDate: z.string().min(1),
        description: z.string().min(1),
        expenseAccountId: z.string().nullable().optional(),
      }).parse(body);
      await assertCompanyAllowed(access.session.userId, access.session.role, input.fromCompanyId);
      await assertCompanyAllowed(access.session.userId, access.session.role, input.toCompanyId);
      const id = await postIntercompany({ ...input, actorId });
      return NextResponse.json({ id });
    }
    if (action === "stock") {
      return NextResponse.json(
        {
          error:
            "Quantity changes use an Inventory stock document. Open Inventory and choose Adjustment. The older item balance is not updated from here.",
        },
        { status: 409 },
      );
    }
    if (action === "payroll") {
      const input = z.object({
        companyId: z.string().min(1),
        periodLabel: z.string().min(1),
        scheme: z.enum(payrollSchemes),
        wage: z.string().min(1),
        yearsOfService: z.string().min(1),
        otherDeductions: z.string().optional().default("0"),
        entryDate: z.string().min(1),
      }).parse(body);
      const id = await postPayroll({ ...input, actorId });
      return NextResponse.json({ id });
    }
    if (action === "payPayroll") {
      const input = z.object({ id: z.string().min(1), paidOn: z.string().min(1) }).parse(body);
      const journalId = await payPayroll({ ...input, actorId });
      return NextResponse.json({ id: journalId });
    }
    if (action === "grant") {
      const input = z.object({
        userId: z.string().min(1),
        companyId: z.string().min(1),
        roleKey: z.string().min(1),
      }).parse(body);
      await grantAccess(input);
      return NextResponse.json({ ok: true });
    }
    if (action === "preference") {
      const input = z.object({ emailEnabled: z.boolean() }).parse(body);
      await savePreference(actorId, input.emailEnabled);
      return NextResponse.json({ ok: true });
    }
    if (action === "creditInvoice") {
      const input = z.object({ entryId: z.string().min(1), entryDate: z.string().min(1) }).parse(body);
      const journal = await postCustomerCredit({ ...input, actorId });
      return NextResponse.json({ id: journal.id });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return accountingError(error);
  }
}
