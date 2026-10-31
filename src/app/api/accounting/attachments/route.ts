import { readFile } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { accountingAttachments } from "@/db/schema";
import { accountingError, requireAccounting } from "@/lib/accounting/http";
import { saveAttachment } from "@/lib/accounting/phase2";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await requireAccounting("draft");
  if ("error" in access && access.error) return access.error;
  try {
    const form = await request.formData();
    const file = form.get("file");
    const companyId = String(form.get("companyId") ?? "");
    const entityType = String(form.get("entityType") ?? "");
    const entityId = String(form.get("entityId") ?? "");
    if (!(file instanceof File) || (entityType !== "bill" && entityType !== "expense")) {
      return NextResponse.json({ error: "Choose a file" }, { status: 400 });
    }
    const id = await saveAttachment({
      companyId,
      entityType,
      entityId,
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      bytes: Buffer.from(await file.arrayBuffer()),
      actorId: access.session.userId,
    });
    return NextResponse.json({ id });
  } catch (error) {
    return accountingError(error);
  }
}

export async function GET(request: Request) {
  const access = await requireAccounting("view");
  if ("error" in access && access.error) return access.error;
  const id = new URL(request.url).searchParams.get("id") ?? "";
  const row = await db.query.accountingAttachments.findFirst({
    where: eq(accountingAttachments.id, id),
  });
  if (!row) return NextResponse.json({ error: "File not found" }, { status: 404 });
  const absolute = path.join(process.cwd(), row.storagePath);
  const bytes = await readFile(absolute);
  return new NextResponse(bytes, {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Disposition": `attachment; filename="${row.fileName}"`,
    },
  });
}
