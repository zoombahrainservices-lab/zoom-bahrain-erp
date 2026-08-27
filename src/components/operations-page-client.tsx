"use client";

import { useMemo } from "react";
import { PlusIcon } from "@heroicons/react/20/solid";
import { parseAsStringLiteral, useQueryState } from "nuqs";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { FilterPills } from "@/components/filter-pills";
import { ListSearch, useListQuery } from "@/components/list-search";
import {
  getDivisionLabel,
  getOperationPartyLabel,
  getOperationStatusLabel,
  type OperationRecord,
} from "@/lib/operation-fields";
import { idleDays } from "@/lib/operation-pulse";
import { formatDate, formatRelativeTime, matchesQuery } from "@/lib/utils";

type OperationsPageClientProps = {
  operations: OperationRecord[];
  currentUserId?: string;
};

const statusFilters = ["all", "mine", "active", "quiet", "completed", "cancelled"] as const;

function statusBadgeColor(status: string) {
  if (status === "active") return "blue" as const;
  if (status === "completed") return "green" as const;
  return "zinc" as const;
}

export function OperationsPageClient({
  operations,
  currentUserId,
}: OperationsPageClientProps) {
  const [search] = useListQuery();
  const [status, setStatus] = useQueryState(
    "status",
    parseAsStringLiteral(statusFilters).withDefault("all"),
  );

  const filtered = useMemo(() => {
    return operations.filter((operation) => {
      if (status === "mine") {
        if (!currentUserId || operation.assignedToId !== currentUserId) {
          return false;
        }
      } else if (status === "quiet") {
        if (operation.status !== "active" || idleDays(operation.updatedAt) < 5) {
          return false;
        }
      } else if (status !== "all" && operation.status !== status) {
        return false;
      }
      return matchesQuery(
        [
          operation.title,
          operation.operationCode,
          getOperationPartyLabel(operation),
          getDivisionLabel(operation.divisionId),
          operation.assignedTo?.name,
          getOperationStatusLabel(operation.status),
        ],
        search,
      );
    });
  }, [operations, search, status, currentUserId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ListSearch placeholder="Search by name, client, or code…" />
        <Button href="/operations/new">
          <PlusIcon data-slot="icon" />
          New operation
        </Button>
      </div>

      <FilterPills
        value={status}
        onChange={(value) => {
          void setStatus(value);
        }}
        options={[
          { value: "all", label: "All" },
          { value: "mine", label: "Mine" },
          { value: "active", label: getOperationStatusLabel("active") },
          { value: "quiet", label: "Quiet" },
          { value: "completed", label: getOperationStatusLabel("completed") },
          { value: "cancelled", label: getOperationStatusLabel("cancelled") },
        ]}
      />

      {filtered.length === 0 ? (
        <div className="rounded-xl bg-zoom-palest/50 px-6 py-12 text-center">
          <p className="text-sm font-medium text-zoom-navy">
            {operations.length === 0
              ? "No operations yet"
              : "No matches for your search"}
          </p>
          <p className="mt-1 text-sm text-zinc-600">
            {operations.length === 0
              ? "Start one file for each job — client work, staff admin, enquiries, or internal tasks."
              : "Try a different word or clear the filters."}
          </p>
          {operations.length === 0 ? (
            <Button href="/operations/new" className="mt-4">
              New operation
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((operation) => (
            <li key={operation.id}>
              <a
                href={`/operations/${operation.id}`}
                className="flex h-full flex-col rounded-xl bg-white p-4 shadow-sm ring-1 ring-zinc-200 transition hover:bg-zoom-palest/30 hover:ring-zoom-light"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap gap-1">
                    <Badge color={statusBadgeColor(operation.status)}>
                      {getOperationStatusLabel(operation.status)}
                    </Badge>
                    {operation.status === "active" &&
                    idleDays(operation.updatedAt) >= 5 ? (
                      <Badge color="zinc">
                        Quiet {idleDays(operation.updatedAt)}d
                      </Badge>
                    ) : null}
                  </div>
                  <span className="font-mono text-xs text-zinc-400">
                    {operation.operationCode}
                  </span>
                </div>

                <h2 className="mt-2 text-sm font-semibold leading-snug text-zoom-navy">
                  {operation.title}
                </h2>

                <p className="mt-1 text-sm text-zinc-600">
                  {getOperationPartyLabel(operation)}
                </p>

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-3 text-xs text-zinc-500">
                  <span className="rounded-md bg-zoom-palest px-2 py-0.5 font-medium text-zoom-dark">
                    {getDivisionLabel(operation.divisionId)}
                  </span>
                  <span>·</span>
                  <span>{operation.assignedTo?.name ?? "Unassigned"}</span>
                  <span>·</span>
                  <span>
                    {formatRelativeTime(operation.updatedAt) ||
                      formatDate(operation.createdAt)}
                  </span>
                </div>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
