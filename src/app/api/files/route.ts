import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { driveFiles, organizations } from "@/db/schema";
import { getWorkspaceDrive, uploadFileToOrganizationFolder } from "@/lib/google";
import {
  canAccessOrganizationData,
  canManageFiles,
} from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOrganizationData(session)) {
    return NextResponse.json({ files: [] });
  }

  const organizationId = request.nextUrl.searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json(
      { error: "organizationId is required" },
      { status: 400 },
    );
  }

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, organizationId),
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 404 },
    );
  }

  const files = await db.query.driveFiles.findMany({
    where: eq(driveFiles.organizationId, organizationId),
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

  if (!canManageFiles(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const connection = await getWorkspaceDrive();
  if (!connection) {
    return NextResponse.json(
      { error: "File storage is not set up. Ask an admin." },
      { status: 400 },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const organizationId = formData.get("organizationId");

    if (!(file instanceof File) || typeof organizationId !== "string") {
      return NextResponse.json({ error: "Invalid upload payload" }, { status: 400 });
    }

    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    if (!organization.orgCode) {
      return NextResponse.json(
        { error: "Organization is missing org code" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { uploaded, folderId } = await uploadFileToOrganizationFolder({
      orgCode: organization.orgCode,
      folderId: organization.driveFolderId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      buffer,
    });

    if (!organization.driveFolderId) {
      await db
        .update(organizations)
        .set({ driveFolderId: folderId })
        .where(eq(organizations.id, organization.id));
    }

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
      organizationId: organization.id,
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
