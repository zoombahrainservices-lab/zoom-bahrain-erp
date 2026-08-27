import { NextResponse } from "next/server";

import { disconnectWorkspaceDrive } from "@/lib/google";
import { isAdmin } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json(
      { error: "Only admins can remove file storage" },
      { status: 403 },
    );
  }

  await disconnectWorkspaceDrive();
  return NextResponse.json({ ok: true });
}
