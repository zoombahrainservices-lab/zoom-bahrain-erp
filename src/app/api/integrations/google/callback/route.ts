import { NextRequest, NextResponse } from "next/server";

import { connectGoogleAccount, verifyOAuthState } from "@/lib/google";
import { getAppUrl } from "@/lib/env";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  const appUrl = getAppUrl();
  const settingsUrl = new URL("/settings", appUrl);

  if (!session) {
    settingsUrl.searchParams.set("error", "login_required");
    return NextResponse.redirect(settingsUrl);
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    settingsUrl.searchParams.set("error", error);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code || !state) {
    settingsUrl.searchParams.set("error", "missing_code");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const userId = await verifyOAuthState(state);
    if (userId !== session.userId) {
      settingsUrl.searchParams.set("error", "state_mismatch");
      return NextResponse.redirect(settingsUrl);
    }

    await connectGoogleAccount(userId, code);
    settingsUrl.searchParams.set("connected", "1");
    return NextResponse.redirect(settingsUrl);
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    settingsUrl.searchParams.set("error", "connect_failed");
    if (error instanceof Error && error.message) {
      settingsUrl.searchParams.set("error_detail", error.message.slice(0, 200));
    }
    return NextResponse.redirect(settingsUrl);
  }
}
