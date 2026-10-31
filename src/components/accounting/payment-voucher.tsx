import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { PrintButton } from "@/components/accounting/forms";
import { getPayment } from "@/lib/accounting/queries";
import { paymentViewHref } from "@/lib/accounting/overlap";
import { getDivisionName } from "@/lib/divisions";
import { canViewAccounting } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { formatBhd } from "@/lib/utils";

export async function PaymentVoucherPage({
  id,
  expected,
}: {
  id: string;
  expected: "receipt" | "payment";
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewAccounting(session)) redirect("/dashboard");

  const payment = await getPayment(id);
  if (!payment) notFound();
  if (payment.direction !== expected) redirect(paymentViewHref(payment.direction, payment.id));

  const backHref = expected === "receipt" ? "/accounting/receipts" : "/accounting/payouts";
  const registerHref = "/accounting/payments";

  return (
    <article className="mx-auto max-w-2xl space-y-4 rounded-xl bg-surface p-6 ring-1 ring-border">
      <div className="flex items-start justify-between gap-3 print:hidden">
        <div className="flex gap-4">
          <Link href={backHref} className="text-sm text-heading">
            {expected === "receipt" ? "Back to payment in" : "Back to payment out"}
          </Link>
          <Link href={registerHref} className="text-sm text-heading">
            All payments
          </Link>
        </div>
        <PrintButton />
      </div>
      <p className="text-sm text-text-secondary">{getDivisionName(payment.companyId)}</p>
      <h2 className="text-2xl font-semibold text-heading">
        {payment.direction === "receipt" ? "Receipt" : "Payment voucher"}
      </h2>
      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-text-secondary">Date</dt>
          <dd>{payment.paidOn}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Amount</dt>
          <dd className="tabular-nums">{formatBhd(payment.amount)}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Party</dt>
          <dd>{payment.organization?.name ?? "On account"}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Method</dt>
          <dd>{payment.method}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Reference</dt>
          <dd>{payment.reference || "—"}</dd>
        </div>
        <div>
          <dt className="text-text-secondary">Journal</dt>
          <dd>
            {payment.journal ? (
              <Link href={`/accounting/journals/${payment.journal.id}`} className="text-heading">
                {payment.journal.journalNumber}
              </Link>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>
      {payment.journal?.lines?.length ? (
        <table className="min-w-full text-left text-sm">
          <thead className="text-text-secondary">
            <tr>
              <th className="border-b border-border py-2">Account</th>
              <th className="border-b border-border py-2">Debit</th>
              <th className="border-b border-border py-2">Credit</th>
            </tr>
          </thead>
          <tbody>
            {payment.journal.lines.map((line) => (
              <tr key={line.id}>
                <td className="border-b border-border py-2">
                  {line.account?.code} {line.account?.name}
                </td>
                <td className="border-b border-border py-2 tabular-nums">{formatBhd(line.debit)}</td>
                <td className="border-b border-border py-2 tabular-nums">{formatBhd(line.credit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </article>
  );
}
