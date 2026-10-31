import assert from "node:assert/strict";
import { after, test } from "node:test";
import { eq } from "drizzle-orm";

import { closeDatabase, db } from "@/db";
import { accountingAccounts, accountingJournals } from "@/db/schema";
import { postJournalWithin } from "@/lib/accounting/engine";
import { AccountingError } from "@/lib/accounting/money";

after(async () => {
  await closeDatabase();
});

test("a supplier-style journal rolls back and does not stay in the ledger", async () => {
  const user = await db.query.users.findFirst({ columns: { id: true } });
  const cash = await db.query.accountingAccounts.findFirst({
    where: eq(accountingAccounts.code, "1000"),
  });
  const expense = await db.query.accountingAccounts.findFirst({
    where: eq(accountingAccounts.code, "5900"),
  });
  if (!user || !cash || !expense || cash.companyId !== expense.companyId) {
    return;
  }
  const marker = `phase2-rollback-${crypto.randomUUID()}`;
  await assert.rejects(
    db.transaction(async (tx) => {
      const journal = await postJournalWithin(tx, {
        companyId: cash.companyId,
        entryDate: "2026-10-27",
        description: marker,
        sourceType: "expense",
        sourceId: crypto.randomUUID(),
        status: "posted",
        actorId: user.id,
        lines: [
          { accountId: expense.id, debit: "1.000", credit: "0", description: marker },
          { accountId: cash.id, debit: "0", credit: "1.000", description: marker },
        ],
      });
      assert.ok(journal.id);
      throw new AccountingError("rollback");
    }),
    /rollback/,
  );
  const leftover = await db.query.accountingJournals.findFirst({
    where: eq(accountingJournals.description, marker),
  });
  assert.equal(leftover, undefined);
});
