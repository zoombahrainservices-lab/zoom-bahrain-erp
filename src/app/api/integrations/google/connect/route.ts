import { NextResponse } from "next/server";

import { createGoogleAuthUrl } from "@/lib/google";
import { getGoogleConfig } from "@/lib/env";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!getGoogleConfig()) {
    return NextResponse.json(
      { error: "Google OAuth is not configured on the server" },
      { status: 503 },
    );
  }

  const url = await createGoogleAuthUrl(session.userId);
  return NextResponse.redirect(url);
}
