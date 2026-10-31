import { NextResponse } from "next/server";
import { z } from "zod";

import { createAccount } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  companyId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  accountType: z.enum(["asset", "liability", "equity", "income", "expense"]),
  normalBalance: z.enum(["debit", "credit"]),
  parentId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const access = await requireAccounting("settings");
  if ("error" in access && access.error) return access.error;

  try {
    const input = schema.parse(await request.json());
    const id = await createAccount({ ...input, actorId: access.session.userId });
    return NextResponse.json({ id });
  } catch (error) {
    return accountingError(error);
  }
}
