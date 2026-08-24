import { NextResponse } from "next/server";

import { getGoogleConnection } from "@/lib/google";
import { getGoogleConfig } from "@/lib/env";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await getGoogleConnection(session.userId);
  const configured = Boolean(getGoogleConfig());

  return NextResponse.json({
    configured,
    connected: Boolean(connection),
    googleEmail: connection?.googleEmail ?? null,
    connectedAt: connection?.connectedAt ?? null,
  });
}
