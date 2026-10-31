import { redirect } from "next/navigation";

import { SystemGuide } from "@/components/system-guide";
import { canManageUsers, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function GuidePage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <SystemGuide
      showBuild={!isClientUser(session)}
      showUsers={canManageUsers(session)}
    />
  );
}
