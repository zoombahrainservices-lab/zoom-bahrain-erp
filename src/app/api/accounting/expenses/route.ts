import { NextResponse } from "next/server";
import { z } from "zod";

import { recordExpense } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  companyId: z.string().min(1),
  entryDate: z.string().min(1),
  amount: z.string().min(1),
  expenseAccountId: z.string().min(1),
  method: z.enum(["cash", "bank", "credit"]),
  bankAccountId: z.string().nullable().optional(),
  vatCodeId: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  operationId: z.string().nullable().optional(),
  operationEntryId: z.string().nullable().optional(),
  description: z.string().min(1),
});

export async function POST(request: Request) {
  const access = await requireAccounting("pay");
  if ("error" in access && access.error) return access.error;

  try {
    const input = schema.parse(await request.json());
    const journal = await recordExpense({
      ...input,
      actorId: access.session.userId,
    });
    return NextResponse.json({ id: journal.id });
  } catch (error) {
    return accountingError(error);
  }
}
