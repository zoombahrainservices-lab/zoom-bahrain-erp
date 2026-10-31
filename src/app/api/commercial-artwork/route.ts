import { NextResponse } from "next/server";

import { commercialArtwork } from "@/lib/commercial-template";
import { canAccessOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canAccessOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const piece = new URL(request.url).searchParams.get("piece") ?? "";
  const art = await commercialArtwork(piece);
  if (!art) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(art.bytes), {
    headers: {
      "Content-Type": art.type,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
