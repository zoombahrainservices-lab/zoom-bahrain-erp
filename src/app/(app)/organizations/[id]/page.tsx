import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { OrganizationDetailClient } from "@/components/organization-detail-client";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { listPartyOperations } from "@/lib/create-operation";
import { getWorkspaceDrive } from "@/lib/google";
import { canManageOrganizations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

type OrganizationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OrganizationDetailPage({
  params,
}: OrganizationDetailPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    redirect("/organizations");
  }

  const { id } = await params;

  const [organization, workspaceDrive] = await Promise.all([
    db.query.organizations.findFirst({
      where: eq(organizations.id, id),
      with: {
        contacts: {
          orderBy: (people, { asc }) => [asc(people.sortOrder)],
        },
        identifiers: {
          orderBy: (rows, { asc }) => [asc(rows.sortOrder)],
        },
      },
    }),
    getWorkspaceDrive(),
  ]);

  if (!organization) {
    notFound();
  }

  const files = await listPartyOperations({
    organizationId: organization.id,
  });

  return (
    <OrganizationDetailClient
      organization={organization}
      driveConnected={Boolean(workspaceDrive)}
      isAdmin={canManageOrganizations(session)}
      files={files}
    />
  );
}
