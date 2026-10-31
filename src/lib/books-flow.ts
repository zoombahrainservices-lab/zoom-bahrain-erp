/**
 * Party-first billing steps. Sale invoices and quotations still open the
 * existing document editors. Orders, delivery notes, and returns are working
 * slips on the same operation and do not replace those documents.
 */

export const bookSlipStages = ["draft", "sent", "accepted", "cancelled"] as const;

export type BookSlipStage = (typeof bookSlipStages)[number];
export type BookOpen = "document" | "slip" | "form";
export type BookMenu = "sale" | "purchase";

export type BookKind = {
  id: string;
  label: string;
  menu: BookMenu;
  href: string;
  createHref?: string;
  createLabel?: string;
  entryType?: string;
  opens: BookOpen;
  party: "customer" | "supplier";
  blurb: string;
  keywords: string[];
  stages: readonly BookSlipStage[];
  convertTo: readonly string[];
};

export const bookKinds: BookKind[] = [
  {
    id: "sale-invoice",
    label: "Sale Invoices",
    menu: "sale",
    href: "/accounting/sales",
    createHref: "/accounting/start/sale-invoice",
    createLabel: "New sale invoice",
    entryType: "invoice",
    opens: "document",
    party: "customer",
    blurb: "Bill a customer. The invoice that opens is the current invoice document.",
    keywords: ["sale", "invoice", "customer invoice", "add sale"],
    stages: [],
    convertTo: [],
  },
  {
    id: "payment-in",
    label: "Payment In",
    menu: "sale",
    href: "/accounting/receipts",
    createHref: "/accounting/receipts?new=1",
    createLabel: "Receive payment",
    opens: "form",
    party: "customer",
    blurb: "Money received from a customer, applied to an open invoice.",
    keywords: ["payment in", "receipt", "receive", "collection"],
    stages: [],
    convertTo: [],
  },
  {
    id: "sale-order",
    label: "Sale Order",
    menu: "sale",
    href: "/accounting/transactions/sale-order",
    createHref: "/accounting/start/sale-order",
    createLabel: "New sale order",
    entryType: "sale_order",
    opens: "slip",
    party: "customer",
    blurb: "What the customer ordered, before you send a quotation or an invoice.",
    keywords: ["sale order", "order", "so"],
    stages: ["draft", "sent", "accepted", "cancelled"],
    convertTo: ["quotation", "sale-invoice"],
  },
  {
    id: "quotation",
    label: "Estimate / Quotation",
    menu: "sale",
    href: "/quotation",
    createHref: "/accounting/start/quotation",
    createLabel: "New estimate",
    entryType: "quotation",
    opens: "document",
    party: "customer",
    blurb: "A customer estimate. The quotation that opens is the current quotation document.",
    keywords: ["estimate", "quotation", "quote", "offer"],
    stages: [],
    convertTo: [],
  },
  {
    id: "delivery",
    label: "Sales Delivery Note",
    menu: "sale",
    href: "/accounting/transactions/delivery",
    createHref: "/accounting/start/delivery",
    createLabel: "New delivery note",
    entryType: "delivery_note",
    opens: "slip",
    party: "customer",
    blurb: "Goods handed to the customer. This is a sales delivery note, not a logistics delivery, and it does not post a sale by itself.",
    keywords: ["delivery", "challan", "dispatch note"],
    stages: ["draft", "sent", "cancelled"],
    convertTo: ["sale-invoice"],
  },
  {
    id: "sale-return",
    label: "Sale Return",
    menu: "sale",
    href: "/accounting/transactions/sale-return",
    createHref: "/accounting/start/sale-return",
    createLabel: "New sale return",
    entryType: "sale_return",
    opens: "slip",
    party: "customer",
    blurb: "Goods or lines coming back. The original invoice stays as it is until you change that document.",
    keywords: ["sale return", "credit", "return"],
    stages: ["draft", "sent", "cancelled"],
    convertTo: [],
  },
  {
    id: "purchase-bill",
    label: "Purchase Bills",
    menu: "purchase",
    href: "/accounting/purchases",
    createHref: "/accounting/purchases?new=bill",
    createLabel: "Add bill",
    opens: "form",
    party: "supplier",
    blurb: "A supplier bill. Drafts stay off the ledger until they are approved and posted.",
    keywords: ["purchase", "bill", "supplier"],
    stages: [],
    convertTo: [],
  },
  {
    id: "payment-out",
    label: "Payment Out",
    menu: "purchase",
    href: "/accounting/payouts",
    createHref: "/accounting/payouts?new=1",
    createLabel: "Pay supplier",
    opens: "form",
    party: "supplier",
    blurb: "Money paid to a supplier, applied to an open bill.",
    keywords: ["payment out", "pay", "supplier payment"],
    stages: [],
    convertTo: [],
  },
  {
    id: "purchase-order",
    label: "Purchase Order",
    menu: "purchase",
    href: "/accounting/transactions/purchase-order",
    createHref: "/accounting/start/purchase-order",
    createLabel: "New purchase order",
    entryType: "purchase_order",
    opens: "slip",
    party: "supplier",
    blurb: "What you asked a supplier for, before the bill arrives.",
    keywords: ["purchase order", "po"],
    stages: ["draft", "sent", "accepted", "cancelled"],
    convertTo: ["procurement"],
  },
  {
    id: "purchase-return",
    label: "Purchase Return",
    menu: "purchase",
    href: "/accounting/transactions/purchase-return",
    createHref: "/accounting/start/purchase-return",
    createLabel: "New purchase return",
    entryType: "purchase_return",
    opens: "slip",
    party: "supplier",
    blurb: "Goods going back to a supplier. A posted supplier credit note is still raised on the bill.",
    keywords: ["purchase return", "debit note", "return"],
    stages: ["draft", "sent", "cancelled"],
    convertTo: [],
  },
  {
    id: "expense",
    label: "Expenses",
    menu: "purchase",
    href: "/accounting/expenses",
    createHref: "/accounting/expenses?new=1",
    createLabel: "Add expense",
    opens: "form",
    party: "supplier",
    blurb: "A cost that is not a supplier bill: one amount, one category.",
    keywords: ["expense", "cost"],
    stages: [],
    convertTo: [],
  },
  {
    id: "procurement",
    label: "Procurement",
    menu: "purchase",
    href: "/procurement",
    createHref: "/accounting/start/procurement",
    createLabel: "New procurement",
    entryType: "procurement",
    opens: "document",
    party: "supplier",
    blurb: "Vendor prices on the operation, using the current procurement document.",
    keywords: ["procurement", "vendor", "supplier quote"],
    stages: [],
    convertTo: [],
  },
];

const byId = new Map(bookKinds.map((kind) => [kind.id, kind]));
const byEntryType = new Map(
  bookKinds.flatMap((kind) => (kind.entryType ? [[kind.entryType, kind] as const] : [])),
);

export function getBookKind(id: string) {
  return byId.get(id) ?? null;
}

export function bookKindByEntryType(entryType: string) {
  return byEntryType.get(entryType) ?? null;
}

export function isBookSlipType(entryType: string) {
  return bookKindByEntryType(entryType)?.opens === "slip";
}

export function bookKindsFor(menu: BookMenu) {
  return bookKinds.filter((kind) => kind.menu === menu);
}

export function bookSlipHref(kindId: string, operationId: string, entryId: string) {
  return `/accounting/transactions/${kindId}/${operationId}/${entryId}`;
}

export function bookStartHref(kindId: string) {
  return `/accounting/start/${kindId}`;
}
