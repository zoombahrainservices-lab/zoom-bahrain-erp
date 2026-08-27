import { Suspense } from "react";
import { redirect } from "next/navigation";

import { ContactWizard } from "@/components/contact-wizard";
import { canManageContacts, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function NewContactPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    redirect("/contacts");
  }

  if (!canManageContacts(session)) {
    redirect("/contacts");
  }

  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <ContactWizard />
    </Suspense>
  );
}
