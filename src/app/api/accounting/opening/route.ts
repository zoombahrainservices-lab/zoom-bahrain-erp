import { NextResponse } from "next/server";
import { z } from "zod";

import { postOpeningBalance } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  companyId: z.string().min(1),
  accountId: z.string().min(1),
  entryDate: z.string().min(1),
  debit: z.string().optional().default(""),
  credit: z.string().optional().default(""),
});

export async function POST(request: Request) {
  const access = await requireAccounting("post");
  if ("error" in access && access.error) return access.error;

  try {
    const input = schema.parse(await request.json());
    const journal = await postOpeningBalance({
      ...input,
      actorId: access.session.userId,
    });
    return NextResponse.json({ id: journal.id });
  } catch (error) {
    return accountingError(error);
  }
}
