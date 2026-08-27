import { asc, eq } from "drizzle-orm";

import { db } from "@/db";
import { operationActivityTypes } from "@/db/schema";
import {
  defaultOperationActivityTypes,
  slugifyActivityType,
  type OperationActivityTypeRecord,
} from "@/lib/operation-activity-types";

function toRecord(row: {
  id: string;
  slug: string;
  label: string;
  moneyKind: OperationActivityTypeRecord["moneyKind"];
  sortOrder: number;
}): OperationActivityTypeRecord {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    moneyKind: row.moneyKind,
    sortOrder: row.sortOrder,
  };
}

export async function ensureDefaultActivityTypes() {
  const existing = await db.select().from(operationActivityTypes);
  const taken = new Set(existing.map((row) => row.slug.toLowerCase()));
  const missing = defaultOperationActivityTypes.filter(
    (type) => !taken.has(type.slug.toLowerCase()),
  );

  if (missing.length === 0) return existing;

  await db.insert(operationActivityTypes).values(
    missing.map((type) => ({
      id: crypto.randomUUID(),
      slug: type.slug,
      label: type.label,
      moneyKind: type.moneyKind,
      sortOrder: type.sortOrder,
    })),
  );

  return db.select().from(operationActivityTypes);
}

export async function listOperationActivityTypes() {
  const rows = await ensureDefaultActivityTypes();
  const ordered = [...rows].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  if (ordered.length > 0) {
    return ordered.map(toRecord);
  }

  return defaultOperationActivityTypes.map((type) => ({
    id: `seed-${type.slug}`,
    ...type,
  }));
}

export async function createOperationActivityType(
  input: { label: string; moneyKind: OperationActivityTypeRecord["moneyKind"] },
  createdById: string,
) {
  const label = input.label.trim();
  const baseSlug = slugifyActivityType(label);

  const existing = await db.select().from(operationActivityTypes);
  const byLabel = existing.find(
    (row) => row.label.toLowerCase() === label.toLowerCase(),
  );
  if (byLabel) return toRecord(byLabel);

  const bySlug = existing.find(
    (row) => row.slug.toLowerCase() === baseSlug.toLowerCase(),
  );
  if (bySlug) return toRecord(bySlug);

  let slug = baseSlug;
  let suffix = 2;
  const taken = new Set(existing.map((row) => row.slug.toLowerCase()));
  while (taken.has(slug.toLowerCase())) {
    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const maxSort = existing.reduce(
    (max, row) => Math.max(max, row.sortOrder),
    120,
  );

  const id = crypto.randomUUID();
  await db.insert(operationActivityTypes).values({
    id,
    slug,
    label,
    moneyKind: input.moneyKind,
    sortOrder: maxSort + 10,
    createdById,
  });

  const created = await db
    .select()
    .from(operationActivityTypes)
    .where(eq(operationActivityTypes.id, id))
    .then((rows) => rows[0]);

  if (!created) {
    throw new Error("Failed to create activity type");
  }

  return toRecord(created);
}

export async function resolveActivityTypeSlug(input: string) {
  const trimmed = input.trim();
  if (!trimmed) return "note";

  const types = await listOperationActivityTypes();
  const match = types.find(
    (type) =>
      type.slug.toLowerCase() === trimmed.toLowerCase() ||
      type.label.toLowerCase() === trimmed.toLowerCase(),
  );

  return match?.slug ?? trimmed;
}
