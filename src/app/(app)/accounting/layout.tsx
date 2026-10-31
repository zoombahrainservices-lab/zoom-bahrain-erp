import { redirect } from "next/navigation";

import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { canViewAccounting } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  if (!canViewAccounting(session)) {
    return (
      <>
        <Heading>Accounting</Heading>
        <Text className="mt-4">You do not have access to accounting.</Text>
      </>
    );
  }

  return children;
}
