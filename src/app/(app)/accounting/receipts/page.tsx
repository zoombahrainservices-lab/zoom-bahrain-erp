import { PaymentsBooks } from "../payments/page";

type PaymentSearch = {
  company?: string;
  from?: string;
  to?: string;
  year?: string;
  new?: string;
};

export default function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<PaymentSearch>;
}) {
  return <PaymentsBooks searchParams={searchParams} focus="in" />;
}
