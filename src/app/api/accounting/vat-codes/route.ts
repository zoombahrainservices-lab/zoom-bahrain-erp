import { NextResponse } from "next/server";
import { z } from "zod";

import { createVatCode } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  companyId: z.string().min(1),
  code: z.string().min(1),
  name: z.string().min(1),
  rate: z.string().min(1),
  treatment: z.enum([
    "standard",
    "zero",
    "exempt",
    "out_of_scope",
    "reverse_charge",
    "import",
    "non_recoverable",
  ]),
});

export async function POST(request: Request) {
  const access = await requireAccounting("settings");
  if ("error" in access && access.error) return access.error;

  try {
    const input = schema.parse(await request.json());
    await createVatCode({ ...input, actorId: access.session.userId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return accountingError(error);
  }
}
