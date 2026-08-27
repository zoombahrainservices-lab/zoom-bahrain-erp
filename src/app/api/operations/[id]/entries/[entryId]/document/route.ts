import { NextResponse } from "next/server";
import { z } from "zod";

import { generateCommercialDocument } from "@/lib/create-operation-document";
import { canManageOperations } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string; entryId: string }>;
};

const generateDocumentSchema = z.object({
  replace: z.boolean().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!canManageOperations(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id, entryId } = await context.params;

  try {
    const body = await request.json().catch(() => ({}));
    const input = generateDocumentSchema.parse(body);
    const result = await generateCommercialDocument({
      operationId: id,
      entryId,
      createdById: session.userId,
      replace: input.replace,
    });

    return NextResponse.json(result, { status: result.created ? 201 : 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const message =
      error instanceof Error ? error.message : "Failed to generate Google Doc";

    if (
      message.includes("Connect Google Drive") ||
      message.includes("Choose a supplier") ||
      message.includes("quantity") ||
      message.includes("amount") ||
      message.includes("Total must") ||
      message.includes("Add at least") ||
      message.includes("was sent") ||
      message.includes("not a commercial")
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }

    if (message === "Entry not found" || message === "Operation not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    console.error(error);
    return NextResponse.json(
      { error: "Failed to generate Google Doc" },
      { status: 500 },
    );
  }
}
