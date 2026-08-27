import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { organizationRegistrationSchema } from "@/lib/organization-fields";
import { createOrganizationWithCodes } from "@/lib/create-organization";
import { markInquiryConvertedToOrganization } from "@/lib/convert-inquiry";
import { provisionOrganizationDrive } from "@/lib/organization-drive";
import {
  canAccessOrganizationData,
  canManageOrganizations,
} from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOrganizationData(session)) {
    return NextResponse.json({ organizations: [] });
  }

  const rows = await db.query.organizations.findMany({
    orderBy: (table, { desc }) => [desc(table.createdAt)],
    with: {
      assignedTo: {
        columns: { id: true, name: true },
      },
      contacts: {
        orderBy: (people, { asc }) => [asc(people.sortOrder)],
      },
      identifiers: {
        orderBy: (rows, { asc }) => [asc(rows.sortOrder)],
      },
    },
  });

  return NextResponse.json({ organizations: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageOrganizations(session)) {
    return NextResponse.json(
      { error: "Only admins can create organizations" },
      { status: 403 },
    );
  }

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let input;
    let logoFile: File | null = null;
    let inquiryId: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const data = formData.get("data");
      const logo = formData.get("logo");
      if (typeof data !== "string") {
        return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
      }
      const raw = JSON.parse(data) as Record<string, unknown>;
      inquiryId =
        typeof raw.inquiryId === "string" ? raw.inquiryId : undefined;
      input = organizationRegistrationSchema.parse(raw);
      logoFile = logo instanceof File && logo.size > 0 ? logo : null;
    } else {
      const body = await request.json();
      inquiryId =
        typeof body.inquiryId === "string" ? body.inquiryId : undefined;
      input = organizationRegistrationSchema.parse(body);
    }

    const created = await createOrganizationWithCodes({
      ...input,
      status: input.status ?? (inquiryId ? "lead" : "active"),
    });

    let createdOperation: { id: string; operationCode: string } | null = null;

    if (inquiryId && created?.id) {
      const linked = await markInquiryConvertedToOrganization(
        inquiryId,
        created.id,
        session.userId,
      );
      if (linked?.operation) {
        createdOperation = {
          id: linked.operation.id,
          operationCode: linked.operation.operationCode,
        };
      }
    }

    if (created?.id && created.orgCode) {
      await provisionOrganizationDrive({
        organizationId: created.id,
        orgCode: created.orgCode,
        logo: logoFile
          ? {
              buffer: Buffer.from(await logoFile.arrayBuffer()),
              mimeType: logoFile.type || "application/octet-stream",
              fileName: logoFile.name,
            }
          : undefined,
      });

      const refreshed = await db.query.organizations.findFirst({
        where: (table, { eq }) => eq(table.id, created.id),
        with: {
          contacts: {
            orderBy: (people, { asc }) => [asc(people.sortOrder)],
          },
          identifiers: {
            orderBy: (rows, { asc }) => [asc(rows.sortOrder)],
          },
        },
      });

      return NextResponse.json(
        {
          organization: refreshed ?? created,
          operation: createdOperation,
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      { organization: created, operation: createdOperation },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to create organization" },
      { status: 500 },
    );
  }
}
