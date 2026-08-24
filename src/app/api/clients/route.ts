import { desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { clients, clientStatuses } from "@/db/schema";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

const createClientSchema = z.object({
  name: z.string().min(1),
  company: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  status: z.enum(clientStatuses).optional(),
  notes: z.string().optional(),
  assignedToId: z.string().optional(),
});

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.query.clients.findMany({
    orderBy: [desc(clients.createdAt)],
    with: {
      assignedTo: {
        columns: { id: true, name: true },
      },
    },
  });

  return NextResponse.json({ clients: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const input = createClientSchema.parse(body);

    const id = crypto.randomUUID();
    await db.insert(clients).values({
      id,
      name: input.name.trim(),
      company: input.company?.trim() || null,
      email: input.email?.trim() || null,
      phone: input.phone?.trim() || null,
      status: input.status ?? "lead",
      notes: input.notes?.trim() || null,
      assignedToId: input.assignedToId || null,
    });

    const created = await db.query.clients.findFirst({
      where: eq(clients.id, id),
      with: {
        assignedTo: {
          columns: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({ client: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: "Failed to create client" }, { status: 500 });
  }
}
