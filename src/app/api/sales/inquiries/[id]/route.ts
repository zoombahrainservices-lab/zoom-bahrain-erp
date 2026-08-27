import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { salesInquiries } from "@/db/schema";
import { inquiryToDbValues, inquiryUpdateSchema } from "@/lib/inquiry-fields";
import { inquiryDetailWith } from "@/lib/convert-inquiry";
import { canAccessSales, canManageInquiries } from "@/lib/permissions";
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

  if (!canAccessSales(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  const inquiry = await db.query.salesInquiries.findFirst({
    where: eq(salesInquiries.id, id),
    with: inquiryDetailWith,
  });

  if (!inquiry) {
    return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
  }

  return NextResponse.json({ inquiry });
}

export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageInquiries(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const input = inquiryUpdateSchema.parse(body);

    const existing = await db.query.salesInquiries.findFirst({
      where: eq(salesInquiries.id, id),
    });

    if (!existing) {
      return NextResponse.json({ error: "Inquiry not found" }, { status: 404 });
    }

    const patch: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (
      input.name !== undefined ||
      input.phone !== undefined ||
      input.email !== undefined ||
      input.subject !== undefined
    ) {
      Object.assign(
        patch,
        inquiryToDbValues({
          name: input.name ?? existing.name ?? "",
          phone: input.phone ?? existing.phone ?? "",
          email: input.email ?? existing.email ?? "",
          subject: input.subject ?? existing.subject ?? "",
        }),
      );
    }

    if (input.status !== undefined) {
      patch.status = input.status;
    }

    await db
      .update(salesInquiries)
      .set(patch)
      .where(eq(salesInquiries.id, id));

    const updated = await db.query.salesInquiries.findFirst({
      where: eq(salesInquiries.id, id),
      with: inquiryDetailWith,
    });

    return NextResponse.json({ inquiry: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to update inquiry" },
      { status: 500 },
    );
  }
}
