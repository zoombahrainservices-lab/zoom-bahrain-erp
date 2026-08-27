import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import {
  organizationUpdateSchema,
  serializeOrganizationTypes,
} from "@/lib/organization-fields";
import { normalizeCountryCode } from "@/lib/country-registration";
import { canManageOrganizations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageOrganizations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const input = organizationUpdateSchema.parse(body);

    const existing = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 },
      );
    }

    const patch: { roles?: string; country?: string | null } = {};
    if (input.roles) {
      patch.roles = serializeOrganizationTypes(input.roles);
    }
    if (input.country !== undefined) {
      patch.country = normalizeCountryCode(input.country);
    }

    await db.update(organizations).set(patch).where(eq(organizations.id, id));

    const updated = await db.query.organizations.findFirst({
      where: eq(organizations.id, id),
      with: {
        contacts: {
          orderBy: (people, { asc }) => [asc(people.sortOrder)],
        },
        identifiers: {
          orderBy: (rows, { asc }) => [asc(rows.sortOrder)],
        },
      },
    });

    return NextResponse.json({ organization: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 },
    );
  }
}
