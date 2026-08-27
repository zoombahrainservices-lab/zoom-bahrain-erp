import { eq } from "drizzle-orm";

import { db } from "@/db";
import { organizationContacts } from "@/db/schema";
import { getOrCreateContactFolder, getWorkspaceDrive } from "@/lib/google";

export async function provisionContactDrive(options: {
  contactId: string;
  contactCode: string;
}) {
  const connection = await getWorkspaceDrive();
  if (!connection) {
    return null;
  }

  const folderId = await getOrCreateContactFolder(options.contactCode);

  await db
    .update(organizationContacts)
    .set({ driveFolderId: folderId })
    .where(eq(organizationContacts.id, options.contactId));

  return { folderId };
}

export async function ensureContactDriveFolder(options: {
  contactId: string;
  contactCode: string;
  folderId: string | null;
}) {
  if (options.folderId) {
    return options.folderId;
  }

  const provisioned = await provisionContactDrive({
    contactId: options.contactId,
    contactCode: options.contactCode,
  });

  return provisioned?.folderId ?? null;
}
