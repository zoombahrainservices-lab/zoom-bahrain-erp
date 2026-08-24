import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { driveFiles } from "@/db/schema";
import { deleteDriveFile } from "@/lib/google";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const file = await db.query.driveFiles.findFirst({
    where: eq(driveFiles.id, id),
  });

  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  try {
    await deleteDriveFile(session.userId, file.driveFileId);
  } catch {
    // File may already be deleted in Drive — still remove local record.
  }

  await db.delete(driveFiles).where(eq(driveFiles.id, id));
  return NextResponse.json({ ok: true });
}
