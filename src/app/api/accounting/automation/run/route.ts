import { NextResponse } from "next/server";

import { accountingError } from "@/lib/accounting/http";
import { runDueReminders } from "@/lib/accounting/phase3";
import { todayInputDate } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const secret = process.env.ACCOUNTING_CRON_SECRET;
  const header = request.headers.get("x-accounting-cron");
  if (!secret || header !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDueReminders(todayInputDate());
    return NextResponse.json({
      ...result,
      note: "A queued message is not a delivered email. Delivery status is stored on each message.",
    });
  } catch (error) {
    return accountingError(error);
  }
}
