import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { operations } from "@/db/schema";
import { getOperationById } from "@/lib/create-operation";
import { operationUpdateSchema } from "@/lib/operation-fields";
import { canAccessOperations, canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const operation = await getOperationById(id);

  if (!operation) {
    return NextResponse.json({ error: "Operation not found" }, { status: 404 });
  }

  return NextResponse.json({ operation });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const input = operationUpdateSchema.parse(body);

    const existing = await db.query.operations.findFirst({
      where: eq(operations.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Operation not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (input.status !== undefined) {
      patch.status = input.status;
    }

    if (input.assignedToId !== undefined) {
      patch.assignedToId = input.assignedToId;
    }

    await db.update(operations).set(patch).where(eq(operations.id, id));

    const updated = await getOperationById(id);
    return NextResponse.json({ operation: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to update operation" },
      { status: 500 },
    );
  }
}
