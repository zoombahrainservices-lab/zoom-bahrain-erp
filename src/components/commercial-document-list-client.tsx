"use client";

import { useMemo } from "react";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { ListSearch, useListQuery } from "@/components/list-search";
import type { CommercialDocumentListRow } from "@/lib/list-commercial-documents";
import {
  commercialDocumentPath,
  getDocumentKindTitle,
  getDocumentStageLabel,
  resolveDocumentStage,
  type CommercialDocumentType,
} from "@/lib/operation-documents";
import { getDivisionLabel, getOperationPartyLabel } from "@/lib/operation-fields";
import { formatBhd, formatDate, matchesQuery } from "@/lib/utils";

type CommercialDocumentListClientProps = {
  kind: CommercialDocumentType;
  items: CommercialDocumentListRow[];
};

function stageColor(stage: string) {
  if (stage === "paid" || stage === "accepted" || stage === "priced") {
    return "green" as const;
  }
  if (stage === "sent" || stage === "received") return "blue" as const;
  if (stage === "rejected" || stage === "cancelled" || stage === "overdue") {
    return "red" as const;
  }
  return "zinc" as const;
}

export function CommercialDocumentListClient({
  kind,
  items,
}: CommercialDocumentListClientProps) {
  const [search] = useListQuery();
  const title = getDocumentKindTitle(kind);

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const operation = item.operation;
      return matchesQuery(
        [
          operation?.title,
          operation?.operationCode,
          operation ? getOperationPartyLabel(operation) : "",
          item.vendorOrganization?.name,
          item.vendorContact?.name,
          operation ? getDivisionLabel(operation.divisionId) : "",
          String(item.amount ?? ""),
          getDocumentStageLabel(
            resolveDocumentStage(item.entryType, item.documentStage) ?? "draft",
          ),
        ],
        search,
      );
    });
  }, [items, search]);

  return (
    <div className="space-y-6">
      <ListSearch placeholder="Search by client, operation, or code…" />

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-zoom-palest/50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zoom-navy">
            {items.length === 0
              ? `No ${title.toLowerCase()} yet`
              : "No matches for your search"}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {items.length === 0
              ? `Create one from an operation. This page lists them all for control.`
              : "Try a different word or clear the search box."}
          </p>
          {items.length === 0 ? (
            <Button href="/operations" className="mt-4">
              Open operations
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-2 font-medium">Stage</th>
                {kind === "procurement" ? (
                  <th className="px-4 py-2 font-medium">Supplier</th>
                ) : null}
                <th className="px-4 py-2 font-medium">
                  {kind === "procurement" ? "Client" : "Party"}
                </th>
                <th className="px-4 py-2 font-medium">Operation</th>
                <th className="px-4 py-2 font-medium">Division</th>
                <th className="px-4 py-2 text-right font-medium">Total</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const stage =
                  resolveDocumentStage(item.entryType, item.documentStage) ??
                  "draft";
                const operation = item.operation;
                if (!operation) return null;
                const href = commercialDocumentPath(operation.id, item.id);

                return (
                  <tr key={item.id} className="border-t border-zinc-100">
                    <td className="px-4 py-2">
                      <a href={href} className="inline-flex">
                        <Badge color={stageColor(stage)}>
                          {getDocumentStageLabel(stage)}
                        </Badge>
                      </a>
                    </td>
                    {kind === "procurement" ? (
                      <td className="px-4 py-2">
                        <a
                          href={href}
                          className="font-medium text-zoom-dark hover:text-zoom-light"
                        >
                          {item.vendorOrganization?.name ?? "No supplier"}
                        </a>
                        {item.vendorContact?.name ? (
                          <span className="mt-0.5 block text-xs text-zinc-500">
                            {item.vendorContact.name}
                          </span>
                        ) : null}
                      </td>
                    ) : null}
                    <td className="px-4 py-2">
                      <a
                        href={href}
                        className="font-medium text-zoom-dark hover:text-zoom-light"
                      >
                        {getOperationPartyLabel(operation)}
                      </a>
                    </td>
                    <td className="px-4 py-2">
                      <a href={href} className="block hover:text-zoom-light">
                        <span className="font-mono text-xs text-zinc-400">
                          {operation.operationCode}
                        </span>
                        <span className="mt-0.5 block text-zoom-dark">
                          {operation.title}
                        </span>
                      </a>
                    </td>
                    <td className="px-4 py-2 text-zinc-600">
                      {getDivisionLabel(operation.divisionId)}
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-zoom-dark">
                      {formatBhd(item.amount) || "—"}
                    </td>
                    <td className="px-4 py-2 text-zinc-500">
                      {formatDate(item.activityDate)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
