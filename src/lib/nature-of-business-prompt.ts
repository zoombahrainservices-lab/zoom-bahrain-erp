const NATURE_OF_BUSINESS_EXAMPLE =
  "Industrial water-treatment and membrane-treatment solutions; authorized distributor of specialty membrane chemicals and services for RO, desalination and water-reuse systems.";

export function buildNatureOfBusinessChatGptPrompt(input: {
  companyName: string;
  website?: string;
}) {
  const companyName = input.companyName.trim() || "[Company legal name]";
  const website = input.website?.trim();

  return [
    `Search online for the company "${companyName}".`,
    website ? `Website: ${website}` : null,
    "",
    "Write ONE short paragraph for their nature of business.",
    `Match this style: "${NATURE_OF_BUSINESS_EXAMPLE}"`,
    "One paragraph only, concise, semicolon-separated clauses are fine. No headings or extra explanation.",
  ]
    .filter(Boolean)
    .join("\n");
}

export { copyTextToClipboard } from "@/lib/clipboard";

export const natureOfBusinessPlaceholder = NATURE_OF_BUSINESS_EXAMPLE;
