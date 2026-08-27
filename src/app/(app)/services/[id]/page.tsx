import { redirect } from "next/navigation";

type LegacyServiceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function LegacyServiceDetailPage({
  params,
}: LegacyServiceDetailPageProps) {
  const { id } = await params;
  redirect(`/operations/${id}`);
}
