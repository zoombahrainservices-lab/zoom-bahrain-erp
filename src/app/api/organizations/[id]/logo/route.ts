import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { organizations } from "@/db/schema";
import { downloadDriveFile } from "@/lib/google";
import { updateOrganizationLogo } from "@/lib/organization-drive";
import { canAccessOrganizationData, canManageOrganizations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessOrganizationData(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, id),
    columns: {
      logoDriveFileId: true,
      logoMimeType: true,
    },
  });

  if (!organization?.logoDriveFileId) {
    return NextResponse.json({ error: "No logo" }, { status: 404 });
  }

  try {
    const file = await downloadDriveFile(organization.logoDriveFileId);
    return new NextResponse(new Uint8Array(file.buffer), {
      headers: {
        "Content-Type": organization.logoMimeType ?? file.mimeType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load logo";
    if (message.includes("Reconnect it in Settings")) {
      return NextResponse.json({ error: message }, { status: 503 });
    }
    console.error(message);
    return NextResponse.json({ error: "Failed to load logo" }, { status: 500 });
  }
}

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageOrganizations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const organization = await db.query.organizations.findFirst({
    where: eq(organizations.id, id),
  });

  if (!organization?.orgCode) {
    return NextResponse.json({ error: "Organization not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const logo = formData.get("logo");

    if (!(logo instanceof File) || logo.size === 0) {
      return NextResponse.json({ error: "Logo file is required" }, { status: 400 });
    }

    await updateOrganizationLogo({
      organizationId: organization.id,
      orgCode: organization.orgCode,
      folderId: organization.driveFolderId,
      replaceFileId: organization.logoDriveFileId,
      logo: {
        buffer: Buffer.from(await logo.arrayBuffer()),
        mimeType: logo.type || "application/octet-stream",
        fileName: logo.name,
      },
    });

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
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload logo",
      },
      { status: 500 },
    );
  }
}
