import { Readable } from "stream";

import { eq } from "drizzle-orm";
import { google } from "googleapis";
import { SignJWT, jwtVerify } from "jose";

import { db } from "@/db";
import { googleConnections } from "@/db/schema";
import { getGoogleConfig, getSessionSecret } from "@/lib/env";

export const GOOGLE_DRIVE_SCOPE =
  "https://www.googleapis.com/auth/drive.file";

export const GOOGLE_USERINFO_SCOPE =
  "https://www.googleapis.com/auth/userinfo.email";

const GOOGLE_OAUTH_SCOPES = [GOOGLE_DRIVE_SCOPE, GOOGLE_USERINFO_SCOPE];

const ROOT_FOLDER_NAME = "Zoom ERP";

function getOAuthStateSecret() {
  return new TextEncoder().encode(getSessionSecret());
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

export async function createGoogleAuthUrl(userId: string) {
  const client = createOAuthClient();
  const state = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(getOAuthStateSecret());

  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_OAUTH_SCOPES,
    state,
  });
}

export async function verifyOAuthState(state: string) {
  const { payload } = await jwtVerify(state, getOAuthStateSecret());
  const userId = payload.userId;
  if (typeof userId !== "string") {
    throw new Error("Invalid OAuth state");
  }
  return userId;
}

async function findOrCreateFolder(drive: ReturnType<typeof google.drive>, name: string, parentId?: string) {
  const query = [
    "mimeType='application/vnd.google-apps.folder'",
    `name='${name.replace(/'/g, "\\'")}'`,
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

export async function connectGoogleAccount(userId: string, code: string) {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);

  if (!tokens.access_token) {
    throw new Error("Google did not return an access token");
  }

  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth: client });

  let googleEmail: string | null = null;
  try {
    const profile = await oauth2.userinfo.get();
    googleEmail = profile.data.email ?? null;
  } catch {
    // Continue without email if userinfo scope was not granted yet.
  }

  const drive = google.drive({ version: "v3", auth: client });
  const rootFolderId = await findOrCreateFolder(drive, ROOT_FOLDER_NAME);
  const clientsFolderId = await findOrCreateFolder(
    drive,
    "Internal",
    rootFolderId,
  );

  const existing = await db.query.googleConnections.findFirst({
    where: eq(googleConnections.userId, userId),
  });

  const values = {
    userId,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? existing?.refreshToken ?? null,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    googleEmail: googleEmail,
    rootFolderId,
    clientsFolderId,
    connectedAt: new Date(),
  };

  if (existing) {
    await db
      .update(googleConnections)
      .set(values)
      .where(eq(googleConnections.userId, userId));
  } else {
    await db.insert(googleConnections).values(values);
  }

  return values;
}

export async function getGoogleConnection(userId: string) {
  return db.query.googleConnections.findFirst({
    where: eq(googleConnections.userId, userId),
  });
}

export async function disconnectGoogleAccount(userId: string) {
  await db
    .delete(googleConnections)
    .where(eq(googleConnections.userId, userId));
}

export async function getAuthenticatedDriveClient(userId: string) {
  const connection = await getGoogleConnection(userId);
  if (!connection) {
    throw new Error("Google Drive is not connected");
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
      .update(googleConnections)
      .set({
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? connection.refreshToken,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      })
      .where(eq(googleConnections.userId, userId));
  });

  return {
    drive: google.drive({ version: "v3", auth: client }),
    connection,
  };
}

export async function getOrCreateClientFolder(
  userId: string,
  clientId: string,
  clientName: string,
) {
  const { drive, connection } = await getAuthenticatedDriveClient(userId);

  if (!connection.clientsFolderId) {
    throw new Error("Google Drive clients folder is missing");
  }

  const safeName = clientName.replace(/'/g, "\\'");
  const query = [
    "mimeType='application/vnd.google-apps.folder'",
    `name='${safeName}'`,
    `'${connection.clientsFolderId}' in parents`,
    "trashed=false",
  ].join(" and ");

  const existing = await drive.files.list({
    q: query,
    fields: "files(id,name)",
    pageSize: 1,
  });

  if (existing.data.files?.[0]?.id) {
    return existing.data.files[0].id;
  }

  const created = await drive.files.create({
    requestBody: {
      name: clientName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [connection.clientsFolderId],
    },
    fields: "id",
  });

  if (!created.data.id) {
    throw new Error("Failed to create client folder");
  }

  return created.data.id;
}

export async function uploadFileToDrive(options: {
  userId: string;
  clientId: string;
  clientName: string;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}) {
  const { drive } = await getAuthenticatedDriveClient(options.userId);
  const folderId = await getOrCreateClientFolder(
    options.userId,
    options.clientId,
    options.clientName,
  );

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

  return uploaded.data;
}

export async function deleteDriveFile(userId: string, driveFileId: string) {
  const { drive } = await getAuthenticatedDriveClient(userId);
  await drive.files.delete({ fileId: driveFileId });
}

function bufferToStream(buffer: Buffer) {
  return Readable.from(buffer);
}
