import { notFound, redirect } from "next/navigation";

import { OperationDetailClient } from "@/components/operation-detail-client";
import { getOperationById, listRelatedOperations } from "@/lib/create-operation";
import { getWorkspaceDrive } from "@/lib/google";
import { canAccessOperations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { listUsers } from "@/lib/users";

type OperationDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function OperationDetailPage({
  params,
}: OperationDetailPageProps) {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    redirect("/operations");
  }

  if (!canAccessOperations(session)) {
    redirect("/dashboard");
  }

  const { id } = await params;
  const [operation, users, workspaceDrive] = await Promise.all([
    getOperationById(id),
    listUsers(),
    getWorkspaceDrive(),
  ]);

  if (!operation) {
    notFound();
  }

  const related = await listRelatedOperations(operation);

  return (
    <OperationDetailClient
      initialOperation={operation}
      users={users.map((user) => ({ id: user.id, name: user.name }))}
      driveConnected={Boolean(workspaceDrive)}
      related={related}
    />
  );
}
