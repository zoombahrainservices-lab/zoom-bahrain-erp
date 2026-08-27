import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { driveFiles, organizationContacts } from "@/db/schema";
import { ensureContactDriveFolder } from "@/lib/contact-drive";
import { isAllowedContactImageMimeType } from "@/lib/contact-fields";
import { getWorkspaceDrive, uploadFileToContactFolder } from "@/lib/google";
import {
  canAccessContactData,
  canManageContacts,
} from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessContactData(session)) {
    return NextResponse.json({ files: [] });
  }

  const { id } = await context.params;

  const contact = await db.query.organizationContacts.findFirst({
    where: eq(organizationContacts.id, id),
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  const files = await db.query.driveFiles.findMany({
    where: eq(driveFiles.contactId, id),
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

  if (!canManageContacts(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const connection = await getWorkspaceDrive();
  if (!connection) {
    return NextResponse.json(
      { error: "File storage is not set up. Ask an admin." },
      { status: 400 },
    );
  }

  const { id } = await context.params;

  try {
    const contact = await db.query.organizationContacts.findFirst({
      where: eq(organizationContacts.id, id),
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    if (!isAllowedContactImageMimeType(mimeType)) {
      return NextResponse.json(
        { error: "Only PNG, JPEG, WebP, or HEIC images are allowed" },
        { status: 400 },
      );
    }

    const folderId = await ensureContactDriveFolder({
      contactId: contact.id,
      contactCode: contact.contactCode,
      folderId: contact.driveFolderId,
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { uploaded, folderId: resolvedFolderId } =
      await uploadFileToContactFolder({
        contactCode: contact.contactCode,
        folderId,
        fileName: file.name,
        mimeType,
        buffer,
      });

    if (!contact.driveFolderId && resolvedFolderId) {
      await db
        .update(organizationContacts)
        .set({ driveFolderId: resolvedFolderId })
        .where(eq(organizationContacts.id, contact.id));
    }

    if (!uploaded.id) {
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const fileId = crypto.randomUUID();
    await db.insert(driveFiles).values({
      id: fileId,
      name: uploaded.name ?? file.name,
      mimeType: uploaded.mimeType ?? mimeType,
      size: uploaded.size ? Number(uploaded.size) : file.size,
      driveFileId: uploaded.id,
      webViewLink: uploaded.webViewLink ?? null,
      contactId: contact.id,
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
          error instanceof Error ? error.message : "Failed to upload image",
      },
      { status: 500 },
    );
  }
}
