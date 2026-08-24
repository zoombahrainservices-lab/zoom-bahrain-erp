import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";

import { getSessionSecret } from "@/lib/env";

const SESSION_COOKIE = "zoom-erp-session";

const publicPaths = ["/login", "/register"];

function getSecretKey() {
  return new TextEncoder().encode(getSessionSecret());
}

async function hasValidSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;

  try {
    await jwtVerify(token, getSecretKey());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = publicPaths.some((path) => pathname.startsWith(path));
  const isApiAuth = pathname.startsWith("/api/auth/login") || pathname.startsWith("/api/auth/register");
  const isAuthenticated = await hasValidSession(request);

  if (pathname === "/") {
    return NextResponse.redirect(
      new URL(isAuthenticated ? "/dashboard" : "/login", request.url),
    );
  }

  if (isPublic || isApiAuth) {
    if (isAuthenticated && (pathname === "/login" || pathname === "/register")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
