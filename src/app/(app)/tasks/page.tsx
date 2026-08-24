import { TaskBoard } from "@/components/task-board";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { db } from "@/db";

export default async function TasksPage() {
  const [taskRows, clientRows] = await Promise.all([
    db.query.tasks.findMany({
      orderBy: (table, { desc }) => [desc(table.updatedAt)],
      with: {
        client: {
          columns: { id: true, name: true, company: true },
        },
        assignedTo: {
          columns: { id: true, name: true },
        },
      },
    }),
    db.query.clients.findMany({
      columns: { id: true, name: true },
      orderBy: (table, { asc }) => [asc(table.name)],
    }),
  ]);

  return (
    <>
      <Heading>Tasks</Heading>
      <Text className="mt-2">Track work across your team and clients.</Text>
      <div className="mt-8">
        <TaskBoard initialTasks={taskRows} clients={clientRows} />
      </div>
    </>
  );
}
