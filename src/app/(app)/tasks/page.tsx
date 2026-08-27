import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { TaskBoard } from "@/components/task-board";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { db } from "@/db";
import { operations, tasks } from "@/db/schema";
import { isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function TasksPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    return (
      <>
        <Heading>Tasks</Heading>
        <Text className="mt-4">
          The client role does not have access to this section yet.
        </Text>
      </>
    );
  }

  const [taskRows, operationRows] = await Promise.all([
    db.query.tasks.findMany({
      orderBy: [desc(tasks.updatedAt)],
      with: {
        organization: {
          columns: { id: true, name: true, company: true },
        },
        operation: {
          columns: { id: true, operationCode: true, title: true },
        },
        assignedTo: {
          columns: { id: true, name: true },
        },
      },
    }),
    db.query.operations.findMany({
      where: eq(operations.status, "active"),
      columns: { id: true, operationCode: true, title: true },
      orderBy: [desc(operations.updatedAt)],
      with: {
        organization: {
          columns: { name: true },
        },
        contact: {
          columns: { name: true, contactCode: true },
        },
      },
    }),
  ]);

  return (
    <>
      <Heading>Tasks</Heading>
      <Text className="mt-2">
        Control list of to-dos. They live on an operation — open one to work it.
      </Text>
      <div className="mt-8">
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <TaskBoard initialTasks={taskRows} operations={operationRows} />
        </Suspense>
      </div>
    </>
  );
}
