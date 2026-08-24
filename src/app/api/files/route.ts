import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { clients, driveFiles } from "@/db/schema";
import {
  deleteDriveFile,
  getGoogleConnection,
  uploadFileToDrive,
} from "@/lib/google";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = request.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId is required" }, { status: 400 });
  }

  const files = await db.query.driveFiles.findMany({
    where: eq(driveFiles.clientId, clientId),
    orderBy: [desc(driveFiles.createdAt)],
    with: {
      uploadedBy: {
        columns: { name: true },
      },
    },
  });

  return NextResponse.json({ files });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connection = await getGoogleConnection(session.userId);
  if (!connection) {
    return NextResponse.json(
      { error: "Connect Google Drive in Settings first" },
      { status: 400 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const clientId = formData.get("clientId");

    if (!(file instanceof File) || typeof clientId !== "string") {
      return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
    }

    const client = await db.query.clients.findFirst({
      where: eq(clients.id, clientId),
    });

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadFileToDrive({
      userId: session.userId,
      clientId: client.id,
      clientName: client.company ?? client.name,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });

    if (!uploaded.id) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const id = crypto.randomUUID();
    await db.insert(driveFiles).values({
      id,
      name: uploaded.name ?? file.name,
      mimeType: uploaded.mimeType ?? file.type,
      size: uploaded.size ? Number(uploaded.size) : file.size,
      driveFileId: uploaded.id,
      webViewLink: uploaded.webViewLink ?? null,
      clientId: client.id,
      uploadedById: session.userId,
    });

    const created = await db.query.driveFiles.findFirst({
      where: eq(driveFiles.id, id),
      with: {
        uploadedBy: {
          columns: { name: true },
        },
      },
    });

    return NextResponse.json({ file: created }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload file",
      },
      { status: 500 },
    );
  }
}
