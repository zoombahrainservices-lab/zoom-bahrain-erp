import { NextResponse } from "next/server";
import { z } from "zod";

import { BookFlowError, startBookTransaction } from "@/lib/books-flow-server";
import { canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const bodySchema = z.object({
  kind: z.string().trim().min(1),
  organizationId: z.string().trim().optional(),
  divisionId: z.string().trim().optional(),
  operationId: z.string().trim().optional(),
  parentEntryId: z.string().trim().optional(),
  note: z.string().trim().max(500).optional(),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const input = bodySchema.parse(await request.json());
    const started = await startBookTransaction(input, {
      userId: session.userId,
      role: session.role,
    });
    return NextResponse.json(started, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    if (error instanceof BookFlowError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not start that transaction" }, { status: 500 });
  }
}
