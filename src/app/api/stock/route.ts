import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { stockDocuments } from "@/db/schema";
import { assertCompanyAllowed } from "@/lib/accounting/phase3";
import { getDivisionById } from "@/lib/divisions";
import { canAccessOperations, canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { stockActorFromSession } from "@/lib/stock/auth";
import { StockError } from "@/lib/stock/errors";
import {
  approveOperationalDocument,
  postOperationalDocument,
  reverseOperationalDocument,
  saveOperationalDraft,
  stockActionStatus,
} from "@/lib/stock/operational";
import { inStockTransaction } from "@/lib/stock/posting";
import { loadInventoryDesk } from "@/lib/stock/read";
import { stockDocumentKinds, stockPurposes, type StockDocumentKind, type StockOwnership, type StockPurpose } from "@/lib/stock/rules";

export const runtime = "nodejs";

const lineSchema = z.object({
  lineKey: z.string().min(1),
  sku: z.string().min(1),
  name: z.string().optional(),
  unit: z.string().optional(),
  quantity: z.string().min(1),
  unitCost: z.string().nullable().optional(),
  idempotencyKey: z.string().nullable().optional(),
});

const draftSchema = z.object({
  action: z.literal("draft"),
  id: z.string().min(1).optional(),
  companyId: z.string().min(1),
  kind: z.enum(stockDocumentKinds),
  purpose: z.enum(stockPurposes),
  ownership: z.enum(["company", "customer"]),
  ownerId: z.string().nullable().optional(),
  warehouseId: z.string().nullable().optional(),
  locationId: z.string().nullable().optional(),
  warehouseName: z.string().nullable().optional(),
  locationName: z.string().nullable().optional(),
  toWarehouseId: z.string().nullable().optional(),
  toLocationId: z.string().nullable().optional(),
  toWarehouseName: z.string().nullable().optional(),
  toLocationName: z.string().nullable().optional(),
  movedOn: z.string().min(1),
  reference: z.string().optional(),
  counterparty: z.string().optional(),
  note: z.string().optional(),
  sourceEntryId: z.string().nullable().optional(),
  procurementEntryId: z.string().nullable().optional(),
  billId: z.string().nullable().optional(),
  lines: z.array(lineSchema).min(1),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canAccessOperations(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const companyId = new URL(request.url).searchParams.get("companyId") ?? "";
  if (!getDivisionById(companyId)) return NextResponse.json({ error: "Choose a company." }, { status: 400 });
  try {
    await assertCompanyAllowed(session.userId, session.role, companyId);
    const desk = await loadInventoryDesk(companyId, {
      canPostFinancial: stockActorFromSession(session).canPostFinancial,
    });
    return NextResponse.json(desk);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageOperations(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const actor = stockActorFromSession(session);
  try {
    const body = await request.json();
    const action = z.object({ action: z.enum(["draft", "approve", "post", "reverse"]) }).parse(body).action;
    if (action === "draft") {
      const input = draftSchema.parse(body);
      await assertKnownCompany(session.userId, session.role, input.companyId);
      const result = await inStockTransaction((tx) => saveOperationalDraft(tx, {
        ...input,
        kind: input.kind as StockDocumentKind,
        purpose: input.purpose as StockPurpose,
        ownership: input.ownership as StockOwnership,
        lines: input.lines.map((line) => ({
          ...line,
          name: line.name ?? "",
          unit: line.unit || "ea",
          unitCost: blankCost(line.unitCost),
        })),
        actor,
      }));
      return NextResponse.json(result);
    }
    const id = z.object({ id: z.string().min(1) }).parse(body).id;
    await guardDocument(session.userId, session.role, id);
    if (action === "approve") {
      const result = await inStockTransaction((tx) => approveOperationalDocument(tx, id, actor));
      return NextResponse.json(result);
    }
    if (action === "post") {
      const confirmZeroCost = z.object({ confirmZeroCost: z.boolean().optional() }).parse(body).confirmZeroCost === true;
      const result = await inStockTransaction((tx) => postOperationalDocument(tx, id, actor, confirmZeroCost));
      return NextResponse.json(result);
    }
    const movedOn = z.object({ movedOn: z.string().min(1) }).parse(body).movedOn;
    const result = await inStockTransaction((tx) => reverseOperationalDocument(tx, id, actor, movedOn));
    return NextResponse.json(result);
  } catch (error) {
    return failure(error);
  }
}

async function guardDocument(userId: string, role: string, documentId: string) {
  const document = await db.query.stockDocuments.findFirst({
    where: eq(stockDocuments.id, documentId),
    columns: { companyId: true },
  });
  if (!document) throw new StockError("Stock document not found.");
  await assertKnownCompany(userId, role, document.companyId);
}

async function assertKnownCompany(userId: string, role: string, companyId: string) {
  if (!getDivisionById(companyId)) throw new StockError("Choose a company.");
  await assertCompanyAllowed(userId, role, companyId);
}

function blankCost(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function failure(error: unknown) {
  const mapped = stockActionStatus(error);
  if (mapped) return NextResponse.json({ error: mapped.error }, { status: mapped.status });
  if (error instanceof z.ZodError) {
    return NextResponse.json({ error: error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: "Stock request failed" }, { status: 500 });
}
