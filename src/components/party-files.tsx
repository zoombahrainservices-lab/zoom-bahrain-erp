import { Link } from "@/components/catalyst/link";
import {
  getOperationStatusLabel,
  type OperationStatus,
} from "@/lib/operation-fields";
import { formatRelativeTime } from "@/lib/utils";
import type { RelatedOperations } from "@/lib/create-operation";

export function PartyFiles({
  files,
  empty,
}: {
  files: RelatedOperations;
  empty: string;
}) {
  if (files.operations.length === 0) {
    return (
      <section className="rounded-xl bg-white ring-1 ring-zinc-200">
        <h2 className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold text-zoom-navy">
          Operations
        </h2>
        <p className="px-4 py-6 text-sm text-zinc-500">{empty}</p>
      </section>
    );
  }

  return (
    <section className="rounded-xl bg-white ring-1 ring-zinc-200">
      <h2 className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold text-zoom-navy">
        {files.reason === "person" ? "Files for this person" : "Files for this company"}
      </h2>
      <div className="divide-y divide-zinc-100">
        {files.operations.map((operation) => (
          <Link
            key={operation.id}
            href={`/operations/${operation.id}`}
            className="block px-4 py-2 hover:bg-zinc-50"
          >
            <p className="text-sm font-medium text-zoom-dark">{operation.title}</p>
            <p className="text-xs text-zinc-500">
              {operation.operationCode} ·{" "}
              {getOperationStatusLabel(operation.status as OperationStatus)}
              {operation.updatedAt
                ? ` · ${formatRelativeTime(operation.updatedAt)}`
                : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
