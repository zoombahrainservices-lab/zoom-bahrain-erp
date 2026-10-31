import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { operationDocumentLines, operationEntries } from "@/db/schema";
import {
  assertDocumentCanBeSent,
  documentLinesTotal,
  usableDocumentLines,
  type DocumentLineDraft,
} from "@/lib/operation-document-lines";

export async function listDocumentLines(entryId: string) {
  return db.query.operationDocumentLines.findMany({
    where: eq(operationDocumentLines.entryId, entryId),
    orderBy: [asc(operationDocumentLines.sortOrder)],
  });
}

export async function replaceDocumentLines(
  entryId: string,
  lines: DocumentLineDraft[],
) {
  const usable = usableDocumentLines(lines);

  await db
    .delete(operationDocumentLines)
    .where(eq(operationDocumentLines.entryId, entryId));

  if (usable.length > 0) {
    await db.insert(operationDocumentLines).values(
      usable.map((line, index) => ({
        id: crypto.randomUUID(),
        entryId,
        description: line.description.trim(),
        quantity: line.quantity.toFixed(3),
        unitAmount: line.unitAmount.toFixed(3),
        discount: (line.discount ?? 0).toFixed(3),
        vatCodeId: line.vatCodeId || null,
        sortOrder: index,
      })),
    );
  }

  const total = documentLinesTotal(usable);
  await db
    .update(operationEntries)
    .set({ amount: usable.length > 0 ? total.toFixed(3) : null })
    .where(eq(operationEntries.id, entryId));

  return listDocumentLines(entryId);
}

export async function copyDocumentLines(
  fromEntryId: string,
  toEntryId: string,
  options?: { unitAmountMultiplier?: number },
) {
  const source = await listDocumentLines(fromEntryId);
  if (source.length === 0) {
    await db
      .update(operationEntries)
      .set({ amount: null })
      .where(eq(operationEntries.id, toEntryId));
    return [];
  }

  const multiplier = options?.unitAmountMultiplier ?? 1;
  const copied = source.map((line, index) => {
    const unitAmount =
      Math.round(Number(line.unitAmount) * multiplier * 1000) / 1000;
    return {
      id: crypto.randomUUID(),
      entryId: toEntryId,
      description: line.description,
      quantity: line.quantity,
      unitAmount: unitAmount.toFixed(3),
      sortOrder: index,
    };
  });

  await db.insert(operationDocumentLines).values(copied);

  const total = documentLinesTotal(
    copied.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitAmount: Number(line.unitAmount),
    })),
  );

  await db
    .update(operationEntries)
    .set({ amount: total.toFixed(3) })
    .where(eq(operationEntries.id, toEntryId));

  return listDocumentLines(toEntryId);
}

export async function requireDocumentReadyToLeaveDraft(entryId: string) {
  const lines = await listDocumentLines(entryId);
  return assertDocumentCanBeSent(
    lines.map((line) => ({
      description: line.description,
      quantity: Number(line.quantity),
      unitAmount: Number(line.unitAmount),
    })),
  );
}
