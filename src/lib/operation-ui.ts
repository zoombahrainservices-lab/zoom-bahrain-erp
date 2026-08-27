import type { OperationEntryType } from "@/db/schema";

export const titleExamples = [
  "MIT Technical Seminar",
  "Warehouse enquiry — 100 sqm",
  "Staff LMRA follow-up",
  "Rent collection",
  "Kanoo Blue AC repair",
  "Zoom car expenses",
];

export const wizardSteps = [
  { id: "who", label: "Who", help: "Company or person this work is about" },
  { id: "division", label: "Division", help: "Which Zoom company handles it" },
  { id: "about", label: "What", help: "Short name for this job or file" },
] as const;

export type { OperationEntryType };
