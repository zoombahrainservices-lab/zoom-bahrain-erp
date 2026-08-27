import {
  appCapabilities,
  type AppCapability,
} from "@/lib/app-capabilities";

/** @deprecated Use appCapabilities. Kept so old imports still resolve. */
export type BranchStatus = AppCapability["status"];

export type ErpBranch = {
  id: string;
  name: string;
  description: string;
  icon: AppCapability["icon"];
  status: BranchStatus;
  href?: string;
};

export const erpBranches: ErpBranch[] = appCapabilities
  .filter((item) => item.group === "later" || item.id === "procurement")
  .map((item) => ({
    id: item.id,
    name: item.label,
    description: item.how,
    icon: item.icon,
    status: item.status,
    href: item.href,
  }));
