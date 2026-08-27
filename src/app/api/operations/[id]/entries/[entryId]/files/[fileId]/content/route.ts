import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { driveFiles, operationEntries } from "@/db/schema";
import { downloadDriveFile } from "@/lib/google";
import { canAccessOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; entryId: string; fileId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, entryId, fileId } = await context.params;

  const entry = await db.query.operationEntries.findFirst({
    where: eq(operationEntries.id, entryId),
  });

  if (!entry || entry.operationId !== id) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const file = await db.query.driveFiles.findFirst({
    where: eq(driveFiles.id, fileId),
  });

  if (!file || file.operationEntryId !== entryId) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    const downloaded = await downloadDriveFile(file.driveFileId);
    return new NextResponse(new Uint8Array(downloaded.buffer), {
      headers: {
        "Content-Type": file.mimeType ?? downloaded.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Failed to load file" }, { status: 500 });
  }
}
