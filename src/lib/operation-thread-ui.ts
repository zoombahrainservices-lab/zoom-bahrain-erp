import { getDivisionById } from "@/lib/divisions";
import { operationEntryTypeOptions } from "@/lib/operation-fields";

export function getInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const builtInEntryTypeStyles: Record<
  string,
  { label: string; chip: string; dot: string }
> = {
  task: {
    label: "To-do",
    chip: "bg-sky-100/80 text-sky-900",
    dot: "bg-sky-500",
  },
  proposal: {
    label: "Proposal",
    chip: "bg-violet-100/80 text-violet-900",
    dot: "bg-violet-500",
  },
  quotation: {
    label: "Quotation",
    chip: "bg-amber-100/80 text-amber-900",
    dot: "bg-amber-500",
  },
  invoice: {
    label: "Invoice",
    chip: "bg-emerald-100/80 text-emerald-900",
    dot: "bg-emerald-500",
  },
  procurement: {
    label: "Procurement",
    chip: "bg-orange-100/80 text-orange-900",
    dot: "bg-orange-500",
  },
  meeting: {
    label: "Call / meeting",
    chip: "bg-indigo-100/80 text-indigo-900",
    dot: "bg-indigo-500",
  },
  recurring: {
    label: "Recurring",
    chip: "bg-cyan-100/80 text-cyan-900",
    dot: "bg-cyan-500",
  },
  note: {
    label: "Update",
    chip: "bg-zinc-200/60 text-zinc-700",
    dot: "bg-zinc-400",
  },
  request: {
    label: "Request",
    chip: "bg-orange-100/80 text-orange-900",
    dot: "bg-orange-500",
  },
  incident: {
    label: "Incident",
    chip: "bg-red-100/80 text-red-900",
    dot: "bg-red-500",
  },
  document: {
    label: "Document",
    chip: "bg-slate-200/60 text-slate-800",
    dot: "bg-slate-500",
  },
  other: {
    label: "Other",
    chip: "bg-zinc-200/60 text-zinc-600",
    dot: "bg-zinc-400",
  },
  cost: {
    label: "Cost",
    chip: "bg-rose-100/80 text-rose-900",
    dot: "bg-rose-500",
  },
  hire: {
    label: "Hire",
    chip: "bg-teal-100/80 text-teal-900",
    dot: "bg-teal-500",
  },
  leave: {
    label: "Leave",
    chip: "bg-sky-100/80 text-sky-900",
    dot: "bg-sky-500",
  },
  visa: {
    label: "Visa / LMRA",
    chip: "bg-indigo-100/80 text-indigo-900",
    dot: "bg-indigo-500",
  },
  training: {
    label: "Training",
    chip: "bg-lime-100/80 text-lime-900",
    dot: "bg-lime-600",
  },
  shipment: {
    label: "Shipment",
    chip: "bg-blue-100/80 text-blue-900",
    dot: "bg-blue-500",
  },
  pickup: {
    label: "Pickup",
    chip: "bg-cyan-100/80 text-cyan-900",
    dot: "bg-cyan-500",
  },
  delivery: {
    label: "Delivery",
    chip: "bg-cyan-100/80 text-cyan-900",
    dot: "bg-cyan-600",
  },
  receiving: {
    label: "Receiving",
    chip: "bg-amber-100/80 text-amber-900",
    dot: "bg-amber-500",
  },
  storage: {
    label: "Storage",
    chip: "bg-yellow-100/80 text-yellow-900",
    dot: "bg-yellow-500",
  },
  dispatch: {
    label: "Dispatch",
    chip: "bg-orange-100/80 text-orange-900",
    dot: "bg-orange-500",
  },
  campaign: {
    label: "Campaign",
    chip: "bg-fuchsia-100/80 text-fuchsia-900",
    dot: "bg-fuchsia-500",
  },
  lease: {
    label: "Lease",
    chip: "bg-emerald-100/80 text-emerald-900",
    dot: "bg-emerald-600",
  },
  tenancy: {
    label: "Tenancy",
    chip: "bg-emerald-100/80 text-emerald-900",
    dot: "bg-emerald-500",
  },
};

const customChip = "bg-zoom-palest text-zoom-dark";
const customDot = "bg-zoom-medium";

export function getEntryTypeStyle(entryType: string) {
  return (
    builtInEntryTypeStyles[entryType] ?? {
      label:
        operationEntryTypeOptions.find((option) => option.value === entryType)
          ?.label ?? entryType,
      chip: customChip,
      dot: customDot,
    }
  );
}

/** @deprecated Use getEntryTypeStyle */
export const entryTypeStyles = builtInEntryTypeStyles;

export function getDivisionMeta(divisionId: string) {
  const division = getDivisionById(divisionId);
  return {
    acronym: division?.acronym ?? "ZGC",
    name: division?.name ?? divisionId,
    logo: division?.logo,
  };
}
