import { NextResponse } from "next/server";
import { z } from "zod";

import { setPeriodStatus } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  status: z.enum(["open", "closed"]),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await requireAccounting("settings");
  if ("error" in access && access.error) return access.error;
  const { id } = await context.params;

  try {
    const input = schema.parse(await request.json());
    await setPeriodStatus(id, input.status, access.session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return accountingError(error);
  }
}
