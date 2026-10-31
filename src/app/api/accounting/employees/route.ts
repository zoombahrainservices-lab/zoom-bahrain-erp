import { NextResponse } from "next/server";
import { z } from "zod";

import { createEmployee } from "@/lib/accounting/employees";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const schema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  jobTitle: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  salary: z.string().optional(),
  scheme: z.string().min(1),
  startedOn: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  const access = await requireAccounting("draft");
  if ("error" in access && access.error) return access.error;

  try {
    const input = schema.parse(await request.json());
    const employee = await createEmployee(input, access.session);
    return NextResponse.json({ employee });
  } catch (error) {
    return accountingError(error);
  }
}
