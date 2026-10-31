import { NextResponse } from "next/server";
import { z } from "zod";

import {
  canDraftAccounting,
  canManageAccountingSettings,
  canPostJournals,
  canProcessPayments,
  canViewAccounting,
} from "@/lib/permissions";
import { getSession } from "@/lib/session";

import { AccountingError } from "./money";

export async function requireAccounting(
  kind: "view" | "draft" | "post" | "pay" | "settings",
) {
  const session = await getSession();
  if (!session) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    } as const;
  }

  const allowed =
    kind === "view"
      ? canViewAccounting(session)
      : kind === "draft"
        ? canDraftAccounting(session)
        : kind === "post"
          ? canPostJournals(session)
          : kind === "pay"
            ? canProcessPayments(session)
            : canManageAccountingSettings(session);

  if (!allowed) {
    return {
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    } as const;
  }

  return { session } as const;
}

export function accountingError(error: unknown) {
  if (error instanceof AccountingError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (error instanceof z.ZodError) {
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  console.error(error);
  return NextResponse.json({ error: "Accounting request failed" }, { status: 500 });
}
