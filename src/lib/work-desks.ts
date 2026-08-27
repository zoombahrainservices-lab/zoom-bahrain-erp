import type { ContactKind } from "@/db/schema";

export const workDeskIds = [
  "hr",
  "logistics",
  "inventory",
  "marketing",
  "planning",
  "accounting",
] as const;

export type WorkDeskId = (typeof workDeskIds)[number];
export type WorkParty = "contact" | "organization";
export type WorkListKind = "operations" | "entries" | "tasks" | "money";

export type WorkAttach = "new" | "existing";

export type WorkStartAction = {
  id: string;
  label: string;
  how: string;
  divisionId: string;
  entryType: string;
  titlePrefix: string;
  party: WorkParty;
  attachTo?: WorkAttach;
  markKind?: ContactKind;
};

export type WorkDesk = {
  id: WorkDeskId;
  title: string;
  blurb: string;
  href: string;
  list: {
    kind: WorkListKind;
    divisionIds?: string[];
    entryTypes?: string[];
  };
  people?: boolean;
  starts: WorkStartAction[];
};

export const moneyEntryTypes = [
  "quotation",
  "invoice",
  "proposal",
  "procurement",
  "cost",
] as const;

export const workDesks: Record<WorkDeskId, WorkDesk> = {
  hr: {
    id: "hr",
    title: "Human Resources",
    blurb:
      "People are contacts. Hiring, leave, visa, and training become operations — usually under Administration.",
    href: "/hr",
    list: { kind: "operations", divisionIds: ["administration"] },
    people: true,
    starts: [
      {
        id: "hire",
        label: "Hire",
        how: "A person joining Zoom.",
        divisionId: "administration",
        entryType: "hire",
        titlePrefix: "Hire",
        party: "contact",
        markKind: "candidate",
      },
      {
        id: "leave",
        label: "Leave",
        how: "Time off for a person.",
        divisionId: "administration",
        entryType: "leave",
        titlePrefix: "Leave",
        party: "contact",
        markKind: "staff",
      },
      {
        id: "visa",
        label: "Visa / LMRA",
        how: "Immigration file for a person.",
        divisionId: "administration",
        entryType: "visa",
        titlePrefix: "Visa",
        party: "contact",
        markKind: "staff",
      },
      {
        id: "training",
        label: "Training",
        how: "Learning for a person.",
        divisionId: "education-training",
        entryType: "training",
        titlePrefix: "Training",
        party: "contact",
      },
    ],
  },
  logistics: {
    id: "logistics",
    title: "Logistics",
    blurb:
      "Cargo moves on an operation. The client is an organization. The driver or consignee is a contact.",
    href: "/logistics",
    list: { kind: "entries", entryTypes: ["shipment", "pickup", "delivery"] },
    starts: [
      {
        id: "shipment",
        label: "Shipment",
        how: "Coordinated cargo movement.",
        divisionId: "logistics",
        entryType: "shipment",
        titlePrefix: "Shipment",
        party: "organization",
      },
      {
        id: "pickup",
        label: "Pickup",
        how: "Collect from a company.",
        divisionId: "logistics",
        entryType: "pickup",
        titlePrefix: "Pickup",
        party: "organization",
      },
      {
        id: "delivery",
        label: "Delivery",
        how: "Deliver to a company.",
        divisionId: "logistics",
        entryType: "delivery",
        titlePrefix: "Delivery",
        party: "organization",
      },
    ],
  },
  inventory: {
    id: "inventory",
    title: "Inventory",
    blurb:
      "Stock lives on a warehousing operation. Receiving, storage, and dispatch are thread items.",
    href: "/inventory",
    list: { kind: "entries", entryTypes: ["receiving", "storage", "dispatch"] },
    starts: [
      {
        id: "receiving",
        label: "Receiving",
        how: "Goods in for a company.",
        divisionId: "warehousing",
        entryType: "receiving",
        titlePrefix: "Receiving",
        party: "organization",
      },
      {
        id: "storage",
        label: "Storage",
        how: "Hold stock for a company.",
        divisionId: "warehousing",
        entryType: "storage",
        titlePrefix: "Storage",
        party: "organization",
      },
      {
        id: "dispatch",
        label: "Dispatch",
        how: "Release stock for a company.",
        divisionId: "warehousing",
        entryType: "dispatch",
        titlePrefix: "Dispatch",
        party: "organization",
      },
    ],
  },
  marketing: {
    id: "marketing",
    title: "Marketing",
    blurb:
      "Campaigns, events, and property files. The client is an organization. The work is an operation.",
    href: "/marketing",
    list: {
      kind: "operations",
      divisionIds: ["advertising", "events", "e-commerce", "real-estate"],
    },
    starts: [
      {
        id: "campaign-adv",
        label: "Advertising",
        how: "Media or brand campaign.",
        divisionId: "advertising",
        entryType: "campaign",
        titlePrefix: "Campaign",
        party: "organization",
      },
      {
        id: "event",
        label: "Event",
        how: "Conference, exhibition, or activation.",
        divisionId: "events",
        entryType: "campaign",
        titlePrefix: "Event",
        party: "organization",
      },
      {
        id: "commerce",
        label: "Commerce",
        how: "Online retail campaign.",
        divisionId: "e-commerce",
        entryType: "campaign",
        titlePrefix: "Commerce",
        party: "organization",
      },
      {
        id: "lease",
        label: "Lease",
        how: "Property lease for a company.",
        divisionId: "real-estate",
        entryType: "lease",
        titlePrefix: "Lease",
        party: "organization",
      },
      {
        id: "tenancy",
        label: "Tenancy",
        how: "Tenant file for a company.",
        divisionId: "real-estate",
        entryType: "tenancy",
        titlePrefix: "Tenancy",
        party: "organization",
      },
    ],
  },
  planning: {
    id: "planning",
    title: "Planning",
    blurb:
      "Dates that already belong to operations. Open a row to work it on the file.",
    href: "/planning",
    list: { kind: "tasks" },
    starts: [
      {
        id: "todo",
        label: "To-do",
        how: "Add a to-do on an existing operation.",
        divisionId: "group",
        entryType: "task",
        titlePrefix: "To-do",
        party: "organization",
        attachTo: "existing",
      },
    ],
  },
  accounting: {
    id: "accounting",
    title: "Accounting",
    blurb:
      "Money in and money out from the operation thread. Quotations, invoices, costs, procurement.",
    href: "/accounting",
    list: { kind: "money", entryTypes: [...moneyEntryTypes] },
    starts: [
      {
        id: "quotation",
        label: "Quotation",
        how: "Add a client offer on an existing operation.",
        divisionId: "group",
        entryType: "quotation",
        titlePrefix: "Quotation",
        party: "organization",
        attachTo: "existing",
      },
      {
        id: "invoice",
        label: "Invoice",
        how: "Bill on an existing operation.",
        divisionId: "group",
        entryType: "invoice",
        titlePrefix: "Invoice",
        party: "organization",
        attachTo: "existing",
      },
      {
        id: "procurement",
        label: "Procurement",
        how: "Vendor prices on an existing operation.",
        divisionId: "group",
        entryType: "procurement",
        titlePrefix: "Procurement",
        party: "organization",
        attachTo: "existing",
      },
      {
        id: "cost",
        label: "Cost",
        how: "Money out on an existing operation.",
        divisionId: "group",
        entryType: "cost",
        titlePrefix: "Cost",
        party: "organization",
        attachTo: "existing",
      },
    ],
  },
};

export function getWorkDesk(id: string) {
  return workDesks[id as WorkDeskId];
}
