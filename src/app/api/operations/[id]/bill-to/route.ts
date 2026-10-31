import { NextResponse } from "next/server";
import { z } from "zod";

import { saveBillTo } from "@/lib/commercial-print-data";
import { canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const billToSchema = z.object({
  companyName: z.string().max(200),
  address: z.string().max(500),
  customerVat: z.string().max(40),
  contactName: z.string().max(160),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageOperations(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await context.params;
  try {
    const input = billToSchema.parse(await request.json());
    const billTo = await saveBillTo(id, input);
    return NextResponse.json({ billTo });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Failed to save invoice details";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
