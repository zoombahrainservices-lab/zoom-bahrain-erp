import { NextResponse } from "next/server";
import { z } from "zod";

import { recordTransfer } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  companyId: z.string().min(1),
  entryDate: z.string().min(1),
  amount: z.string().min(1),
  fromBankAccountId: z.string().min(1),
  toBankAccountId: z.string().min(1),
  description: z.string().optional(),
});

export async function POST(request: Request) {
  const access = await requireAccounting("pay");
  if ("error" in access && access.error) return access.error;

  try {
    const input = schema.parse(await request.json());
    const journal = await recordTransfer({
      ...input,
      actorId: access.session.userId,
    });
    return NextResponse.json({ id: journal.id });
  } catch (error) {
    return accountingError(error);
  }
}
