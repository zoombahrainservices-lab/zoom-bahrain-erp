import { desc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { salesInquiries } from "@/db/schema";
import { createInquiryWithCode } from "@/lib/create-inquiry";
import { inquiryDetailWith } from "@/lib/convert-inquiry";
import { inquiryCreateSchema } from "@/lib/inquiry-fields";
import { canAccessSales, canManageInquiries } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canAccessSales(session)) {
    return NextResponse.json({ inquiries: [] });
  }

  const rows = await db.query.salesInquiries.findMany({
    orderBy: [desc(salesInquiries.createdAt)],
    with: inquiryDetailWith,
  });

  return NextResponse.json({ inquiries: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageInquiries(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const input = inquiryCreateSchema.parse(body);
    const created = await createInquiryWithCode(input, session.userId);

    return NextResponse.json({ inquiry: created }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to create inquiry" },
      { status: 500 },
    );
  }
}
