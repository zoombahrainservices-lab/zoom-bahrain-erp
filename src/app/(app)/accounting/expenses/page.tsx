import { PurchasesBooks } from "../purchases/page";

type PurchaseSearch = {
  company?: string;
  from?: string;
  to?: string;
  year?: string;
  new?: string;
};

export default function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<PurchaseSearch>;
}) {
  return <PurchasesBooks searchParams={searchParams} section="expenses" />;
}
