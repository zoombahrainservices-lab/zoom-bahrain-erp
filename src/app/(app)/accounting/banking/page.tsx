import { BankScreen } from "@/components/accounting/bank-screen";
import { loadAccountingPage } from "@/lib/accounting/page";

export default async function BankingPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; from?: string; to?: string; year?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  return <BankScreen page={page} />;
}
