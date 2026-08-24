"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Field, Label } from "@/components/catalyst/fieldset";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";
import type { TaskPriority, TaskStatus } from "@/db/schema";

type TaskBoardProps = {
  initialTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    client: { id: string; name: string; company: string | null } | null;
    assignedTo: { id: string; name: string } | null;
  }>;
  clients: Array<{ id: string; name: string }>;
};

const columns: Array<{ key: TaskStatus; label: string }> = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

export function TaskBoard({ initialTasks, clients }: TaskBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [loading, setLoading] = useState(false);

  async function createTask(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;

    setLoading(true);
    try {
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          clientId: clientId || undefined,
          priority,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create task");
      }

      setTasks((current) => [data.task, ...current]);
      setTitle("");
      setClientId("");
      setPriority("medium");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  async function moveTask(taskId: string, status: TaskStatus) {
    const previous = tasks;
    setTasks((current) =>
      current.map((task) => (task.id === taskId ? { ...task, status } : task)),
    );

    const response = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setTasks(previous);
    } else {
      router.refresh();
    }
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={createTask}
        className="grid gap-4 rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5 md:grid-cols-4"
      >
        <Field className="md:col-span-2">
          <Label>Task title</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </Field>
        <Field>
          <Label>Client</Label>
          <Select
            value={clientId}
            onChange={(event) => setClientId(event.target.value)}
          >
            <option value="">No client</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field>
          <Label>Priority</Label>
          <Select
            value={priority}
            onChange={(event) =>
              setPriority(event.target.value as TaskPriority)
            }
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </Select>
        </Field>
        <Button
          type="submit"
          disabled={loading}
          className="md:col-span-4 md:justify-self-start"
        >
          {loading ? "Adding..." : "Add task"}
        </Button>
      </form>

      <div className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => (
          <section
            key={column.key}
            className="rounded-lg bg-white p-4 shadow-xs ring-1 ring-zinc-950/5"
          >
            <h3 className="mb-4 text-sm font-semibold text-zinc-950">
              {column.label}
              <span className="ml-2 text-zinc-400">
                {tasks.filter((task) => task.status === column.key).length}
              </span>
            </h3>

            <div className="space-y-3">
              {tasks
                .filter((task) => task.status === column.key)
                .map((task) => (
                  <article
                    key={task.id}
                    className="rounded-lg border border-zinc-950/10 p-3"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <p className="text-sm font-medium">{task.title}</p>
                      <Badge
                        color={
                          task.priority === "urgent"
                            ? "red"
                            : task.priority === "high"
                              ? "orange"
                              : "blue"
                        }
                      >
                        {task.priority}
                      </Badge>
                    </div>

                    {task.client ? (
                      <p className="mb-2 text-xs text-zinc-500">
                        {task.client.name}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      {columns
                        .filter((item) => item.key !== task.status)
                        .map((item) => (
                          <Button
                            key={item.key}
                            type="button"
                            outline
                            onClick={() => moveTask(task.id, item.key)}
                          >
                            {item.label}
                          </Button>
                        ))}
                    </div>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
