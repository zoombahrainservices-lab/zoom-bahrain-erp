import { NextResponse } from "next/server";
import { z } from "zod";

import { recordPayment } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  companyId: z.string().min(1),
  direction: z.enum(["receipt", "payment"]),
  amount: z.string().min(1),
  paidOn: z.string().min(1),
  method: z.enum(["cash", "bank"]),
  bankAccountId: z.string().nullable().optional(),
  reference: z.string().optional(),
  operationEntryId: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  contactId: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const access = await requireAccounting("pay");
  if ("error" in access && access.error) return access.error;

  try {
    const input = schema.parse(await request.json());
    const result = await recordPayment({
      ...input,
      actorId: access.session.userId,
    });
    return NextResponse.json({ id: result.paymentId });
  } catch (error) {
    return accountingError(error);
  }
}
