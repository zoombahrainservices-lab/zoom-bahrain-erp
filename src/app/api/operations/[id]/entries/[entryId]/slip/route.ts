import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { operationEntries } from "@/db/schema";
import { bookKindByEntryType } from "@/lib/books-flow";
import { replaceDocumentLines } from "@/lib/create-operation-document-lines";
import { documentLineDraftSchema } from "@/lib/operation-document-lines";
import { canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { parseInputDate } from "@/lib/utils";

export const runtime = "nodejs";

const bodySchema = z.object({
  body: z.string().max(4000).optional(),
  activityDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  documentStage: z.enum(["draft", "sent", "accepted", "cancelled"]).optional(),
  lines: z.array(documentLineDraftSchema).max(50),
});

type RouteContext = {
  params: Promise<{ id: string; entryId: string }>;
};

export async function PUT(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, entryId } = await context.params;

  try {
    const input = bodySchema.parse(await request.json());
    const existing = await db.query.operationEntries.findFirst({
      where: and(eq(operationEntries.id, entryId), eq(operationEntries.operationId, id)),
    });
    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const kind = bookKindByEntryType(existing.entryType);
    if (!kind || kind.opens !== "slip") {
      return NextResponse.json({ error: "This is not an order, delivery, or return" }, { status: 400 });
    }
    if (input.documentStage && !kind.stages.includes(input.documentStage)) {
      return NextResponse.json({ error: "That status is not used here" }, { status: 400 });
    }

    const nextStage = input.documentStage ?? existing.documentStage ?? "draft";
    const locked = Boolean(existing.documentStage && existing.documentStage !== "draft");
    if (!locked || nextStage === "draft") {
      await replaceDocumentLines(entryId, input.lines);
    }

    await db
      .update(operationEntries)
      .set({
        body: input.body?.trim() ?? existing.body,
        activityDate: parseInputDate(input.activityDate),
        documentStage: nextStage,
      })
      .where(eq(operationEntries.id, entryId));

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    console.error(error);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
