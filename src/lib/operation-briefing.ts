import { isCommercialDocumentType } from "@/lib/operation-documents";
import {
  getEntryTypeLabel,
  getOperationPartyLabel,
  getOperationStatusLabel,
  type OperationEntryRecord,
  type OperationRecord,
} from "@/lib/operation-fields";
import type { OperationPulse } from "@/lib/operation-pulse";
import { formatActivityDate } from "@/lib/utils";

export function buildOperationBriefing(
  operation: OperationRecord,
  pulse: OperationPulse,
  entries: OperationEntryRecord[],
) {
  const lines = [
    `${operation.operationCode}  ${operation.title}`,
    `${getOperationPartyLabel(operation)} · ${getOperationStatusLabel(operation.status)}`,
    `Next: ${pulse.label}${pulse.detail ? ` — ${pulse.detail}` : ""}`,
  ];

  const latest = entries
    .filter((entry) => !isCommercialDocumentType(entry.entryType))
    .slice(0, 3);

  if (latest.length > 0) {
    lines.push("Latest:");
    for (const entry of latest) {
      const body = entry.body.replace(/\s+/g, " ").trim();
      const snippet = body.length > 90 ? `${body.slice(0, 87)}…` : body;
      lines.push(
        `- ${formatActivityDate(entry.activityDate)} · ${getEntryTypeLabel(entry.entryType)}${
          snippet ? ` · ${snippet}` : ""
        }`,
      );
    }
  }

  return lines.join("\n");
}
