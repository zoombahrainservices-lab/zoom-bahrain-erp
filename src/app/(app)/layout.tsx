import { redirect } from "next/navigation";

import { ApplicationLayout } from "@/components/application-layout";
import { AppToaster } from "@/components/app-toaster";
import { canManageUsers } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  return (
    <ApplicationLayout
      user={{
        name: session.name,
        username: session.username,
        role: session.role,
      }}
      showUsersNav={canManageUsers(session)}
    >
      {children}
      <AppToaster />
    </ApplicationLayout>
  );
}
