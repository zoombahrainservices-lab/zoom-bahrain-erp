import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteDraft, replaceDraft } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  companyId: z.string().min(1),
  entryDate: z.string().min(1),
  description: z.string().min(1),
  lines: z.array(
    z.object({
      accountId: z.string().optional(),
      description: z.string().optional(),
      debit: z.string().optional(),
      credit: z.string().optional(),
    }),
  ),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(request: Request, context: RouteContext) {
  const access = await requireAccounting("draft");
  if ("error" in access && access.error) return access.error;
  const { id } = await context.params;

  try {
    const input = schema.parse(await request.json());
    await replaceDraft(id, {
      ...input,
      status: "draft",
      sourceType: "manual",
      actorId: access.session.userId,
      lines: input.lines.map((line) => ({
        accountId: line.accountId,
        description: line.description,
        debit: line.debit || "0",
        credit: line.credit || "0",
      })),
    });
    return NextResponse.json({ id });
  } catch (error) {
    return accountingError(error);
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const access = await requireAccounting("draft");
  if ("error" in access && access.error) return access.error;
  const { id } = await context.params;

  try {
    await deleteDraft(id, access.session.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return accountingError(error);
  }
}
