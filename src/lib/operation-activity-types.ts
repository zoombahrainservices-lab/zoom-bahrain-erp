import type { OperationActivityMoneyKind } from "@/db/schema";

export type OperationActivityTypeRecord = {
  id: string;
  slug: string;
  label: string;
  moneyKind: OperationActivityMoneyKind;
  sortOrder: number;
};

export const defaultOperationActivityTypes: Omit<
  OperationActivityTypeRecord,
  "id"
>[] = [
  { slug: "note", label: "Update", moneyKind: "none", sortOrder: 10 },
  { slug: "meeting", label: "Call / meeting", moneyKind: "none", sortOrder: 20 },
  { slug: "task", label: "To-do", moneyKind: "none", sortOrder: 30 },
  { slug: "document", label: "Document", moneyKind: "none", sortOrder: 40 },
  { slug: "procurement", label: "Procurement", moneyKind: "out", sortOrder: 45 },
  { slug: "quotation", label: "Quotation", moneyKind: "in", sortOrder: 50 },
  { slug: "invoice", label: "Invoice", moneyKind: "in", sortOrder: 60 },
  { slug: "sale_order", label: "Sale order", moneyKind: "in", sortOrder: 62 },
  { slug: "delivery_note", label: "Delivery note", moneyKind: "none", sortOrder: 64 },
  { slug: "sale_return", label: "Sale return", moneyKind: "in", sortOrder: 66 },
  { slug: "cost", label: "Cost", moneyKind: "out", sortOrder: 70 },
  { slug: "purchase_order", label: "Purchase order", moneyKind: "out", sortOrder: 72 },
  { slug: "purchase_return", label: "Purchase return", moneyKind: "out", sortOrder: 74 },
  { slug: "proposal", label: "Proposal", moneyKind: "in", sortOrder: 80 },
  { slug: "request", label: "Request", moneyKind: "none", sortOrder: 90 },
  { slug: "incident", label: "Incident", moneyKind: "none", sortOrder: 100 },
  { slug: "recurring", label: "Recurring", moneyKind: "none", sortOrder: 110 },
  { slug: "hire", label: "Hire", moneyKind: "none", sortOrder: 130 },
  { slug: "leave", label: "Leave", moneyKind: "none", sortOrder: 140 },
  { slug: "visa", label: "Visa / LMRA", moneyKind: "none", sortOrder: 150 },
  { slug: "training", label: "Training", moneyKind: "none", sortOrder: 160 },
  { slug: "shipment", label: "Shipment", moneyKind: "none", sortOrder: 170 },
  { slug: "pickup", label: "Pickup", moneyKind: "none", sortOrder: 180 },
  { slug: "delivery", label: "Delivery", moneyKind: "none", sortOrder: 190 },
  { slug: "receiving", label: "Receiving", moneyKind: "none", sortOrder: 200 },
  { slug: "storage", label: "Storage", moneyKind: "none", sortOrder: 210 },
  { slug: "dispatch", label: "Dispatch", moneyKind: "none", sortOrder: 220 },
  { slug: "campaign", label: "Campaign", moneyKind: "none", sortOrder: 230 },
  { slug: "lease", label: "Lease", moneyKind: "in", sortOrder: 235 },
  { slug: "tenancy", label: "Tenancy", moneyKind: "in", sortOrder: 236 },
  { slug: "other", label: "Other", moneyKind: "none", sortOrder: 240 },
];

export const activityTypeGroups = [
  { id: "people", label: "People", slugs: ["hire", "leave", "visa", "training"] },
  {
    id: "move",
    label: "Move",
    slugs: ["shipment", "pickup", "delivery", "receiving", "storage", "dispatch"],
  },
  { id: "property", label: "Property", slugs: ["lease", "tenancy"] },
  {
    id: "offer",
    label: "Offer",
    slugs: ["campaign", "request", "proposal", "quotation"],
  },
  {
    id: "money",
    label: "Money",
    slugs: [
      "invoice",
      "sale_order",
      "delivery_note",
      "sale_return",
      "procurement",
      "purchase_order",
      "purchase_return",
      "cost",
    ],
  },
  {
    id: "daily",
    label: "Daily",
    slugs: ["note", "meeting", "task", "document", "incident", "recurring", "other"],
  },
] as const;

export function groupActivityTypes<T extends { slug: string }>(types: T[]) {
  const used = new Set<string>();
  const groups: Array<{ id: string; label: string; items: T[] }> = [];

  for (const group of activityTypeGroups) {
    const items = types.filter((type) =>
      (group.slugs as readonly string[]).includes(type.slug),
    );
    if (items.length === 0) continue;
    items.forEach((item) => used.add(item.slug));
    groups.push({ id: group.id, label: group.label, items });
  }

  const rest = types.filter((type) => !used.has(type.slug));
  if (rest.length > 0) {
    groups.push({ id: "more", label: "More", items: rest });
  }

  return groups;
}

export function slugifyActivityType(label: string) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

  return slug || "type";
}

export function getActivityTypeLabel(
  slug: string,
  types: Pick<OperationActivityTypeRecord, "slug" | "label">[] = defaultOperationActivityTypes,
) {
  return types.find((type) => type.slug === slug)?.label ?? slug;
}
