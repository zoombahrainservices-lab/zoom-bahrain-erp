import { Readable } from "stream";

import { eq } from "drizzle-orm";
import { google } from "googleapis";
import { SignJWT, jwtVerify } from "jose";

import { db } from "@/db";
import { WORKSPACE_DRIVE_ID, workspaceDrive } from "@/db/schema";
import { getGoogleConfig, getSessionSecret } from "@/lib/env";

export const GOOGLE_DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.file";

const ROOT_FOLDER_NAME = "Zoom ERP";
const ORGANIZATIONS_FOLDER_NAME = "Organizations";
const CONTACTS_FOLDER_NAME = "Contacts";
const OPERATIONS_FOLDER_NAME = "Operations";
export const LOGO_FILE_NAME = "logo";

function getOAuthStateSecret() {
  return new TextEncoder().encode(getSessionSecret());
}

function escapeDriveQuery(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}

function logoFileNameFromMime(mimeType: string, originalName?: string) {
  if (originalName?.includes(".")) {
    const ext = originalName.split(".").pop()?.toLowerCase();
    if (ext) return `${LOGO_FILE_NAME}.${ext}`;
  }
  if (mimeType === "image/svg+xml") return `${LOGO_FILE_NAME}.svg`;
  if (mimeType === "image/webp") return `${LOGO_FILE_NAME}.webp`;
  if (mimeType === "image/png") return `${LOGO_FILE_NAME}.png`;
  return `${LOGO_FILE_NAME}.jpg`;
}

export function createOAuthClient() {
  const config = getGoogleConfig();
  if (!config) {
    throw new Error("Google OAuth is not configured");
  }

  return new google.auth.OAuth2(
    config.clientId,
    config.clientSecret,
    config.redirectUri,
  );
}

export async function createGoogleAuthUrl(connectedByUserId: string) {
  const client = createOAuthClient();
  const state = await new SignJWT({ connectedByUserId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getOAuthStateSecret());

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [GOOGLE_DRIVE_SCOPE],
    state,
  });
}

export async function verifyOAuthState(state: string) {
  const { payload } = await jwtVerify(state, getOAuthStateSecret());
  const connectedByUserId = payload.connectedByUserId;
  if (typeof connectedByUserId !== "string") {
    throw new Error("Invalid OAuth state");
  }
  return connectedByUserId;
}

async function findOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId?: string,
) {
  const query = [
    "mimeType='application/vnd.google-apps.folder'",
    `name='${escapeDriveQuery(name)}'`,
    "trashed=false",
    parentId ? `'${parentId}' in parents` : undefined,
  ]
    .filter(Boolean)
    .join(" and ");

  const existing = await drive.files.list({
    q: query,
    fields: "files(id,name)",
    pageSize: 1,
  });

  const folder = existing.data.files?.[0];
  if (folder?.id) {
    return folder.id;
  }

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: parentId ? [parentId] : undefined,
    },
    fields: "id",
  });

  if (!created.data.id) {
    throw new Error("Failed to create Google Drive folder");
  }

  return created.data.id;
}

export async function connectWorkspaceDrive(
  connectedByUserId: string,
  code: string,
) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Google did not return an access token");
  }

  client.setCredentials(tokens);
  const drive = google.drive({ version: "v3", auth: client });
  const rootFolderId = await findOrCreateFolder(drive, ROOT_FOLDER_NAME);
  const workspaceFolderId = await findOrCreateFolder(
    drive,
    ORGANIZATIONS_FOLDER_NAME,
    rootFolderId,
  );

  const existing = await db.query.workspaceDrive.findFirst({
    where: eq(workspaceDrive.id, WORKSPACE_DRIVE_ID),
  });

  const values = {
    id: WORKSPACE_DRIVE_ID,
    connectedByUserId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    googleEmail: null,
    rootFolderId,
    workspaceFolderId,
    connectedAt: new Date(),
  };

  if (existing) {
    await db
      .update(workspaceDrive)
      .set(values)
      .where(eq(workspaceDrive.id, WORKSPACE_DRIVE_ID));
  } else {
    await db.insert(workspaceDrive).values(values);
  }

  return values;
}

export async function getWorkspaceDrive() {
  return db.query.workspaceDrive.findFirst({
    where: eq(workspaceDrive.id, WORKSPACE_DRIVE_ID),
  });
}

export async function disconnectWorkspaceDrive() {
  await db
    .delete(workspaceDrive)
    .where(eq(workspaceDrive.id, WORKSPACE_DRIVE_ID));
}

export async function getAuthenticatedDriveClient() {
  const connection = await getWorkspaceDrive();
  if (!connection) {
    throw new Error("Company Google Drive is not connected");
  }

  const client = createOAuthClient();
  client.setCredentials({
    access_token: connection.accessToken,
    refresh_token: connection.refreshToken ?? undefined,
    expiry_date: connection.expiresAt?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    if (!tokens.access_token) return;

    await db
      .update(workspaceDrive)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? connection.refreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      })
      .where(eq(workspaceDrive.id, WORKSPACE_DRIVE_ID));
  });

  return {
    drive: google.drive({ version: "v3", auth: client }),
    connection,
  };
}

export async function getOrCreateOrganizationFolder(orgCode: string) {
  const { drive, connection } = await getAuthenticatedDriveClient();

  if (!connection.workspaceFolderId) {
    throw new Error("Google Drive organizations folder is missing");
  }

  return findOrCreateFolder(drive, orgCode, connection.workspaceFolderId);
}

export async function getOrCreateContactsRootFolder() {
  const { drive, connection } = await getAuthenticatedDriveClient();

  if (!connection.rootFolderId) {
    throw new Error("Google Drive root folder is missing");
  }

  return findOrCreateFolder(
    drive,
    CONTACTS_FOLDER_NAME,
    connection.rootFolderId,
  );
}

export async function getOrCreateContactFolder(contactCode: string) {
  const { drive } = await getAuthenticatedDriveClient();
  const contactsRootId = await getOrCreateContactsRootFolder();
  return findOrCreateFolder(drive, contactCode, contactsRootId);
}

export async function getOrCreateOperationsRootFolder() {
  const { drive, connection } = await getAuthenticatedDriveClient();

  if (!connection.rootFolderId) {
    throw new Error("Google Drive root folder is missing");
  }

  return findOrCreateFolder(
    drive,
    OPERATIONS_FOLDER_NAME,
    connection.rootFolderId,
  );
}

export async function getOrCreateOperationFolder(operationCode: string) {
  const { drive } = await getAuthenticatedDriveClient();
  const operationsRootId = await getOrCreateOperationsRootFolder();
  return findOrCreateFolder(drive, operationCode, operationsRootId);
}

export async function uploadFileToOperationFolder(options: {
  operationCode: string;
  folderId?: string | null;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const { drive } = await getAuthenticatedDriveClient();
  const folderId =
    options.folderId ?? (await getOrCreateOperationFolder(options.operationCode));

  const uploaded = await drive.files.create({
    requestBody: {
      name: options.fileName,
      parents: [folderId],
    },
    media: {
      mimeType: options.mimeType,
      body: bufferToStream(options.buffer),
    },
    fields: "id,name,mimeType,webViewLink,webContentLink,size,createdTime",
  });

  return { uploaded: uploaded.data, folderId };
}

/** @deprecated Use getOrCreateOperationsRootFolder */
export const getOrCreateServicesRootFolder = getOrCreateOperationsRootFolder;

/** @deprecated Use getOrCreateOperationFolder */
export async function getOrCreateServiceFolder(serviceCode: string) {
  return getOrCreateOperationFolder(serviceCode);
}

/** @deprecated Use uploadFileToOperationFolder */
export async function uploadFileToServiceFolder(options: {
  serviceCode: string;
  folderId?: string | null;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  return uploadFileToOperationFolder({
    operationCode: options.serviceCode,
    folderId: options.folderId,
    fileName: options.fileName,
    mimeType: options.mimeType,
    buffer: options.buffer,
  });
}

/** @deprecated Use getOrCreateOrganizationFolder */
export async function getOrCreateClientFolder(clientName: string) {
  return getOrCreateOrganizationFolder(clientName);
}

export async function uploadOrganizationLogoToFolder(options: {
  folderId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  replaceFileId: string | null;
}) {
  const { drive } = await getAuthenticatedDriveClient();

  if (options.replaceFileId) {
    try {
      await drive.files.delete({ fileId: options.replaceFileId });
    } catch {
      // Old logo may already be gone.
    }
  }

  const uploaded = await drive.files.create({
    requestBody: {
      name: logoFileNameFromMime(options.mimeType, options.fileName),
      parents: [options.folderId],
    },
    media: {
      mimeType: options.mimeType,
      body: bufferToStream(options.buffer),
    },
    fields: "id,name,mimeType,webViewLink,webContentLink,size,createdTime",
  });

  return uploaded.data;
}

export async function uploadFileToOrganizationFolder(options: {
  orgCode: string;
  folderId?: string | null;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const { drive } = await getAuthenticatedDriveClient();
  const folderId =
    options.folderId ?? (await getOrCreateOrganizationFolder(options.orgCode));

  const uploaded = await drive.files.create({
    requestBody: {
      name: options.fileName,
      parents: [folderId],
    },
    media: {
      mimeType: options.mimeType,
      body: bufferToStream(options.buffer),
    },
    fields: "id,name,mimeType,webViewLink,webContentLink,size,createdTime",
  });

  return { uploaded: uploaded.data, folderId };
}

export async function uploadFileToContactFolder(options: {
  contactCode: string;
  folderId?: string | null;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const { drive } = await getAuthenticatedDriveClient();
  const folderId =
    options.folderId ?? (await getOrCreateContactFolder(options.contactCode));

  const uploaded = await drive.files.create({
    requestBody: {
      name: options.fileName,
      parents: [folderId],
    },
    media: {
      mimeType: options.mimeType,
      body: bufferToStream(options.buffer),
    },
    fields: "id,name,mimeType,webViewLink,webContentLink,size,createdTime",
  });

  return { uploaded: uploaded.data, folderId };
}

/** @deprecated Use uploadFileToOrganizationFolder */
export async function uploadFileToDrive(options: {
  clientName: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const { uploaded } = await uploadFileToOrganizationFolder({
    orgCode: options.clientName,
    fileName: options.fileName,
    mimeType: options.mimeType,
    buffer: options.buffer,
  });
  return uploaded;
}

export async function downloadDriveFile(driveFileId: string) {
  const { drive } = await getAuthenticatedDriveClient();
  const meta = await drive.files.get({
    fileId: driveFileId,
    fields: "id,name,mimeType",
  });

  const media = await drive.files.get(
    { fileId: driveFileId, alt: "media" },
    { responseType: "arraybuffer" },
  );

  return {
    buffer: Buffer.from(media.data as ArrayBuffer),
    mimeType: meta.data.mimeType ?? "application/octet-stream",
    name: meta.data.name ?? "file",
  };
}

export async function deleteDriveFile(driveFileId: string) {
  const { drive } = await getAuthenticatedDriveClient();
  await drive.files.delete({ fileId: driveFileId });
}

const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

export async function createGoogleDocFromHtml(options: {
  folderId: string;
  fileName: string;
  html: string;
}) {
  const { drive } = await getAuthenticatedDriveClient();

  const converted = await drive.files.create({
    requestBody: {
      name: options.fileName,
      mimeType: GOOGLE_DOC_MIME,
      parents: [options.folderId],
    },
    media: {
      mimeType: "text/html",
      body: bufferToStream(Buffer.from(options.html, "utf8")),
    },
    fields: "id,name,mimeType,webViewLink,size,createdTime",
  });

  if (!converted.data.id) {
    throw new Error("Failed to create Google Doc");
  }

  return converted.data;
}
