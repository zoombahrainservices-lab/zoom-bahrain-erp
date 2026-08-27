import { Suspense } from "react";
import { redirect } from "next/navigation";

import { FunctionsPageClient } from "@/components/functions-page-client";
import { canManageUsers, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function FunctionsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    redirect("/operations");
  }

  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <FunctionsPageClient admin={canManageUsers(session)} />
    </Suspense>
  );
}
