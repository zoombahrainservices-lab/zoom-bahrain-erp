import { eq } from "drizzle-orm";

import { db } from "@/db";
import { salesInquiries } from "@/db/schema";
import {
  type InquiryCreateInput,
  inquiryToDbValues,
} from "@/lib/inquiry-fields";
import { INQ_CODE_PREFIX, allocateNextCode } from "@/lib/organization-codes";

export async function createInquiryWithCode(
  input: InquiryCreateInput,
  createdById: string,
) {
  const inquiryId = crypto.randomUUID();

  return db.transaction(async (tx) => {
    const inquiryCode = await allocateNextCode(tx, INQ_CODE_PREFIX);
    const values = inquiryToDbValues(input);

    await tx.insert(salesInquiries).values({
      id: inquiryId,
      inquiryCode,
      ...values,
      status: "open",
      createdById,
    });

    return tx.query.salesInquiries.findFirst({
      where: eq(salesInquiries.id, inquiryId),
      with: {
        createdBy: {
          columns: { id: true, name: true },
        },
      },
    });
  });
}
