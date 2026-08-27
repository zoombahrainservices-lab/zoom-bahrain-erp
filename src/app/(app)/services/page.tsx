import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { ServicesPageClient } from "@/components/services-page-client";
import { isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { listCatalogServices } from "@/lib/zoom-services";

export default async function ServicesPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  if (isClientUser(session)) {
    return (
      <>
        <Heading>Services</Heading>
        <Text className="mt-4">
          The client role does not have access to this section yet.
        </Text>
      </>
    );
  }

  const services = listCatalogServices();

  return (
    <>
      <Heading>Services</Heading>
      <Text className="mt-2">
        What Zoom sells. Open a service as an operation — then attach the company
        or the person.
      </Text>
      <div className="mt-6">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <ServicesPageClient services={services} />
        </Suspense>
      </div>
    </>
  );
}
