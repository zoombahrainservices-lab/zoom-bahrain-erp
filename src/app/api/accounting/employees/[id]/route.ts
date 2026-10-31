import { NextResponse } from "next/server";
import { z } from "zod";

import { deleteEmployee, updateEmployee } from "@/lib/accounting/employees";
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

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  const access = await requireAccounting("draft");
  if ("error" in access && access.error) return access.error;

  try {
    const { id } = await context.params;
    const input = schema.parse(await request.json());
    const employee = await updateEmployee(id, input, access.session);
    return NextResponse.json({ employee });
  } catch (error) {
    return accountingError(error);
  }
}

export async function DELETE(_request: Request, context: Context) {
  const access = await requireAccounting("draft");
  if ("error" in access && access.error) return access.error;

  try {
    const { id } = await context.params;
    await deleteEmployee(id, access.session);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return accountingError(error);
  }
}
