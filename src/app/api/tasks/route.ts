import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { tasks, taskPriorities, taskStatuses } from "@/db/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  dueDate: z.string().optional(),
  clientId: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const rows = await db.query.tasks.findMany({
    where: status ? eq(tasks.status, status as (typeof taskStatuses)[number]) : undefined,
    orderBy: [desc(tasks.updatedAt)],
    with: {
      client: {
        columns: { id: true, name: true, company: true },
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

  try {
    const body = await request.json();
    const input = createTaskSchema.parse(body);
    const id = crypto.randomUUID();
    const now = new Date();

    await db.insert(tasks).values({
      id,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      status: input.status ?? "todo",
      priority: input.priority ?? "medium",
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      clientId: input.clientId || null,
      assignedToId: input.assignedToId || session.userId,
      createdById: session.userId,
      createdAt: now,
      updatedAt: now,
    });

    const created = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
      with: {
        client: {
          columns: { id: true, name: true, company: true },
        },
        assignedTo: {
          columns: { id: true, name: true },
        },
      },
    });

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
