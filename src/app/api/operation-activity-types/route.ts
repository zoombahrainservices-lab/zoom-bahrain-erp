import { NextResponse } from "next/server";
import { z } from "zod";

import { operationActivityMoneyKinds } from "@/db/schema";
import {
  createOperationActivityType,
  listOperationActivityTypes,
} from "@/lib/create-operation-activity-type";
import { canAccessOperations, canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const createSchema = z.object({
  label: z.string().trim().min(1, "Enter a type name").max(60),
  moneyKind: z.enum(operationActivityMoneyKinds).default("none"),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOperations(session)) {
    return NextResponse.json({ types: [] });
  }

  const types = await listOperationActivityTypes();
  return NextResponse.json({ types });
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
    const input = createSchema.parse(body);
    const type = await createOperationActivityType(input, session.userId);

    return NextResponse.json({ type }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to create type" },
      { status: 500 },
    );
  }
}
