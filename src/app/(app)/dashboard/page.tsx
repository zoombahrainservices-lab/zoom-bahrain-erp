import { count, eq } from "drizzle-orm";

import { Badge } from "@/components/catalyst/badge";
import { Heading, Subheading } from "@/components/catalyst/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/catalyst/table";
import { Text, TextLink } from "@/components/catalyst/text";
import { Stat } from "@/components/stat";
import { db } from "@/db";
import { clients, tasks } from "@/db/schema";
import { getSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await getSession();

  const [clientCount] = await db.select({ value: count() }).from(clients);
  const [taskCount] = await db.select({ value: count() }).from(tasks);
  const [openTaskCount] = await db
    .select({ value: count() })
    .from(tasks)
    .where(eq(tasks.status, "todo"));

  const recentTasks = await db.query.tasks.findMany({
    limit: 5,
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
    with: {
      client: {
        columns: { name: true },
      },
    },
  });

  return (
    <>
      <Heading>Good afternoon, {session?.name}</Heading>
      <Subheading className="mt-8">Overview</Subheading>
      <div className="mt-4 grid gap-8 sm:grid-cols-3">
        <Stat title="Clients" value={clientCount.value} href="/clients" />
        <Stat title="All tasks" value={taskCount.value} href="/tasks" />
        <Stat title="Open tasks" value={openTaskCount.value} href="/tasks" />
      </div>

      <Subheading className="mt-14">Recent activity</Subheading>
      <Table className="mt-4 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Task</TableHeader>
            <TableHeader>Client</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Priority</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {recentTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-zinc-500">
                No tasks yet.
              </TableCell>
            </TableRow>
          ) : (
            recentTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.title}</TableCell>
                <TableCell className="text-zinc-500">
                  {task.client?.name ?? "No client"}
                </TableCell>
                <TableCell>
                  <Badge color="blue">{task.status.replace("_", " ")}</Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    color={
                      task.priority === "urgent"
                        ? "red"
                        : task.priority === "high"
                          ? "orange"
                          : "zinc"
                    }
                  >
                    {task.priority}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      <Text className="mt-4">
        <TextLink href="/tasks">
          View all tasks
        </TextLink>
      </Text>
    </>
  );
}
