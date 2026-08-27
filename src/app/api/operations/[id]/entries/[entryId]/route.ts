import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { operationEntries, tasks } from "@/db/schema";
import { entryWithRelations } from "@/lib/create-operation-entry";
import { requireDocumentReadyToLeaveDraft } from "@/lib/create-operation-document-lines";
import {
  isCommercialDocumentType,
} from "@/lib/operation-documents";
import { operationEntryUpdateSchema } from "@/lib/operation-fields";
import { canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; entryId: string }>;
};

async function loadEntry(operationId: string, entryId: string) {
  return db.query.operationEntries.findFirst({
    where: and(
      eq(operationEntries.id, entryId),
      eq(operationEntries.operationId, operationId),
    ),
    with: entryWithRelations,
  });
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, entryId } = await context.params;
  const entry = await loadEntry(id, entryId);

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

export async function PATCH(request: Request, context: RouteContext) {
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
    const input = operationEntryUpdateSchema.parse(body);

    const existing = await db.query.operationEntries.findFirst({
      where: and(
        eq(operationEntries.id, entryId),
        eq(operationEntries.operationId, id),
      ),
    });

    if (!existing) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    if (
      input.documentStage &&
      isCommercialDocumentType(existing.entryType) &&
      existing.documentStage === "draft" &&
      input.documentStage !== "draft"
    ) {
      await requireDocumentReadyToLeaveDraft(entryId);
      if (existing.entryType === "procurement") {
        const vendorId =
          input.vendorOrganizationId === undefined
            ? existing.vendorOrganizationId
            : input.vendorOrganizationId;
        if (!vendorId) {
          return NextResponse.json(
            { error: "Choose a supplier before sending" },
            { status: 400 },
          );
        }
      }
    }

    const patch: Record<string, unknown> = {};

    if (input.body !== undefined) {
      patch.body = input.body;
    }

    if (input.status !== undefined) {
      patch.status = input.status;
    }

    if (input.assignedToId !== undefined) {
      patch.assignedToId = input.assignedToId;
    }

    if (input.documentStage !== undefined) {
      patch.documentStage = input.documentStage;
    }

    if (input.vendorOrganizationId !== undefined) {
      patch.vendorOrganizationId = input.vendorOrganizationId;
    }

    if (input.vendorContactId !== undefined) {
      patch.vendorContactId = input.vendorContactId;
    }

    if (Object.keys(patch).length > 0) {
      await db
        .update(operationEntries)
        .set(patch)
        .where(eq(operationEntries.id, entryId));
    }

    if (input.status !== undefined && existing.entryType === "task") {
      await db
        .update(tasks)
        .set({
          status: input.status === "done" ? "done" : "todo",
          updatedAt: new Date(),
        })
        .where(eq(tasks.operationEntryId, entryId));
    }

    const updated = await loadEntry(id, entryId);

    return NextResponse.json({ entry: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    if (error instanceof Error && error.message.includes("line")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("quantity")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("amount")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (error instanceof Error && error.message.includes("Total")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to update entry" },
      { status: 500 },
    );
  }
}
