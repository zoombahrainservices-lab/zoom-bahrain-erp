import { NextResponse } from "next/server";
import { z } from "zod";

import { registerSchema, registerUser } from "@/lib/auth";
import { createSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = registerSchema.parse(body);
    const user = await registerUser(input);

    if (!user) {
      return NextResponse.json(
        { error: "Registration failed" },
        { status: 500 },
      );
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
      { error: error instanceof Error ? error.message : "Registration failed" },
      { status: 400 },
    );
  }
}
