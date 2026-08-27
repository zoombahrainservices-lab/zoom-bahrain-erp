import type { ReactNode } from "react";

import { Link } from "@/components/catalyst/link";
import { commercialDocumentPath } from "@/lib/operation-documents";
import { getOperationPartyLabel } from "@/lib/operation-fields";
import { formatBhd } from "@/lib/utils";

type OperationRow = {
  id: string;
  operationCode: string;
  title: string;
  divisionId: string;
  organization?: { name?: string | null } | null;
  contact?: { name?: string | null; contactCode?: string | null } | null;
};

type DocumentRow = {
  id: string;
  amount?: string | null;
  documentStage?: string | null;
  operation: OperationRow | null;
};

type InquiryRow = {
  id: string;
  inquiryCode: string;
  name: string | null;
  subject: string | null;
  convertedOperationId?: string | null;
};

type TaskRow = {
  id: string;
  title: string;
  operation: { id: string; operationCode: string; title: string } | null;
};

type OperationsControlDashboardProps = {
  operations: OperationRow[];
  quotations: DocumentRow[];
  invoices: DocumentRow[];
  inquiries: InquiryRow[];
  tasks: TaskRow[];
  hrOperations?: OperationRow[];
  movements?: Array<{
    id: string;
    entryType: string;
    operation: OperationRow | null;
  }>;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl bg-white ring-1 ring-zinc-200">
      <h2 className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold text-zoom-navy">
        {title}
      </h2>
      <div className="divide-y divide-zinc-100">{children}</div>
    </section>
  );
}

function OperationLink({
  operation,
  extra,
}: {
  operation: OperationRow;
  extra?: string | null;
}) {
  return (
    <Link
      href={`/operations/${operation.id}`}
      className="block px-4 py-2 hover:bg-zinc-50"
    >
      <p className="text-sm font-medium text-zoom-dark">
        {operation.title}
        {extra ? (
          <span className="ml-2 font-normal tabular-nums text-zinc-500">
            {extra}
          </span>
        ) : null}
      </p>
      <p className="text-xs text-zinc-500">
        {operation.operationCode} · {getOperationPartyLabel(operation)}
      </p>
    </Link>
  );
}

export function OperationsControlDashboard({
  operations,
  quotations,
  invoices,
  inquiries,
  tasks,
  hrOperations = [],
  movements = [],
}: OperationsControlDashboardProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Active operations">
        {operations.length > 0
          ? operations.map((operation) => (
              <OperationLink key={operation.id} operation={operation} />
            ))
          : (
            <p className="px-4 py-6 text-sm text-zinc-500">
              No active operations. Open one from Operations.
            </p>
          )}
      </Section>

      <Section title="Quotations waiting">
        {quotations.length > 0
          ? quotations.map((item) =>
              item.operation ? (
                <Link
                  key={item.id}
                  href={commercialDocumentPath(item.operation.id, item.id)}
                  className="block px-4 py-2 hover:bg-zinc-50"
                >
                  <p className="text-sm font-medium text-zoom-dark">
                    {item.operation.title}
                    <span className="ml-2 font-normal tabular-nums text-zinc-500">
                      {formatBhd(item.amount) || ""}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.operation.operationCode} ·{" "}
                    {getOperationPartyLabel(item.operation)}
                    {item.documentStage ? ` · ${item.documentStage}` : ""}
                  </p>
                </Link>
              ) : null,
            )
          : (
            <p className="px-4 py-6 text-sm text-zinc-500">None waiting.</p>
          )}
      </Section>

      <Section title="Invoices out">
        {invoices.length > 0
          ? invoices.map((item) =>
              item.operation ? (
                <Link
                  key={item.id}
                  href={commercialDocumentPath(item.operation.id, item.id)}
                  className="block px-4 py-2 hover:bg-zinc-50"
                >
                  <p className="text-sm font-medium text-zoom-dark">
                    {item.operation.title}
                    <span className="ml-2 font-normal tabular-nums text-zinc-500">
                      {formatBhd(item.amount) || ""}
                    </span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.operation.operationCode} ·{" "}
                    {getOperationPartyLabel(item.operation)}
                    {item.documentStage ? ` · ${item.documentStage}` : ""}
                  </p>
                </Link>
              ) : null,
            )
          : (
            <p className="px-4 py-6 text-sm text-zinc-500">No sent invoices.</p>
          )}
      </Section>

      <Section title="Open enquiries">
        {inquiries.length > 0
          ? inquiries.map((inquiry) => (
              <Link
                key={inquiry.id}
                href={
                  inquiry.convertedOperationId
                    ? `/operations/${inquiry.convertedOperationId}`
                    : "/sales"
                }
                className="block px-4 py-2 hover:bg-zinc-50"
              >
                <p className="text-sm font-medium text-zoom-dark">
                  {inquiry.name || inquiry.inquiryCode}
                </p>
                <p className="text-xs text-zinc-500">
                  {inquiry.inquiryCode}
                  {inquiry.subject ? ` · ${inquiry.subject}` : ""}
                </p>
              </Link>
            ))
          : (
            <p className="px-4 py-6 text-sm text-zinc-500">No open enquiries.</p>
          )}
      </Section>

      <Section title="HR operations">
        {hrOperations.length > 0
          ? hrOperations.map((operation) => (
              <OperationLink key={operation.id} operation={operation} />
            ))
          : (
            <p className="px-4 py-6 text-sm text-zinc-500">
              No administration files. Start one from HR.
            </p>
          )}
      </Section>

      <Section title="Logistics movements">
        {movements.length > 0
          ? movements.map((item) =>
              item.operation ? (
                <Link
                  key={item.id}
                  href={`/operations/${item.operation.id}`}
                  className="block px-4 py-2 hover:bg-zinc-50"
                >
                  <p className="text-sm font-medium text-zoom-dark">
                    {item.entryType} · {item.operation.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {item.operation.operationCode} ·{" "}
                    {getOperationPartyLabel(item.operation)}
                  </p>
                </Link>
              ) : null,
            )
          : (
            <p className="px-4 py-6 text-sm text-zinc-500">
              No shipments yet. Start one from Logistics.
            </p>
          )}
      </Section>

      <Section title="Open to-dos">
        {tasks.length > 0
          ? tasks.map((task) =>
              task.operation ? (
                <Link
                  key={task.id}
                  href={`/operations/${task.operation.id}`}
                  className="block px-4 py-2 hover:bg-zinc-50"
                >
                  <p className="text-sm font-medium text-zoom-dark">
                    {task.title}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {task.operation.operationCode} · {task.operation.title}
                  </p>
                </Link>
              ) : (
                <p key={task.id} className="px-4 py-2 text-sm">
                  {task.title}
                </p>
              ),
            )
          : (
            <p className="px-4 py-6 text-sm text-zinc-500">No open to-dos.</p>
          )}
      </Section>
    </div>
  );
}
