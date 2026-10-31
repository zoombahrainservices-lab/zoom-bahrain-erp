"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Field, Label } from "@/components/catalyst/fieldset";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";
import { ListSearch, useListQuery } from "@/components/list-search";
import {
  CompanyFields,
  emptyCompanyDraft,
  emptyPersonDraft,
  NEW_PARTY,
  PersonFields,
  registerCompany,
  type CompanyDraft,
  type PersonDraft,
} from "@/components/register-party-panel";
import type { TaskPriority, TaskStatus } from "@/db/schema";
import { getOperationPartyLabel } from "@/lib/operation-fields";
import { matchesQuery } from "@/lib/utils";

type TaskBoardProps = {
  initialTasks: Array<{
    id: string;
    title: string;
    description: string | null;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: Date | null;
    organization: { id: string; name: string; company: string | null } | null;
    operation: { id: string; operationCode: string; title: string } | null;
    assignedTo: { id: string; name: string } | null;
  }>;
  operations: Array<{
    id: string;
    operationCode: string;
    title: string;
    organization?: { name?: string | null } | null;
    contact?: { name?: string | null; contactCode?: string | null } | null;
  }>;
};

const columns: Array<{ key: TaskStatus; label: string }> = [
  { key: "todo", label: "To do" },
  { key: "in_progress", label: "In progress" },
  { key: "review", label: "Review" },
  { key: "done", label: "Done" },
];

const newPersonValue = "new-person";

export function TaskBoard({ initialTasks, operations }: TaskBoardProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [operationChoices, setOperationChoices] = useState(operations);
  const [title, setTitle] = useState("");
  const [operationId, setOperationId] = useState("");
  const [person, setPerson] = useState<PersonDraft>(emptyPersonDraft);
  const [company, setCompany] = useState<CompanyDraft>(emptyCompanyDraft());
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search] = useListQuery();
  const addingPerson = operationId === newPersonValue;

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) =>
      matchesQuery(
        [
          task.title,
          task.description,
          task.priority,
          task.operation?.operationCode,
          task.operation?.title,
          task.organization?.name,
          task.assignedTo?.name,
        ],
        search,
      ),
    );
  }, [tasks, search]);

  async function createTask(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !operationId) return;
    if (addingPerson && !person.name.trim()) return;

    setLoading(true);
    setError("");
    try {
      let organizationId = person.organizationId;
      if (addingPerson && organizationId === NEW_PARTY) {
        const created = await registerCompany(company, false);
        organizationId = created.id;
      }
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          priority,
          ...(addingPerson
            ? { newPerson: { ...person, organizationId: organizationId || undefined } }
            : { operationId }),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create task");
      }

      if (data.task) {
        setTasks((current) => [data.task, ...current]);
      }
      if (data.operation) {
        setOperationChoices((current) => [data.operation, ...current]);
        setOperationId(data.operation.id);
      }
      setTitle("");
      setPerson(emptyPersonDraft());
      setCompany(emptyCompanyDraft());
      setPriority("medium");
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create task");
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

  function openOperation(operationId: string) {
    router.push(`/operations/${operationId}`);
  }

  return (
    <div className="space-y-8">
      <form
        onSubmit={createTask}
        className="grid gap-4 rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5 md:grid-cols-4"
      >
        <Field className="md:col-span-2">
          <Label>To-do</Label>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </Field>
        <Field>
          <Label>Operation</Label>
          <Select
            value={operationId}
            onChange={(event) => setOperationId(event.target.value)}
            required
          >
            <option value="">Choose operation</option>
            <option value={newPersonValue}>New person…</option>
            {operationChoices.map((operation) => (
              <option key={operation.id} value={operation.id}>
                {operation.operationCode} · {operation.title} ·{" "}
                {getOperationPartyLabel(operation)}
              </option>
            ))}
          </Select>
        </Field>
        {addingPerson ? (
          <div className="md:col-span-4">
            <PersonFields
              value={person}
              onChange={setPerson}
              company={company}
              onCompanyChange={setCompany}
            />
          </div>
        ) : null}
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
        {error ? (
          <p className="text-sm text-red-500 md:col-span-4">{error}</p>
        ) : null}
        <Button
          type="submit"
          disabled={loading || !operationId || (addingPerson && !person.name.trim())}
          className="md:col-span-4 md:justify-self-start"
        >
          {loading ? "Adding..." : addingPerson ? "Add person and to-do" : "Add to operation"}
        </Button>
      </form>

      <ListSearch placeholder="Search to-dos or operations…" />

      <div className="grid gap-4 xl:grid-cols-4">
        {columns.map((column) => (
          <section
            key={column.key}
            className="rounded-lg bg-white p-4 shadow-xs ring-1 ring-zinc-950/5"
          >
            <h3 className="mb-4 text-sm font-semibold text-zinc-950">
              {column.label}
              <span className="ml-2 text-zinc-400">
                {visibleTasks.filter((task) => task.status === column.key).length}
              </span>
            </h3>

            <div className="space-y-3">
              {visibleTasks
                .filter((task) => task.status === column.key)
                .map((task) => (
                  <article
                    key={task.id}
                    className="rounded-lg border border-zinc-950/10 p-3"
                  >
                    <div className="mb-2 flex items-start justify-between gap-2">
                      {task.operation ? (
                        <button
                          type="button"
                          onClick={() => openOperation(task.operation!.id)}
                          className="text-left text-sm font-medium text-zoom-dark hover:text-zoom-light"
                        >
                          {task.title}
                        </button>
                      ) : (
                        <p className="text-sm font-medium">{task.title}</p>
                      )}
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

                    {task.operation ? (
                      <p className="mb-2 text-xs text-zinc-500">
                        {task.operation.operationCode} · {task.operation.title}
                      </p>
                    ) : task.organization ? (
                      <p className="mb-2 text-xs text-zinc-500">
                        {task.organization.name}
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
