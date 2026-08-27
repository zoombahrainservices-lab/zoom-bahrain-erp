import { NextResponse } from "next/server";

import { getWorkspaceDrive } from "@/lib/google";
import { getGoogleConfig } from "@/lib/env";
import { isAdmin } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await getWorkspaceDrive();
  const configured = Boolean(getGoogleConfig());

  return NextResponse.json({
    configured,
    connected: Boolean(connection),
    connectedAt: connection?.connectedAt ?? null,
    canManage: isAdmin(session),
  });
}
