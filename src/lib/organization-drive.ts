import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import {
  getOrCreateOrganizationFolder,
  getWorkspaceDrive,
  uploadOrganizationLogoToFolder,
} from "@/lib/google";

const ALLOWED_LOGO_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export function isAllowedLogoMimeType(mimeType: string) {
  return ALLOWED_LOGO_TYPES.has(mimeType);
}

export async function provisionOrganizationDrive(options: {
  organizationId: string;
  orgCode: string;
  logo?: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  };
}) {
  const connection = await getWorkspaceDrive();
  if (!connection) {
    return null;
  }

  const folderId = await getOrCreateOrganizationFolder(options.orgCode);

  let logoDriveFileId: string | null = null;
  let logoMimeType: string | null = null;

  if (options.logo && isAllowedLogoMimeType(options.logo.mimeType)) {
    const uploaded = await uploadOrganizationLogoToFolder({
      folderId,
      buffer: options.logo.buffer,
      mimeType: options.logo.mimeType,
      fileName: options.logo.fileName,
      replaceFileId: null,
    });
    logoDriveFileId = uploaded.id ?? null;
    logoMimeType = options.logo.mimeType;
  }

  await db
    .update(organizations)
    .set({
      driveFolderId: folderId,
      logoDriveFileId,
      logoMimeType,
    })
    .where(eq(organizations.id, options.organizationId));

  return { folderId, logoDriveFileId, logoMimeType };
}

export async function updateOrganizationLogo(options: {
  organizationId: string;
  orgCode: string;
  folderId: string | null;
  replaceFileId: string | null;
  logo: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  };
}) {
  if (!isAllowedLogoMimeType(options.logo.mimeType)) {
    throw new Error("Logo must be PNG, JPEG, WebP, or SVG");
  }

  const connection = await getWorkspaceDrive();
  if (!connection) {
    throw new Error("Google Drive is not connected");
  }

  const folderId =
    options.folderId ??
    (await getOrCreateOrganizationFolder(options.orgCode));

  const uploaded = await uploadOrganizationLogoToFolder({
    folderId,
    buffer: options.logo.buffer,
    mimeType: options.logo.mimeType,
    fileName: options.logo.fileName,
    replaceFileId: options.replaceFileId,
  });

  await db
    .update(organizations)
    .set({
      driveFolderId: folderId,
      logoDriveFileId: uploaded.id ?? null,
      logoMimeType: options.logo.mimeType,
    })
    .where(eq(organizations.id, options.organizationId));

  return uploaded;
}
