import { WorkDeskPage } from "@/components/work-desk-page";

export default async function AccountingDeskPage({
  searchParams,
}: {
  searchParams: Promise<{ start?: string }>;
}) {
  const params = await searchParams;
  return <WorkDeskPage deskId="accounting" hideTitle initialStart={params.start} />;
}
