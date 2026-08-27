import { NextResponse } from "next/server";
import { z } from "zod";

import { convertInquiryToContact, convertInquiryToOperation } from "@/lib/convert-inquiry";
import { canManageInquiries } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const convertSchema = z.object({
  target: z.enum(["contact", "operation"]),
  divisionId: z.string().optional(),
});

export async function POST(request: Request, context: RouteContext) {
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
    const input = convertSchema.parse(body);

    if (input.target === "operation") {
      const result = await convertInquiryToOperation({
        inquiryId: id,
        createdById: session.userId,
        divisionId: input.divisionId,
      });
      return NextResponse.json(result);
    }

    const inquiry = await convertInquiryToContact(id);

    return NextResponse.json({ inquiry });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to convert inquiry" },
      { status: 500 },
    );
  }
}
