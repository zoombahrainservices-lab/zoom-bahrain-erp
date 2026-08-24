import { ApplicationLayout } from "@/components/application-layout";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

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
    >
      {children}
    </ApplicationLayout>
  );
}
