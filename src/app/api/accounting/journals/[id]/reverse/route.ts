import { NextResponse } from "next/server";
import { z } from "zod";

import { reverseJournal } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  entryDate: z.string().optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const access = await requireAccounting("post");
  if ("error" in access && access.error) return access.error;
  const { id } = await context.params;

  try {
    const input = schema.parse(await request.json().catch(() => ({})));
    const journal = await reverseJournal(id, access.session.userId, input.entryDate);
    return NextResponse.json({ id: journal.id });
  } catch (error) {
    return accountingError(error);
  }
}
