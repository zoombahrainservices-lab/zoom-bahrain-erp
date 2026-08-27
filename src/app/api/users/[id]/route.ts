import { NextResponse } from "next/server";
import { z } from "zod";

import { updateUserRole, updateUserRoleSchema } from "@/lib/users";
import { canManageUsers } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageUsers(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  if (id === session.userId) {
    return NextResponse.json(
      { error: "You cannot change your own role here" },
      { status: 400 },
    );
  }

  try {
    const body = await request.json();
    const input = updateUserRoleSchema.parse(body);
    const user = await updateUserRole(id, input.role);

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update user" },
      { status: 400 },
    );
  }
}
