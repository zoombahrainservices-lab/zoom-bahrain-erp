import { PaymentVoucherPage } from "@/components/accounting/payment-voucher";

export default async function PayoutVoucherPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PaymentVoucherPage id={id} expected="payment" />;
}
