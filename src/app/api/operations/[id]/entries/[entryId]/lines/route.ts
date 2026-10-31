import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { accountingVatCodes, operationEntries } from "@/db/schema";
import { AccountingError, filsToAmount } from "@/lib/accounting/money";
import { priceSalesLine } from "@/lib/accounting/phase3-rules";
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

    let invoiceTotal: bigint | null = null;
    if (
      existing.entryType === "invoice" &&
      (existing.taxVersion === 1 || input.lines.some((line) => line.vatCodeId))
    ) {
      const codeIds = [...new Set(input.lines.flatMap((line) => (line.vatCodeId ? [line.vatCodeId] : [])))];
      const codes = codeIds.length
        ? await db
            .select()
            .from(accountingVatCodes)
            .where(inArray(accountingVatCodes.id, codeIds))
        : [];
      const byId = new Map(codes.map((code) => [code.id, code]));
      invoiceTotal = 0n;
      for (const line of input.lines) {
        if (line.quantity <= 0 || line.unitAmount <= 0) continue;
        const code = line.vatCodeId ? byId.get(line.vatCodeId) : null;
        const priced = priceSalesLine({
          description: line.description,
          quantity: line.quantity.toFixed(3),
          unitAmount: line.unitAmount.toFixed(3),
          discount: (line.discount ?? 0).toFixed(3),
          vat: code ? { id: code.id, rate: code.rate, treatment: code.treatment } : null,
        });
        invoiceTotal += priced.total;
      }
    }

    const lines = await replaceDocumentLines(entryId, input.lines);
    await db.update(operationEntries).set({
      ...(invoiceTotal !== null
        ? { taxVersion: 1, amount: filsToAmount(invoiceTotal) }
        : {}),
      issuedOn: input.issuedOn || existing.issuedOn,
      dueOn: input.dueOn || existing.dueOn,
      paymentTerms: input.paymentTerms ?? existing.paymentTerms,
      ...(input.body !== undefined ? { body: input.body } : {}),
    }).where(eq(operationEntries.id, entryId));
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

    if (
      error instanceof AccountingError ||
      (error instanceof Error &&
        (error.message.includes("Sales invoices") ||
          error.message.includes("Quantity") ||
          error.message.includes("Discount") ||
          error.message.includes("VAT")))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to save lines" },
      { status: 500 },
    );
  }
}
