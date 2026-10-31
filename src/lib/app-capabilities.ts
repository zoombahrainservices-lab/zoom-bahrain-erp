import type { ComponentType, SVGProps } from "react";
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BriefcaseIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckCircleIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  DocumentTextIcon,
  BookOpenIcon,
  ClockIcon,
  HomeIcon,
  IdentificationIcon,
  MegaphoneIcon,
  RectangleStackIcon,
  PhoneArrowUpRightIcon,
  ShoppingCartIcon,
  Squares2X2Icon,
  SwatchIcon,
  TruckIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/20/solid";

export const capabilityGroups = [
  "core",
  "intake",
  "control",
  "directory",
  "system",
  "later",
] as const;

export type CapabilityGroup = (typeof capabilityGroups)[number];
export type CapabilityStatus = "live" | "later";
export type CapabilityNav = "main" | "work" | "control" | "system" | "none";

export type AppCapability = {
  id: string;
  label: string;
  href?: string;
  group: CapabilityGroup;
  nav: CapabilityNav;
  status: CapabilityStatus;
  adminOnly?: boolean;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  how: string;
  keywords: string[];
};

export const capabilityGroupLabels: Record<CapabilityGroup, string> = {
  core: "Core",
  intake: "Intake",
  control: "Control",
  directory: "Directory",
  system: "System",
  later: "Later",
};

export const appCapabilities: AppCapability[] = [
  {
    id: "dashboard",
    label: "Home",
    href: "/dashboard",
    group: "control",
    nav: "main",
    status: "live",
    icon: HomeIcon,
    how: "Sales, purchases, cash, and bank for the selected company and period.",
    keywords: ["home", "dashboard", "sales", "cash"],
  },
  {
    id: "guide",
    label: "Guide",
    href: "/guide",
    group: "control",
    nav: "none",
    status: "live",
    icon: BookOpenIcon,
    how: "How Zoom ERP works, and how it is built.",
    keywords: ["guide", "docs", "how", "overview"],
  },
  {
    id: "now",
    label: "Now",
    href: "/now",
    group: "core",
    nav: "main",
    status: "live",
    icon: ClockIcon,
    how: "What needs you today. Quiet files, waiting quotes, latest updates.",
    keywords: ["today", "pulse", "attention", "queue", "focus"],
  },
  {
    id: "functions",
    label: "Functions",
    href: "/functions",
    group: "system",
    nav: "system",
    status: "live",
    icon: Squares2X2Icon,
    how: "Map of every capability. Add new work here so it stays in one place.",
    keywords: ["map", "modules", "capabilities", "index"],
  },
  {
    id: "operations",
    label: "Operations",
    href: "/operations",
    group: "core",
    nav: "main",
    status: "live",
    icon: BriefcaseIcon,
    how: "The work file. Thread, costs, to-dos, procurement, quotations, invoices all live here.",
    keywords: ["job", "thread", "core", "work"],
  },
  {
    id: "sales",
    label: "Sales",
    href: "/sales",
    group: "intake",
    nav: "main",
    status: "live",
    icon: PhoneArrowUpRightIcon,
    how: "Log the call, then open as an operation. Work does not stay on Sales.",
    keywords: ["enquiry", "inquiry", "lead", "call"],
  },
  {
    id: "services",
    label: "Services",
    href: "/services",
    group: "intake",
    nav: "main",
    status: "live",
    icon: RectangleStackIcon,
    how: "What Zoom sells. Open a service as an operation for a company or a person.",
    keywords: ["catalog", "offer", "sell", "product"],
  },
  {
    id: "divisions",
    label: "Companies",
    href: "/divisions",
    group: "directory",
    nav: "system",
    status: "live",
    icon: BuildingOffice2Icon,
    how: "Which Zoom company owns the operation.",
    keywords: ["division", "entity"],
  },
  {
    id: "organizations",
    label: "Organizations",
    href: "/organizations",
    group: "directory",
    nav: "main",
    status: "live",
    icon: UserGroupIcon,
    how: "Companies. A company is an organization — client, supplier, carrier.",
    keywords: ["client", "supplier", "vendor", "company"],
  },
  {
    id: "contacts",
    label: "Contacts",
    href: "/contacts",
    group: "directory",
    nav: "main",
    status: "live",
    icon: IdentificationIcon,
    how: "People. A human is a contact — staff, candidate, client, or driver.",
    keywords: ["person", "people", "staff", "human"],
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    group: "control",
    nav: "main",
    status: "live",
    icon: CheckCircleIcon,
    how: "To-dos that belong to an operation. Click through to work them there.",
    keywords: ["todo", "to-do", "follow-up"],
  },
  {
    id: "quotation",
    label: "Quotations",
    href: "/quotation",
    group: "control",
    nav: "none",
    status: "live",
    icon: DocumentTextIcon,
    how: "Client offer lines. Created on the operation; this list is for control.",
    keywords: ["quote", "offer", "money in"],
  },
  {
    id: "invoice",
    label: "Sale invoices",
    href: "/invoice",
    group: "control",
    nav: "none",
    status: "live",
    icon: BanknotesIcon,
    how: "The same customer invoices as Sale Invoices. This list opens the document on its operation and does not post a second receivable.",
    keywords: ["bill", "receivable", "money in"],
  },
  {
    id: "proposal",
    label: "Proposals",
    href: "/proposal",
    group: "control",
    nav: "none",
    status: "live",
    icon: DocumentDuplicateIcon,
    how: "Package offer with the same numbers engine as a quotation.",
    keywords: ["offer", "package"],
  },
  {
    id: "procurement",
    label: "Procurement",
    href: "/procurement",
    group: "control",
    nav: "none",
    status: "live",
    icon: ShoppingCartIcon,
    how: "Vendor prices on the operation. Make the client quotation from there.",
    keywords: ["vendor", "supplier", "purchase", "money out"],
  },
  {
    id: "settings",
    label: "Settings",
    href: "/settings",
    group: "system",
    nav: "system",
    status: "live",
    icon: Cog6ToothIcon,
    how: "Google Drive and workspace connection.",
    keywords: ["drive", "google", "admin"],
  },
  {
    id: "branding",
    label: "Branding",
    href: "/branding",
    group: "system",
    nav: "system",
    status: "live",
    icon: SwatchIcon,
    how: "Zoom colours for documents and UI.",
    keywords: ["color", "logo", "identity"],
  },
  {
    id: "users",
    label: "Users",
    href: "/users",
    group: "system",
    nav: "system",
    status: "live",
    adminOnly: true,
    icon: UsersIcon,
    how: "Staff accounts. Admin only.",
    keywords: ["staff", "admin", "team"],
  },
  {
    id: "hr",
    label: "Human Resources",
    href: "/hr",
    group: "intake",
    nav: "work",
    status: "live",
    icon: UserGroupIcon,
    how: "People are contacts. Hire, leave, visa, and training are operations.",
    keywords: ["people", "staff", "leave", "visa", "lmra"],
  },
  {
    id: "logistics",
    label: "Logistics",
    href: "/logistics",
    group: "intake",
    nav: "work",
    status: "live",
    icon: TruckIcon,
    how: "Shipments, pickups, and deliveries. The client is an organization; the work is an operation.",
    keywords: ["shipment", "cargo", "delivery", "pickup", "supply"],
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/inventory",
    group: "intake",
    nav: "work",
    status: "live",
    icon: ArchiveBoxIcon,
    how: "Receiving, storage, and dispatch on a warehousing operation.",
    keywords: ["stock", "warehouse", "storage"],
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "/marketing",
    group: "intake",
    nav: "work",
    status: "live",
    icon: MegaphoneIcon,
    how: "Campaigns, events, and property. Each one is an operation for a company.",
    keywords: ["campaign", "event", "advertising"],
  },
  {
    id: "planning",
    label: "Planning",
    href: "/planning",
    group: "control",
    nav: "none",
    status: "live",
    icon: CalendarDaysIcon,
    how: "Dates that already belong to operations. Click through to work them.",
    keywords: ["calendar", "schedule", "deadline"],
  },
  {
    id: "accounting",
    label: "Accounting",
    href: "/accounting",
    group: "control",
    nav: "control",
    status: "live",
    icon: BanknotesIcon,
    how: "Company ledgers, invoices, payments, journals, and financial reports.",
    keywords: ["finance", "ledger", "payment"],
  },
];

export function getCapability(id: string) {
  return appCapabilities.find((item) => item.id === id);
}

export function capabilitiesByGroup(options?: { admin?: boolean }) {
  return capabilityGroups.map((group) => ({
    group,
    label: capabilityGroupLabels[group],
    items: appCapabilities.filter(
      (item) =>
        item.group === group && (options?.admin || !item.adminOnly),
    ),
  }));
}

export function searchableCapabilities(options?: { admin?: boolean }) {
  return appCapabilities.filter(
    (item) => options?.admin || !item.adminOnly,
  );
}

export type QuickCreateAction = {
  id: string;
  label: string;
  href: string;
  how: string;
  keywords: string[];
  adminOnly?: boolean;
};

export const quickCreateActions: QuickCreateAction[] = [
  {
    id: "create-operation",
    label: "New operation",
    href: "/operations/new",
    how: "Start a work file.",
    keywords: ["create", "add", "job", "file", "new"],
  },
  {
    id: "create-enquiry",
    label: "New enquiry",
    href: "/sales?new=true",
    how: "Log a call, then open as an operation.",
    keywords: ["create", "add", "inquiry", "call", "lead", "new"],
  },
  {
    id: "create-task",
    label: "New to-do",
    href: "/tasks",
    how: "Add a to-do that belongs to an operation.",
    keywords: ["create", "add", "task", "todo", "follow-up", "new"],
  },
  {
    id: "create-organization",
    label: "New organization",
    href: "/organizations/new",
    how: "Register a client, supplier, or other party.",
    keywords: ["create", "add", "client", "supplier", "vendor", "new"],
    adminOnly: true,
  },
  {
    id: "create-contact",
    label: "New contact",
    href: "/contacts/new",
    how: "Register a person.",
    keywords: ["create", "add", "person", "people", "new"],
    adminOnly: true,
  },
  {
    id: "create-hire",
    label: "Hire someone",
    href: "/hr",
    how: "Person first. Then an operation.",
    keywords: ["create", "hr", "staff", "candidate", "new"],
  },
  {
    id: "create-shipment",
    label: "New shipment",
    href: "/logistics",
    how: "Company first. Then an operation.",
    keywords: ["create", "logistics", "cargo", "delivery", "new"],
  },
  {
    id: "start-service",
    label: "Start a service",
    href: "/services",
    how: "Pick what Zoom sells, open as an operation.",
    keywords: ["create", "service", "catalog", "sell", "new"],
  },
];

export function visibleQuickCreates(options?: { admin?: boolean }) {
  return quickCreateActions.filter((item) => options?.admin || !item.adminOnly);
}
