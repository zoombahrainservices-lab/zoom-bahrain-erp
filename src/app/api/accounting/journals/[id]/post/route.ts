import { NextResponse } from "next/server";

import { postDraft } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const access = await requireAccounting("post");
  if ("error" in access && access.error) return access.error;
  const { id } = await context.params;

  try {
    await postDraft(id, access.session.userId);
    return NextResponse.json({ id });
  } catch (error) {
    return accountingError(error);
  }
}
