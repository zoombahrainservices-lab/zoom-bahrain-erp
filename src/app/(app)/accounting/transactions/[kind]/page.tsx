import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { bookSlipHref, getBookKind } from "@/lib/books-flow";
import { listBookSlips } from "@/lib/books-flow-server";
import { getDivisionName } from "@/lib/divisions";
import { getDocumentStageLabel } from "@/lib/operation-documents";
import { canManageOperations, canViewAccounting } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { formatBhd, formatDate } from "@/lib/utils";

export default async function BookTransactionListPage({
  params,
}: {
  params: Promise<{ kind: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewAccounting(session)) redirect("/dashboard");

  const { kind: kindId } = await params;
  const kind = getBookKind(kindId);
  if (!kind || kind.opens !== "slip" || !kind.entryType) notFound();

  const rows = await listBookSlips(kind.entryType);
  const canManage = canManageOperations(session);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-heading">{kind.label}</h1>
          <p className="mt-1 max-w-3xl text-sm text-text-secondary">{kind.blurb}</p>
        </div>
        {canManage ? (
          <Link href={kind.createHref ?? kind.href} className="text-sm font-medium text-heading">
            {kind.createLabel ?? "New"}
          </Link>
        ) : null}
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-text-secondary">Nothing here yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-foreground">
            <thead className="text-text-secondary">
              <tr>
                {["Date", "Company", "Party", "File", "Status", "Amount"].map((header) => (
                  <th key={header} className="border-b border-border px-3 py-2 font-medium">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="border-b border-border px-3 py-2">{formatDate(row.activityDate)}</td>
                  <td className="border-b border-border px-3 py-2">
                    {getDivisionName(row.operation?.divisionId ?? "")}
                  </td>
                  <td className="border-b border-border px-3 py-2">
                    <Link
                      href={
                        row.operation
                          ? bookSlipHref(kind.id, row.operation.id, row.id)
                          : kind.href
                      }
                      className="font-medium text-heading"
                    >
                      {row.operation?.organization?.name || row.operation?.contact?.name || "No party"}
                    </Link>
                  </td>
                  <td className="border-b border-border px-3 py-2">
                    {row.operation ? (
                      <Link href={`/operations/${row.operation.id}`} className="text-heading">
                        {row.operation.operationCode}
                      </Link>
                    ) : null}
                  </td>
                  <td className="border-b border-border px-3 py-2">
                    {row.documentStage ? getDocumentStageLabel(row.documentStage) : "Draft"}
                  </td>
                  <td className="border-b border-border px-3 py-2 tabular-nums">
                    {formatBhd(row.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
