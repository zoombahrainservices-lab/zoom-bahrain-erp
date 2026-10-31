import type { ComponentType, SVGProps } from "react";
import {
  ArchiveBoxIcon,
  BanknotesIcon,
  BookOpenIcon,
  BriefcaseIcon,
  ClockIcon,
  BuildingLibraryIcon,
  CalculatorIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  CheckCircleIcon,
  HomeIcon,
  MegaphoneIcon,
  RectangleStackIcon,
  ShoppingCartIcon,
  TruckIcon,
  UserGroupIcon,
  WrenchScrewdriverIcon,
} from "@heroicons/react/20/solid";

import { bookKindsFor } from "@/lib/books-flow";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

export type ShellItem = {
  id: string;
  label: string;
  href: string;
  exact?: boolean;
  adminOnly?: boolean;
  /** Shown only when this route actually starts a record. */
  createHref?: string;
  createLabel?: string;
  createAdminOnly?: boolean;
  icon?: Icon;
  keywords?: string[];
};

export type ShellModule = {
  id: string;
  label: string;
  icon: Icon;
  items: ShellItem[];
};

export type ShellSection = {
  id: string;
  label?: string;
  modules?: ShellModule[];
  items?: ShellItem[];
};

/**
 * Books menu follows a party-first billing desk: parties, items, sale,
 * purchase, cash, then the ledgers. Sale invoices and quotations still open
 * the existing documents.
 */
export const shellHome: ShellItem = {
  id: "home",
  label: "Home",
  href: "/dashboard",
  exact: true,
  icon: HomeIcon,
  keywords: ["home", "dashboard", "start"],
};

export const shellGuide: ShellItem = {
  id: "guide",
  label: "Guide",
  href: "/guide",
  exact: true,
  icon: BookOpenIcon,
  keywords: ["guide", "help", "how"],
};

export const shellNow: ShellItem = {
  id: "now",
  label: "Now",
  href: "/now",
  icon: ClockIcon,
  keywords: ["now", "today", "attention"],
};

export const shellPins: ShellItem[] = [shellHome, shellGuide, shellNow];

function bookShellItems(menu: "sale" | "purchase"): ShellItem[] {
  return bookKindsFor(menu).map((kind) => ({
    id: kind.id === "purchase-bill" ? "bills-expenses" : kind.id,
    label: kind.label,
    href: kind.href,
    createHref: kind.createHref,
    createLabel: kind.createLabel,
    keywords: kind.keywords,
  }));
}

export const financialModules: ShellModule[] = [
  {
    id: "organizations",
    label: "Organizations",
    icon: UserGroupIcon,
    items: [
      {
        id: "organizations",
        label: "Organizations",
        href: "/organizations",
        createHref: "/organizations/new",
        createLabel: "New organization",
        createAdminOnly: true,
        keywords: ["party", "customer", "supplier", "organization", "client"],
      },
      {
        id: "contacts",
        label: "Contacts",
        href: "/contacts",
        createHref: "/contacts/new",
        createLabel: "New contact",
        createAdminOnly: true,
        keywords: ["person", "contact", "people"],
      },
    ],
  },
  {
    id: "sale",
    label: "Sale",
    icon: BanknotesIcon,
    items: [
      ...bookShellItems("sale"),
      {
        id: "enquiries",
        label: "Enquiries",
        href: "/sales",
        createHref: "/sales?new=true",
        createLabel: "New enquiry",
        keywords: ["enquiry", "inquiry", "lead", "call"],
      },
      {
        id: "proposals",
        label: "Proposals",
        href: "/proposal",
        keywords: ["proposal", "package", "offer"],
      },
    ],
  },
  {
    id: "purchase",
    label: "Purchase & Expense",
    icon: ShoppingCartIcon,
    items: bookShellItems("purchase"),
  },
  {
    id: "cash",
    label: "Cash, Bank & Assets",
    icon: BuildingLibraryIcon,
    items: [
      {
        id: "bank-accounts",
        label: "Bank Accounts",
        href: "/accounting/banking",
        keywords: ["bank", "cash", "account", "reconciliation", "statement"],
      },
      {
        id: "payments-receipts",
        label: "Payments & Receipts",
        href: "/accounting/payments",
        keywords: ["payment", "receipt", "payment-in", "payment-out", "receive"],
      },
    ],
  },
  {
    id: "accounting",
    label: "Accounting",
    icon: CalculatorIcon,
    items: [
      {
        id: "books-overview",
        label: "Overview",
        href: "/accounting",
        exact: true,
        keywords: ["accounting", "overview", "books"],
      },
      {
        id: "chart",
        label: "Chart of Accounts",
        href: "/accounting/accounts",
        keywords: ["chart", "accounts", "ledger accounts"],
      },
      {
        id: "journals",
        label: "Journal Entries",
        href: "/accounting/journals",
        createHref: "/accounting/journals/new",
        createLabel: "New journal",
        keywords: ["journal", "entry", "voucher"],
      },
      {
        id: "ledgers",
        label: "Ledgers",
        href: "/accounting/ledgers",
        keywords: ["ledger", "customer", "supplier", "party"],
      },
      {
        id: "vat",
        label: "VAT",
        href: "/accounting/vat",
        keywords: ["vat", "tax", "filing"],
      },
      {
        id: "employees",
        label: "Employees",
        href: "/accounting/employees",
        keywords: ["employee", "payroll", "staff"],
      },
      {
        id: "operation-money",
        label: "Operation money",
        href: "/accounting/desk",
        keywords: ["operation", "money", "create invoice", "desk"],
      },
      {
        id: "control",
        label: "Control",
        href: "/accounting/control",
        keywords: ["control", "intercompany", "reminder", "payroll", "access"],
      },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    icon: ChartBarIcon,
    items: [
      {
        id: "financial-reports",
        label: "Financial reports",
        href: "/accounting/reports",
        keywords: ["report", "profit", "balance sheet", "trial balance", "cash flow"],
      },
      {
        id: "analytics",
        label: "Analytics",
        href: "/accounting/analytics",
        keywords: ["analytics", "margin", "trend"],
      },
    ],
  },
  {
    id: "utilities",
    label: "Utilities",
    icon: WrenchScrewdriverIcon,
    items: [
      {
        id: "companies",
        label: "Companies",
        href: "/divisions",
        keywords: ["company", "division", "entity"],
      },
      {
        id: "settings",
        label: "Settings",
        href: "/settings",
        keywords: ["settings", "drive", "google"],
      },
      {
        id: "branding",
        label: "Branding",
        href: "/branding",
        keywords: ["branding", "colour", "color", "logo"],
      },
      {
        id: "functions",
        label: "Functions",
        href: "/functions",
        keywords: ["functions", "capabilities", "map"],
      },
      {
        id: "users",
        label: "Users",
        href: "/users",
        adminOnly: true,
        keywords: ["users", "staff", "admin"],
      },
    ],
  },
];

export const zoomItems: ShellItem[] = [
  {
    id: "operations",
    label: "Operations",
    href: "/operations",
    createHref: "/operations/new",
    createLabel: "New operation",
    icon: BriefcaseIcon,
    keywords: ["operation", "job", "file"],
  },
  {
    id: "tasks",
    label: "Tasks",
    href: "/tasks",
    icon: CheckCircleIcon,
    keywords: ["task", "todo", "to-do"],
  },
  {
    id: "services",
    label: "Services",
    href: "/services",
    icon: RectangleStackIcon,
    keywords: ["service", "catalog", "what zoom sells"],
  },
  {
    id: "hr",
    label: "Human Resources",
    href: "/hr",
    icon: UserGroupIcon,
    keywords: ["hr", "human resources", "hire", "leave"],
  },
  {
    id: "logistics",
    label: "Logistics",
    href: "/logistics",
    icon: TruckIcon,
    keywords: ["logistics", "shipment", "logistics delivery"],
  },
  {
    id: "marketing",
    label: "Marketing",
    href: "/marketing",
    icon: MegaphoneIcon,
    keywords: ["marketing", "campaign"],
  },
  {
    id: "inventory",
    label: "Inventory",
    href: "/inventory",
    icon: ArchiveBoxIcon,
    keywords: ["inventory", "stock", "warehouse"],
  },
  {
    id: "planning",
    label: "Planning",
    href: "/planning",
    icon: CalendarDaysIcon,
    keywords: ["planning", "calendar", "schedule"],
  },
];

export const shellSections: ShellSection[] = [
  { id: "financial", modules: financialModules },
  { id: "zoom", label: "Zoom", items: zoomItems },
];

function canSee(item: ShellItem, admin: boolean) {
  return admin || !item.adminOnly;
}

function presentItem(item: ShellItem, admin: boolean): ShellItem {
  if (item.createAdminOnly && !admin) {
    return { ...item, createHref: undefined, createLabel: undefined };
  }
  return item;
}

export function visibleFinancialModules(options?: { admin?: boolean }) {
  const admin = options?.admin ?? false;
  return financialModules
    .map((module) => ({
      ...module,
      items: module.items.filter((item) => canSee(item, admin)).map((item) => presentItem(item, admin)),
    }))
    .filter((module) => module.items.length > 0);
}

export function visibleZoomItems(options?: { admin?: boolean }) {
  const admin = options?.admin ?? false;
  return zoomItems.filter((item) => canSee(item, admin)).map((item) => presentItem(item, admin));
}

export function collectShellItems(options?: { admin?: boolean }) {
  const admin = options?.admin ?? false;
  return [
    ...shellPins.map((item) => presentItem(item, admin)),
    ...visibleFinancialModules({ admin }).flatMap((module) => module.items),
    ...visibleZoomItems({ admin }),
  ];
}

export function shellItemPath(href: string) {
  return href.split("?")[0];
}

export function isShellItemCurrent(pathname: string, item: ShellItem, items: ShellItem[]) {
  const path = shellItemPath(item.href);
  const current = shellItemPath(pathname);
  if (item.exact) return current === path;
  if (current === path) return true;
  if (!current.startsWith(`${path}/`)) return false;
  return !items.some((other) => {
    if (other.id === item.id || other.exact) return false;
    const otherPath = shellItemPath(other.href);
    if (otherPath.length <= path.length) return false;
    return current === otherPath || current.startsWith(`${otherPath}/`);
  });
}

export function activeShellModuleId(pathname: string, options?: { admin?: boolean }) {
  const items = collectShellItems(options);
  const modules = visibleFinancialModules(options);
  return (
    modules.find((module) =>
      module.items.some((item) => isShellItemCurrent(pathname, item, items)),
    )?.id ?? null
  );
}
