import { sql } from "drizzle-orm";

import { db } from "@/db";
import { codeSequences } from "@/db/schema";

export const ORG_CODE_PREFIX = "ZGC-ORG";
export const CON_CODE_PREFIX = "ZGC-CON";
export const INQ_CODE_PREFIX = "ZGC-INQ";
export const OPS_CODE_PREFIX = "ZGC-OPS";

export type CodePrefix =
  | typeof ORG_CODE_PREFIX
  | typeof CON_CODE_PREFIX
  | typeof INQ_CODE_PREFIX
  | typeof OPS_CODE_PREFIX;

/** @deprecated Use OPS_CODE_PREFIX */
export const SVC_CODE_PREFIX = OPS_CODE_PREFIX;

export function formatSequentialCode(prefix: string, value: number) {
  return `${prefix}-${String(value).padStart(5, "0")}`;
}

type DbExecutor = Pick<typeof db, "execute">;

export async function allocateNextCode(executor: DbExecutor, prefix: CodePrefix) {
  const result = await executor.execute(sql`
    INSERT INTO code_sequences (prefix, next_value)
    VALUES (${prefix}, 1)
    ON CONFLICT (prefix) DO UPDATE
    SET next_value = code_sequences.next_value + 1
    RETURNING next_value AS value
  `);

  const row = result[0] as { value: number } | undefined;
  if (!row?.value) {
    throw new Error(`Failed to allocate code for ${prefix}`);
  }

  return formatSequentialCode(prefix, row.value);
}

export async function ensureCodeSequences() {
  await db
    .insert(codeSequences)
    .values([
      { prefix: ORG_CODE_PREFIX, nextValue: 1 },
      { prefix: CON_CODE_PREFIX, nextValue: 1 },
      { prefix: INQ_CODE_PREFIX, nextValue: 1 },
      { prefix: OPS_CODE_PREFIX, nextValue: 1 },
    ])
    .onConflictDoNothing();
}
