import { Suspense } from "react";
import { redirect } from "next/navigation";

import { OperationWizard } from "@/components/operation-wizard";
import { canManageOperations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function NewOperationPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    redirect("/operations");
  }

  if (!canManageOperations(session)) {
    redirect("/operations");
  }

  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <OperationWizard />
    </Suspense>
  );
}
