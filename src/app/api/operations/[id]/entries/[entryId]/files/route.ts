import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { driveFiles, operationEntries, operations } from "@/db/schema";
import { getWorkspaceDrive, uploadFileToOperationFolder } from "@/lib/google";
import { canAccessOperations, canManageOperations } from "@/lib/permissions";
import { ensureOperationDriveFolder } from "@/lib/operation-drive";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; entryId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOperations(session)) {
    return NextResponse.json({ files: [] });
  }

  const { id, entryId } = await context.params;

  const entry = await db.query.operationEntries.findFirst({
    where: and(
      eq(operationEntries.id, entryId),
      eq(operationEntries.operationId, id),
    ),
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const files = await db.query.driveFiles.findMany({
    where: eq(driveFiles.operationEntryId, entryId),
    orderBy: [desc(driveFiles.createdAt)],
    with: {
      uploadedBy: {
        columns: { name: true },
      },
    },
  });

  return NextResponse.json({ files });
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const connection = await getWorkspaceDrive();
  if (!connection) {
    return NextResponse.json(
      { error: "File storage is not set up. Connect Google Drive in Settings." },
      { status: 400 },
    );
  }

  const { id, entryId } = await context.params;

  try {
    const operation = await db.query.operations.findFirst({
      where: eq(operations.id, id),
    });

    if (!operation) {
      return NextResponse.json({ error: "Operation not found" }, { status: 404 });
    }

    const entry = await db.query.operationEntries.findFirst({
      where: and(
        eq(operationEntries.id, entryId),
        eq(operationEntries.operationId, id),
      ),
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
    }

    const folderId = await ensureOperationDriveFolder({
      operationId: operation.id,
      operationCode: operation.operationCode,
      folderId: operation.driveFolderId,
    });

    const mimeType = file.type || "application/octet-stream";
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName =
      file.name ||
      (mimeType.startsWith("image/")
        ? `pasted-image-${Date.now()}.png`
        : `file-${Date.now()}`);

    const { uploaded } = await uploadFileToOperationFolder({
      operationCode: operation.operationCode,
      folderId,
      fileName,
      mimeType,
      buffer,
    });

    if (!uploaded.id) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const fileId = crypto.randomUUID();
    await db.insert(driveFiles).values({
      id: fileId,
      name: uploaded.name ?? fileName,
      mimeType: uploaded.mimeType ?? mimeType,
      size: uploaded.size ? Number(uploaded.size) : file.size,
      driveFileId: uploaded.id,
      webViewLink: uploaded.webViewLink ?? null,
      operationEntryId: entryId,
      uploadedById: session.userId,
    });

    const created = await db.query.driveFiles.findFirst({
      where: eq(driveFiles.id, fileId),
      with: {
        uploadedBy: {
          columns: { name: true },
        },
      },
    });

    return NextResponse.json({ file: created }, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 },
    );
  }
}
