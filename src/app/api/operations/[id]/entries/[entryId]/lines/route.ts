import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { operationEntries } from "@/db/schema";
import {
  replaceDocumentLines,
} from "@/lib/create-operation-document-lines";
import { entryWithRelations } from "@/lib/create-operation-entry";
import { documentLinesReplaceSchema } from "@/lib/operation-document-lines";
import {
  areDocumentNumbersLocked,
  isCommercialDocumentType,
} from "@/lib/operation-documents";
import { canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

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
    const body = await request.json();
    const input = documentLinesReplaceSchema.parse(body);

    const existing = await db.query.operationEntries.findFirst({
      where: and(
        eq(operationEntries.id, entryId),
        eq(operationEntries.operationId, id),
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (!isCommercialDocumentType(existing.entryType)) {
      return NextResponse.json(
        { error: "This entry is not a quotation, invoice, or proposal" },
        { status: 400 },
      );
    }

    if (areDocumentNumbersLocked(existing.documentStage)) {
      return NextResponse.json(
        { error: "Numbers are locked. Revise to change them." },
        { status: 400 },
      );
    }

    const lines = await replaceDocumentLines(entryId, input.lines);
    const entry = await db.query.operationEntries.findFirst({
      where: eq(operationEntries.id, entryId),
      with: entryWithRelations,
    });

    return NextResponse.json({ entry, lines });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to save lines" },
      { status: 500 },
    );
  }
}
