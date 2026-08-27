import { eq } from "drizzle-orm";

import { db } from "@/db";
import { operations } from "@/db/schema";
import { getOrCreateOperationFolder } from "@/lib/google";

export async function ensureOperationDriveFolder(options: {
  operationId: string;
  operationCode: string;
  folderId: string | null;
}) {
  if (options.folderId) {
    return options.folderId;
  }

  const folderId = await getOrCreateOperationFolder(options.operationCode);

  await db
    .update(operations)
    .set({ driveFolderId: folderId })
    .where(eq(operations.id, options.operationId));

  return folderId;
}
