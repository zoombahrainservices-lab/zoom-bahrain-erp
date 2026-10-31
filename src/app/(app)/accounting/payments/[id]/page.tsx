import { notFound, redirect } from "next/navigation";

import { getPayment } from "@/lib/accounting/queries";
import { paymentViewHref } from "@/lib/accounting/overlap";
import { canViewAccounting } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function PaymentRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!canViewAccounting(session)) redirect("/dashboard");

  const { id } = await params;
  const payment = await getPayment(id);
  if (!payment) notFound();
  redirect(paymentViewHref(payment.direction, payment.id));
}
