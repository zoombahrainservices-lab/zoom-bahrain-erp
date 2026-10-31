import { z } from "zod";

export type OperationDocumentLineRecord = {
  id: string;
  entryId: string;
  description: string;
  quantity: string;
  unitAmount: string;
  sortOrder: number;
};

export const documentLineDraftSchema = z.object({
  description: z.string().max(200).default(""),
  quantity: z.coerce.number().min(0),
  unitAmount: z.coerce.number().min(0),
  discount: z.coerce.number().min(0).optional(),
  vatCodeId: z.string().nullable().optional(),
});

export const documentLinesReplaceSchema = z.object({
  lines: z.array(documentLineDraftSchema).max(50),
  issuedOn: z.string().optional(),
  dueOn: z.string().optional(),
  paymentTerms: z.string().max(80).optional(),
  body: z.string().max(4000).optional(),
});

export type DocumentLineDraft = z.infer<typeof documentLineDraftSchema>;

export function lineTotal(quantity: number, unitAmount: number) {
  return Math.round(quantity * unitAmount * 1000) / 1000;
}

export function documentLinesTotal(lines: DocumentLineDraft[]) {
  return lines.reduce(
    (sum, line) => sum + lineTotal(line.quantity, line.unitAmount),
    0,
  );
}

export function usableDocumentLines(lines: DocumentLineDraft[]) {
  return lines.filter(
    (line) =>
      line.description.trim().length > 0 ||
      line.quantity > 0 ||
      line.unitAmount > 0,
  );
}

export function assertDocumentCanBeSent(lines: DocumentLineDraft[]) {
  const usable = usableDocumentLines(lines);
  if (usable.length === 0) {
    throw new Error("Add at least one line with a quantity and amount");
  }

  for (const line of usable) {
    if (line.quantity <= 0) {
      throw new Error("Every line needs a quantity");
    }
    if (line.unitAmount <= 0) {
      throw new Error("Every line needs an amount");
    }
  }

  if (documentLinesTotal(usable) <= 0) {
    throw new Error("Total must be greater than zero");
  }

  return usable;
}
