import { commercialDocumentPath } from "@/lib/operation-documents";
import { formatRelativeTime } from "@/lib/utils";

export type PulseTone = "ok" | "wait" | "act" | "quiet" | "closed";

export type PulseAction =
  | { kind: "open"; href: string; label: string }
  | { kind: "create"; entryType: string; label: string; parentEntryId?: string }
  | { kind: "composer"; entryType: string; label: string };

export type OperationPulse = {
  tone: PulseTone;
  label: string;
  detail: string;
  action?: PulseAction;
};

export type PulseEntry = {
  id: string;
  entryType: string;
  body?: string | null;
  status?: string | null;
  documentStage?: string | null;
  parentEntryId?: string | null;
  createdAt?: Date | string | null;
};

export function idleDays(date: Date | string | null | undefined) {
  if (!date) return 0;

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return 0;

  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 86_400_000));
}

function latestOf(entries: PulseEntry[], entryType: string) {
  return entries
    .filter((entry) => entry.entryType === entryType)
    .sort((left, right) => {
      const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
      const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
      return rightTime - leftTime;
    })[0];
}

export function getOperationPulse(
  operation: { id: string; status: string; updatedAt: Date | string },
  entries: PulseEntry[],
): OperationPulse {
  if (operation.status === "completed" || operation.status === "cancelled") {
    return {
      tone: "closed",
      label: operation.status === "completed" ? "Finished" : "Cancelled",
      detail: "This file is closed.",
    };
  }

  const openTodo = entries.find(
    (entry) => entry.entryType === "task" && entry.status === "open",
  );
  if (openTodo?.body?.trim()) {
    return {
      tone: "act",
      label: "Open to-do",
      detail: openTodo.body.trim(),
      action: {
        kind: "composer",
        entryType: "task",
        label: "Update the to-do",
      },
    };
  }

  const invoice = latestOf(entries, "invoice");
  if (invoice?.documentStage === "overdue") {
    return {
      tone: "act",
      label: "Invoice overdue",
      detail: "Follow up on payment.",
      action: {
        kind: "open",
        href: commercialDocumentPath(operation.id, invoice.id),
        label: "Open invoice",
      },
    };
  }
  if (invoice?.documentStage === "sent") {
    return {
      tone: "wait",
      label: "Waiting on payment",
      detail: "Invoice is out.",
      action: {
        kind: "open",
        href: commercialDocumentPath(operation.id, invoice.id),
        label: "Open invoice",
      },
    };
  }

  const quotation = latestOf(entries, "quotation");
  const quoteStage = quotation?.documentStage ?? (quotation ? "draft" : null);
  if (
    quotation &&
    quoteStage === "accepted" &&
    (!invoice || invoice.documentStage === "cancelled")
  ) {
    return {
      tone: "act",
      label: "Raise an invoice",
      detail: "The quotation was accepted.",
      action: {
        kind: "create",
        entryType: "invoice",
        parentEntryId: quotation.id,
        label: "Make invoice",
      },
    };
  }
  if (quotation && (quoteStage === "draft" || !quoteStage)) {
    return {
      tone: "act",
      label: "Send the quotation",
      detail: "It is still a draft.",
      action: {
        kind: "open",
        href: commercialDocumentPath(operation.id, quotation.id),
        label: "Open quotation",
      },
    };
  }
  if (quotation && quoteStage === "sent") {
    return {
      tone: "wait",
      label: "Waiting on the client",
      detail: "Quotation is out.",
      action: {
        kind: "open",
        href: commercialDocumentPath(operation.id, quotation.id),
        label: "Open quotation",
      },
    };
  }

  const procurement = latestOf(entries, "procurement");
  if (procurement && !quotation) {
    return {
      tone: "act",
      label: "Make the client quotation",
      detail: "Supplier price is in.",
      action: {
        kind: "create",
        entryType: "quotation",
        label: "Start quotation",
      },
    };
  }

  const moving = entries.some(
    (entry) => entry.entryType === "shipment" || entry.entryType === "pickup",
  );
  const delivered = entries.some((entry) => entry.entryType === "delivery");
  if (moving && !delivered) {
    return {
      tone: "act",
      label: "Add a delivery",
      detail: "Something is moving.",
      action: {
        kind: "composer",
        entryType: "delivery",
        label: "Write delivery",
      },
    };
  }

  const hired = entries.some((entry) => entry.entryType === "hire");
  const visa = entries.some((entry) => entry.entryType === "visa");
  if (hired && !visa) {
    return {
      tone: "act",
      label: "Visa / LMRA next",
      detail: "Hire is on the thread.",
      action: {
        kind: "composer",
        entryType: "visa",
        label: "Add visa note",
      },
    };
  }

  const days = idleDays(operation.updatedAt);
  if (days >= 5) {
    return {
      tone: "quiet",
      label: `Quiet ${days}d`,
      detail: "No recent update. Write one line.",
      action: {
        kind: "composer",
        entryType: "note",
        label: "Write an update",
      },
    };
  }

  return {
    tone: "ok",
    label: "On track",
    detail: days <= 0 ? "Updated today." : `Last update ${days}d ago.`,
  };
}

export function operationStory(
  operation: { updatedAt: Date | string },
  pulse: OperationPulse,
) {
  const when = formatRelativeTime(operation.updatedAt);
  return [when, pulse.label].filter(Boolean).join(" · ");
}

export function pulseToneClass(tone: PulseTone) {
  if (tone === "act") return "bg-amber-50 text-amber-900 ring-amber-200";
  if (tone === "wait") return "bg-sky-50 text-sky-900 ring-sky-200";
  if (tone === "quiet") return "bg-zinc-100 text-zinc-700 ring-zinc-200";
  if (tone === "closed") return "bg-zinc-50 text-zinc-500 ring-zinc-200";
  return "bg-emerald-50 text-emerald-900 ring-emerald-200";
}
