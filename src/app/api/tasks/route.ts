import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { contactKinds, tasks, taskPriorities, taskStatuses } from "@/db/schema";
import { createContactWithCode } from "@/lib/create-contact";
import { createOperationEntry } from "@/lib/create-operation-entry";
import { createOperationWithFirstEntry } from "@/lib/create-operation";
import { canAccessOrganizationData } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { todayInputDate } from "@/lib/utils";

export const runtime = "nodejs";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  dueDate: z.string().optional(),
  organizationId: z.string().optional(),
  operationId: z.string().optional(),
  assignedToId: z.string().optional(),
  newPerson: z
    .object({
      name: z.string().min(1),
      position: z.string().optional(),
      mobiles: z.array(z.string()).optional(),
      emails: z.array(z.object({ label: z.string(), email: z.string() })).optional(),
      notes: z.string().optional(),
      kinds: z.array(z.enum(contactKinds)).optional(),
      organizationId: z.string().optional(),
    })
    .optional(),
}).superRefine((input, context) => {
  if (!input.operationId?.trim() && !input.newPerson?.name?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Choose an operation or enter the new person's name",
      path: ["operationId"],
    });
  }
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOrganizationData(session)) {
    return NextResponse.json({ tasks: [] });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const rows = await db.query.tasks.findMany({
    where: status ? eq(tasks.status, status as (typeof taskStatuses)[number]) : undefined,
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
  });

  return NextResponse.json({ tasks: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOrganizationData(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const input = createTaskSchema.parse(body);
    const opened = input.operationId?.trim()
      ? null
      : await openFileForNewPerson(input.newPerson!, input.title.trim(), session.userId);
    const operationId = input.operationId?.trim() || opened?.id;
    if (!operationId) {
      throw new Error("Choose an operation or enter the new person's name");
    }

    if (opened) {
      const created = await db.query.tasks.findFirst({
        where: eq(tasks.operationId, opened.id),
        with: taskWith,
      });
      if (created && input.priority && input.priority !== "medium") {
        await db
          .update(tasks)
          .set({ priority: input.priority, updatedAt: new Date() })
          .where(eq(tasks.id, created.id));
        created.priority = input.priority;
      }
      return NextResponse.json({ task: created, operation: opened }, { status: 201 });
    }

    const entry = await createOperationEntry(
      operationId,
      {
        entryType: "task",
        body: input.title.trim(),
        activityDate: todayInputDate(),
      },
      session.userId,
    );

    if (!entry?.id) {
      throw new Error("Failed to add to-do on the operation");
    }

    const created = await db.query.tasks.findFirst({
      where: eq(tasks.operationEntryId, entry.id),
      with: taskWith,
    });

    if (created && input.priority && input.priority !== "medium") {
      await db
        .update(tasks)
        .set({ priority: input.priority, updatedAt: new Date() })
        .where(eq(tasks.id, created.id));
      created.priority = input.priority;
    }

    return NextResponse.json({ task: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    if (error instanceof Error && /^(Could not|Choose )/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}

const taskWith = {
  organization: {
    columns: { id: true, name: true, company: true },
  },
  operation: {
    columns: { id: true, operationCode: true, title: true },
  },
  assignedTo: {
    columns: { id: true, name: true },
  },
} as const;

async function openFileForNewPerson(
  person: {
    name: string;
    position?: string;
    mobiles?: string[];
    emails?: Array<{ label: string; email: string }>;
    notes?: string;
    kinds?: Array<(typeof contactKinds)[number]>;
    organizationId?: string;
  },
  title: string,
  userId: string,
) {
  const name = person.name.trim();
  const contact = await createContactWithCode({
    name,
    position: person.position,
    mobiles: person.mobiles,
    emails: person.emails,
    notes: person.notes,
    kinds: person.kinds,
    organizationId: person.organizationId || undefined,
    status: "active",
  });
  if (!contact?.id) {
    throw new Error("Could not register that person");
  }

  const operation = await createOperationWithFirstEntry(
    {
      contactId: contact.id,
      divisionId: "group",
      title: name,
      entryType: "task",
      openingBody: title,
    },
    userId,
  );
  const entry = operation?.entries?.[0];
  if (!operation?.id || !entry?.id) {
    throw new Error("Could not open a file for that person");
  }

  const now = new Date();
  await db.insert(tasks).values({
    id: crypto.randomUUID(),
    title: title.slice(0, 200),
    description: null,
    status: "todo",
    priority: "medium",
    dueDate: null,
    organizationId: null,
    operationId: operation.id,
    operationEntryId: entry.id,
    assignedToId: userId,
    createdById: userId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: operation.id,
    operationCode: operation.operationCode,
    title: operation.title,
    contact: { name: contact.name ?? name, contactCode: contact.contactCode ?? null },
  };
}
