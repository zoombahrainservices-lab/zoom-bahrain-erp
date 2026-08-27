import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { organizationContacts, organizations } from "@/db/schema";
import { createContactWithCode } from "@/lib/create-contact";
import { contactRegistrationSchema } from "@/lib/contact-fields";
import { canAccessContactData, canManageContacts } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessContactData(session)) {
    return NextResponse.json({ contacts: [] });
  }

  const rows = await db.query.organizationContacts.findMany({
    where: eq(organizationContacts.status, "active"),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      organization: {
        columns: { id: true, name: true, orgCode: true },
      },
    },
  });

  return NextResponse.json({ contacts: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageContacts(session)) {
    return NextResponse.json(
      { error: "Only admins can create contacts" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const input = contactRegistrationSchema.parse(body);

    if (input.organizationId) {
      const organization = await db.query.organizations.findFirst({
        where: eq(organizations.id, input.organizationId),
      });
      if (!organization) {
        return NextResponse.json(
          { error: "Organization not found" },
          { status: 400 },
        );
      }
    }

    const created = await createContactWithCode({
      ...input,
      status: input.status ?? "active",
    });

    return NextResponse.json({ contact: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to create contact" },
      { status: 500 },
    );
  }
}
