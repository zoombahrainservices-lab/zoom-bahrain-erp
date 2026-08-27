import { Suspense } from "react";
import { redirect } from "next/navigation";

import { OrganizationWizard } from "@/components/organization-wizard";
import { canManageOrganizations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function NewOrganizationPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    redirect("/organizations");
  }

  if (!canManageOrganizations(session)) {
    redirect("/organizations");
  }

  return (
    <Suspense fallback={null}>
      <OrganizationWizard />
    </Suspense>
  );
}
