import { NextResponse } from "next/server";

import { disconnectGoogleAccount } from "@/lib/google";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await disconnectGoogleAccount(session.userId);
  return NextResponse.json({ ok: true });
}
