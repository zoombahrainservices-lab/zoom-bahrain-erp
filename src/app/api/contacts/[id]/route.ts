import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { organizationContacts, organizations } from "@/db/schema";
import {
  contactFormToDbValues,
  contactUpdateSchema,
  getContactEmails,
  getContactKinds,
  getContactMobiles,
} from "@/lib/contact-fields";
import { canAccessContactData, canManageContacts } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import {
  getNextContactSortOrder,
  syncOrganizationContactDenormalizedFields,
} from "@/lib/sync-organization-contacts";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function organizationIdsToSync(
  existingOrganizationId: string | null,
  nextOrganizationId: string | null | undefined,
  contactFieldsChanged: boolean,
) {
  const orgIds = new Set<string>();

  if (existingOrganizationId) {
    orgIds.add(existingOrganizationId);
  }

  if (nextOrganizationId !== undefined) {
    if (nextOrganizationId) {
      orgIds.add(nextOrganizationId);
    }
  } else if (contactFieldsChanged && existingOrganizationId) {
    orgIds.add(existingOrganizationId);
  }

  return orgIds;
}

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessContactData(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const contact = await db.query.organizationContacts.findFirst({
    where: eq(organizationContacts.id, id),
    with: {
      organization: {
        columns: { id: true, name: true, orgCode: true },
      },
    },
  });

  if (!contact) {
    return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  }

  return NextResponse.json({ contact });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageContacts(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const input = contactUpdateSchema.parse(body);

    const existing = await db.query.organizationContacts.findFirst({
      where: eq(organizationContacts.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

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

    const patch: Record<string, unknown> = {};
    const contactFieldsChanged =
      input.name !== undefined ||
      input.position !== undefined ||
      input.mobiles !== undefined ||
      input.emails !== undefined ||
      input.notes !== undefined ||
      input.kinds !== undefined;

    if (contactFieldsChanged) {
      const existingMobiles =
        input.mobiles ??
        (existing.mobiles
          ? getContactMobiles(existing as Parameters<typeof getContactMobiles>[0])
          : [""]);
      const existingEmails =
        input.emails ??
        (existing.emails
          ? getContactEmails(existing as Parameters<typeof getContactEmails>[0])
          : [{ label: "work", email: "" }]);

      Object.assign(
        patch,
        contactFormToDbValues({
          name: input.name ?? existing.name ?? "",
          position: input.position ?? existing.position ?? "",
          mobiles: existingMobiles,
          emails: existingEmails,
          notes: input.notes ?? existing.notes ?? "",
          kinds: input.kinds ?? getContactKinds(existing),
        }),
      );
    }

    if (input.status !== undefined) {
      patch.status = input.status;
    }

    if (input.organizationId !== undefined) {
      patch.organizationId = input.organizationId;
    }

    if (Object.keys(patch).length === 0) {
      const unchanged = await db.query.organizationContacts.findFirst({
        where: eq(organizationContacts.id, id),
        with: {
          organization: {
            columns: { id: true, name: true, orgCode: true },
          },
        },
      });
      return NextResponse.json({ contact: unchanged });
    }

    const orgIds = organizationIdsToSync(
      existing.organizationId,
      input.organizationId,
      contactFieldsChanged,
    );

    await db.transaction(async (tx) => {
      if (
        input.organizationId !== undefined &&
        input.organizationId &&
        input.organizationId !== existing.organizationId
      ) {
        patch.sortOrder = await getNextContactSortOrder(tx, input.organizationId);
      }

      await tx
        .update(organizationContacts)
        .set(patch)
        .where(eq(organizationContacts.id, id));

      for (const organizationId of orgIds) {
        await syncOrganizationContactDenormalizedFields(tx, organizationId);
      }
    });

    const updated = await db.query.organizationContacts.findFirst({
      where: eq(organizationContacts.id, id),
      with: {
        organization: {
          columns: { id: true, name: true, orgCode: true },
        },
      },
    });

    return NextResponse.json({ contact: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to update contact" },
      { status: 500 },
    );
  }
}
