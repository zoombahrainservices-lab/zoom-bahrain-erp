import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { tasks, taskPriorities, taskStatuses } from "@/db/schema";
import { createOperationEntry } from "@/lib/create-operation-entry";
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
  operationId: z.string().min(1, "Choose an operation"),
  assignedToId: z.string().optional(),
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
    const entry = await createOperationEntry(
      input.operationId,
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

    return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
  }
}
