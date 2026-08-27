import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { operations } from "@/db/schema";
import { createOperationEntry } from "@/lib/create-operation-entry";
import { operationEntryCreateSchema } from "@/lib/operation-fields";
import { canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const operation = await db.query.operations.findFirst({
    where: eq(operations.id, id),
  });

  if (!operation) {
    return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  }

  try {
    const body = await request.json();
    const input = operationEntryCreateSchema.parse(body);
    const entry = await createOperationEntry(id, input, session.userId);

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to create entry" },
      { status: 500 },
    );
  }
}
