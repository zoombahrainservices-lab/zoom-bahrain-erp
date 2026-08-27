import { NextResponse } from "next/server";
import { z } from "zod";

import { createUser, createUserSchema, listUsers } from "@/lib/users";
import { canManageUsers } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await listUsers();
  return NextResponse.json({ users: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const input = createUserSchema.parse(body);
    const user = await createUser(input);

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create user" },
      { status: 400 },
    );
  }
}
