import { NextResponse } from "next/server";
import { z } from "zod";

import { postJournal } from "@/lib/accounting/engine";
import { accountingError, requireAccounting } from "@/lib/accounting/http";

export const runtime = "nodejs";

const lineSchema = z.object({
  accountId: z.string().optional(),
  description: z.string().optional(),
  debit: z.string().optional(),
  credit: z.string().optional(),
});

const schema = z.object({
  companyId: z.string().min(1),
  entryDate: z.string().min(1),
  description: z.string().min(1),
  status: z.enum(["draft", "posted"]),
  lines: z.array(lineSchema),
});

export async function POST(request: Request) {
  const access = await requireAccounting("draft");
  if ("error" in access && access.error) return access.error;

  try {
    const input = schema.parse(await request.json());
    if (input.status === "posted") {
      const poster = await requireAccounting("post");
      if ("error" in poster && poster.error) return poster.error;
    }
    const journal = await postJournal({
      ...input,
      sourceType: "manual",
      actorId: access.session.userId,
      lines: input.lines.map((line) => ({
        accountId: line.accountId,
        description: line.description,
        debit: line.debit || "0",
        credit: line.credit || "0",
      })),
    });
    return NextResponse.json({ id: journal.id });
  } catch (error) {
    return accountingError(error);
  }
}
