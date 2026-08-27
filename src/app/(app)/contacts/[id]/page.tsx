import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";

import { ContactDetailClient } from "@/components/contact-detail-client";
import { db } from "@/db";
import { organizationContacts } from "@/db/schema";
import { listPartyOperations } from "@/lib/create-operation";
import { getWorkspaceDrive } from "@/lib/google";
import { canManageContacts, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

type ContactDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ContactDetailPage({
  params,
}: ContactDetailPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    redirect("/contacts");
  }

  const { id } = await params;

  const [contact, workspaceDrive] = await Promise.all([
    db.query.organizationContacts.findFirst({
      where: eq(organizationContacts.id, id),
      with: {
        organization: {
          columns: { id: true, name: true, orgCode: true },
        },
      },
    }),
    getWorkspaceDrive(),
  ]);

  if (!contact) {
    notFound();
  }

  const files = await listPartyOperations({
    contactId: contact.id,
    organizationId: contact.organizationId,
  });

  return (
    <ContactDetailClient
      contact={contact}
      driveConnected={Boolean(workspaceDrive)}
      isAdmin={canManageContacts(session)}
      files={files}
    />
  );
}
