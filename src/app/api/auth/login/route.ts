import { NextResponse } from "next/server";
import { z } from "zod";

import { loginSchema, verifyUser } from "@/lib/auth";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = loginSchema.parse(body);
    const user = await verifyUser(input);

    if (!user) {
      return NextResponse.json({ error: "Login failed" }, { status: 401 });
    }

    await createSession({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    return NextResponse.json({
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Login failed" },
      { status: 401 },
    );
  }
}
