import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { operationStatuses, operations } from "@/db/schema";
import { createOperationWithFirstEntry } from "@/lib/create-operation";
import { operationCreateSchema } from "@/lib/operation-fields";
import { canAccessOperations, canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

function parseLimit(value: string | null) {
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return undefined;
  return Math.min(parsed, 50);
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOperations(session)) {
    return NextResponse.json({ operations: [] });
  }

  const { searchParams } = new URL(request.url);
  const limit = parseLimit(searchParams.get("limit"));
  const status = searchParams.get("status");
  const statusFilter = operationStatuses.find((item) => item === status);

  const rows = await db.query.operations.findMany({
    ...(statusFilter ? { where: eq(operations.status, statusFilter) } : {}),
    orderBy: [desc(operations.updatedAt)],
    ...(limit ? { limit } : {}),
    with: {
      organization: {
        columns: { id: true, name: true, orgCode: true },
      },
      contact: {
        columns: { id: true, name: true, contactCode: true },
      },
      assignedTo: {
        columns: { id: true, name: true },
      },
      createdBy: {
        columns: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ operations: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const input = operationCreateSchema.parse(body);
    const created = await createOperationWithFirstEntry(input, session.userId);

    return NextResponse.json({ operation: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to create operation" },
      { status: 500 },
    );
  }
}
