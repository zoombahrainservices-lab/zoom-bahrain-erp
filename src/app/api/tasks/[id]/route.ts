import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { operationEntries, tasks, taskPriorities, taskStatuses } from "@/db/schema";
import { canAccessOrganizationData, isAdmin } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(taskStatuses).optional(),
  priority: z.enum(taskPriorities).optional(),
  dueDate: z.string().nullable().optional(),
  organizationId: z.string().nullable().optional(),
  assignedToId: z.string().nullable().optional(),
});

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOrganizationData(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const input = updateTaskSchema.parse(body);

    const existing = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await db
      .update(tasks)
      .set({
        title: input.title?.trim(),
        description:
          input.description !== undefined
            ? input.description.trim() || null
            : undefined,
        status: input.status,
        priority: input.priority,
        dueDate:
          input.dueDate !== undefined
            ? input.dueDate
              ? new Date(input.dueDate)
              : null
            : undefined,
        organizationId:
          input.organizationId !== undefined
            ? input.organizationId || null
            : undefined,
        assignedToId:
          input.assignedToId !== undefined && isAdmin(session)
            ? input.assignedToId || null
            : undefined,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id));

    if (existing.operationEntryId && input.status) {
      await db
        .update(operationEntries)
        .set({
          status: input.status === "done" ? "done" : "open",
        })
        .where(eq(operationEntries.id, existing.operationEntryId));
    }

    const updated = await db.query.tasks.findFirst({
      where: eq(tasks.id, id),
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

    return NextResponse.json({ task: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isAdmin(session)) {
    return NextResponse.json(
      { error: "Only admins can delete tasks" },
      { status: 403 },
    );
  }

  const { id } = await context.params;

  const existing = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
  });

  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  await db.delete(tasks).where(eq(tasks.id, id));
  return NextResponse.json({ ok: true });
}
