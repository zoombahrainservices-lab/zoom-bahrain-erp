import type { OperationDocumentStage } from "@/db/schema";

export const commercialDocumentTypes = [
  "procurement",
  "quotation",
  "invoice",
  "proposal",
] as const;

export type CommercialDocumentType = (typeof commercialDocumentTypes)[number];

const offerStages = [
  "draft",
  "sent",
  "accepted",
  "rejected",
  "revised",
] as const satisfies readonly OperationDocumentStage[];

const invoiceStages = [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
] as const satisfies readonly OperationDocumentStage[];

const procurementStages = [
  "draft",
  "sent",
  "received",
  "priced",
] as const satisfies readonly OperationDocumentStage[];

export const documentStageLabels: Record<OperationDocumentStage, string> = {
  draft: "Draft",
  sent: "Sent",
  accepted: "Accepted",
  rejected: "Rejected",
  revised: "Revised",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
  received: "Received",
  priced: "Priced",
};

export function isCommercialDocumentType(
  entryType: string,
): entryType is CommercialDocumentType {
  return (commercialDocumentTypes as readonly string[]).includes(entryType);
}

export function getDocumentStages(entryType: string) {
  if (entryType === "invoice") return invoiceStages;
  if (entryType === "procurement") return procurementStages;
  if (entryType === "quotation" || entryType === "proposal") return offerStages;
  return [] as const;
}

export function getDocumentStageLabel(stage: OperationDocumentStage) {
  return documentStageLabels[stage] ?? stage;
}

export function getDocumentKindTitle(entryType: string) {
  if (entryType === "quotation") return "Quotation";
  if (entryType === "invoice") return "Invoice";
  if (entryType === "proposal") return "Proposal";
  if (entryType === "procurement") return "Procurement";
  return entryType;
}

export const commercialListPages = [
  {
    kind: "quotation" as const,
    href: "/quotation",
    title: "Quotations",
    blurb:
      "Client offers. These live on an operation — this list is for control.",
  },
  {
    kind: "invoice" as const,
    href: "/invoice",
    title: "Invoices",
    blurb:
      "Bills after a quotation is accepted. Open one to work it; the operation keeps the story.",
  },
  {
    kind: "proposal" as const,
    href: "/proposal",
    title: "Proposals",
    blurb: "Package offers to clients. Same numbers engine as quotations.",
  },
  {
    kind: "procurement" as const,
    href: "/procurement",
    title: "Procurement",
    blurb:
      "Ask vendors, collect their prices, then make the client quotation on the operation.",
  },
] as const;

export function commercialDocumentPath(operationId: string, entryId: string) {
  return `/operations/${operationId}/documents/${entryId}`;
}

export function areDocumentNumbersLocked(
  stage: OperationDocumentStage | null | undefined,
) {
  return Boolean(stage && stage !== "draft");
}

export function resolveDocumentStage(
  entryType: string,
  stage: OperationDocumentStage | null | undefined,
): OperationDocumentStage | null {
  if (!isCommercialDocumentType(entryType)) return null;
  const allowed = getDocumentStages(entryType);
  if (stage && (allowed as readonly string[]).includes(stage)) return stage;
  return "draft";
}

export const GOOGLE_DOC_MIME = "application/vnd.google-apps.document";

export function googleDocOnEntry(entry: {
  files?: { mimeType: string | null; webViewLink: string | null }[] | null;
}) {
  return (
    entry.files?.find((file) => file.mimeType === GOOGLE_DOC_MIME) ?? null
  );
}

export type DocumentLineTemplate = {
  description: string;
  quantity: string;
  unitAmount: string;
  total: string;
};

export type DocumentTemplateContext = {
  kind: CommercialDocumentType;
  operationCode: string;
  operationTitle: string;
  partyName: string;
  partyContactName?: string | null;
  vendorName?: string | null;
  vendorContactName?: string | null;
  divisionName: string;
  activityDate: string;
  amountLabel: string;
  amountValue: string;
  lines: DocumentLineTemplate[];
  preparedBy: string;
};

const kindTitles: Record<CommercialDocumentType, string> = {
  procurement: "Procurement",
  quotation: "Quotation",
  invoice: "Invoice",
  proposal: "Proposal",
};

export function documentAmountLabel(kind: CommercialDocumentType) {
  if (kind === "invoice") return "Amount due";
  if (kind === "procurement") return "Vendor total";
  if (kind === "proposal") return "Proposed amount";
  return "Quoted amount";
}

export function documentFileName(context: DocumentTemplateContext) {
  const who =
    context.kind === "procurement"
      ? (context.vendorName ?? context.partyName)
      : context.partyName;
  return `${kindTitles[context.kind]} — ${who} — ${context.activityDate}`;
}

function metaRow(label: string, value: string) {
  return `<tr>
        <td style="padding: 6px 10px; background: #f1f5f9; width: 160px;"><strong>${escapeHtml(label)}</strong></td>
        <td style="padding: 6px 10px; border-bottom: 1px solid #e2e8f0;">${escapeHtml(value)}</td>
      </tr>`;
}

export function buildDocumentTemplateHtml(context: DocumentTemplateContext) {
  const title = kindTitles[context.kind];
  const isProcurement = context.kind === "procurement";
  const lineRows = context.lines
    .map(
      (line) => `<tr>
        <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${escapeHtml(line.description || "—")}</td>
        <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${escapeHtml(line.quantity)}</td>
        <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${escapeHtml(line.unitAmount)}</td>
        <td style="padding: 8px 10px; border: 1px solid #e2e8f0;">${escapeHtml(line.total)}</td>
      </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="font-family: Arial, Helvetica, sans-serif; color: #1a365d; font-size: 12pt;">
    <h1 style="margin: 0 0 4px;">${escapeHtml(title)}</h1>
    <p style="margin: 0 0 18px; color: #64748b; font-size: 10pt;">
      ${escapeHtml(context.operationCode)} · ${escapeHtml(context.divisionName)}
    </p>
    <table style="border-collapse: collapse; width: 100%; margin-bottom: 18px;">
      ${
        isProcurement
          ? `${metaRow("Supplier", context.vendorName || "—")}${
              context.vendorContactName
                ? metaRow("Supplier contact", context.vendorContactName)
                : ""
            }${metaRow("Client", context.partyName)}`
          : `${metaRow("To", context.partyName)}${
              context.partyContactName
                ? metaRow("Contact", context.partyContactName)
                : ""
            }`
      }
      ${metaRow("Regarding", context.operationTitle)}
      ${metaRow("Date", context.activityDate)}
      ${metaRow("Prepared by", context.preparedBy)}
      ${metaRow(context.amountLabel, context.amountValue)}
    </table>
    <h2 style="font-size: 13pt;">Items</h2>
    <table style="border-collapse: collapse; width: 100%; margin-bottom: 18px;">
      <tr>
        <th style="text-align: left; padding: 6px 10px; background: #0b3a66; color: #fff;">Description</th>
        <th style="text-align: left; padding: 6px 10px; background: #0b3a66; color: #fff; width: 80px;">Qty</th>
        <th style="text-align: left; padding: 6px 10px; background: #0b3a66; color: #fff; width: 120px;">Amount</th>
        <th style="text-align: left; padding: 6px 10px; background: #0b3a66; color: #fff; width: 120px;">Total</th>
      </tr>
      ${lineRows}
      <tr>
        <td colspan="3" style="padding: 8px 10px; border: 1px solid #e2e8f0; text-align: right;"><strong>Total</strong></td>
        <td style="padding: 8px 10px; border: 1px solid #e2e8f0;"><strong>${escapeHtml(context.amountValue)}</strong></td>
      </tr>
    </table>
    <h2 style="font-size: 13pt;">Covering text</h2>
    <p>Add covering text, terms, and any notes here.</p>
  </body>
</html>`;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
