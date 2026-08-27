import { redirect } from "next/navigation";

import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { UsersPageClient } from "@/components/users-page-client";
import { listUsers } from "@/lib/users";
import { canManageUsers } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function UsersPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (!canManageUsers(session)) {
    redirect("/dashboard");
  }

  const users = await listUsers();

  return (
    <>
      <Heading>Users</Heading>
      <Text className="mt-2">
        Login accounts only. A human is a Contact. Staff work still lives on an
        operation.
      </Text>
      <div className="mt-8">
        <UsersPageClient
          initialUsers={users.map((user) => ({
            ...user,
            createdAt: user.createdAt.toISOString(),
          }))}
          currentUserId={session.userId}
        />
      </div>
    </>
  );
}
