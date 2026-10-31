import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import {
  accountingBills,
  accountingExpenses,
  accountingSettings,
  operationEntries,
} from "@/db/schema";
import { textPdf } from "@/lib/accounting/files";
import { parseAccountingFilter } from "@/lib/accounting/filters";
import { accountingError, requireAccounting } from "@/lib/accounting/http";
import { buildReport, isReportId } from "@/lib/accounting/reports";
import { getDivisionById, getDivisionName } from "@/lib/divisions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAccounting("view");
  if ("error" in access && access.error) return access.error;
  try {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") ?? "report";
    const lines =
      kind === "bill"
        ? await billLines(url.searchParams.get("id") ?? "")
        : kind === "expense"
          ? await expenseLines(url.searchParams.get("id") ?? "")
          : kind === "invoice"
            ? await invoiceLines(url.searchParams.get("id") ?? "")
            : await reportLines(url);
    const pdf = textPdf(lines);
    const name = kind === "report" ? url.searchParams.get("report") ?? "report" : kind;
    return new NextResponse(pdf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}.pdf"`,
      },
    });
  } catch (error) {
    return accountingError(error);
  }
}

async function reportLines(url: URL) {
  const report = url.searchParams.get("report") ?? "";
  if (!isReportId(report)) throw new Error("Unknown report");
  const filter = parseAccountingFilter({
    company: url.searchParams.get("company") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    year: url.searchParams.get("year") ?? undefined,
    organization: url.searchParams.get("organization") ?? undefined,
  });
  const table = await buildReport(report, filter);
  return [table.title, table.note, table.headers.join(" | "), ...table.rows.map((row) => row.join(" | "))];
}

async function billLines(id: string) {
  const bill = await db.query.accountingBills.findFirst({
    where: eq(accountingBills.id, id),
    with: { supplier: true, lines: true },
  });
  if (!bill) throw new Error("Bill not found");
  const issuer = await issuerLines(bill.companyId);
  return [
    bill.documentKind === "credit_note" ? "Supplier credit note" : "Supplier bill",
    ...issuer,
    `Number ${bill.billNumber}`,
    `Supplier ${bill.supplier?.name ?? ""}`,
    `Date ${bill.billDate}  Due ${bill.dueDate}`,
    `Currency ${bill.currency}  Rate to BHD ${bill.exchangeRate}`,
    `Reference ${bill.reference}`,
    ...bill.lines.map(
      (line) =>
        `${line.description}  qty ${line.quantity}  price ${line.unitAmount}  discount ${line.discount}  net ${line.netAmount}  VAT ${line.vatAmount}  total ${line.lineTotal}`,
    ),
    `Subtotal ${bill.subtotal}  Discount ${bill.discountTotal}  VAT ${bill.vatTotal}  Total ${bill.total}`,
    "Amounts are in the bill currency. The ledger is posted in BHD.",
  ];
}

async function expenseLines(id: string) {
  const expense = await db.query.accountingExpenses.findFirst({
    where: eq(accountingExpenses.id, id),
    with: { account: true, organization: true },
  });
  if (!expense) throw new Error("Expense not found");
  return [
    "Expense",
    ...(await issuerLines(expense.companyId)),
    `Number ${expense.expenseNumber}`,
    `Date ${expense.expenseDate}`,
    `Account ${expense.account?.code ?? ""} ${expense.account?.name ?? ""}`,
    `Payee ${expense.organization?.name ?? ""}`,
    `Method ${expense.method}  Reference ${expense.reference}`,
    expense.description,
    `Net ${expense.netAmount}  VAT ${expense.vatAmount}  Total ${expense.totalAmount} ${expense.currency}`,
  ];
}

async function invoiceLines(id: string) {
  const entry = await db.query.operationEntries.findFirst({
    where: eq(operationEntries.id, id),
    with: { operation: { with: { organization: true } }, lines: true },
  });
  if (!entry?.operation || entry.entryType !== "invoice") throw new Error("Invoice not found");
  return [
    "Sales invoice",
    ...(await issuerLines(entry.operation.divisionId)),
    `Operation ${entry.operation.operationCode}`,
    `Customer ${entry.operation.organization?.name ?? ""}`,
    `Stage ${entry.documentStage ?? "draft"}`,
    `Amount ${entry.amount ?? ""}`,
    ...entry.lines.map((line) => `${line.description}  ${line.quantity} x ${line.unitAmount}`),
    "This file uses the existing operation invoice. It does not issue a new number.",
    "VAT is not calculated on this operation total unless the lines already contain it.",
  ];
}

async function issuerLines(companyId: string) {
  const settings = await db.query.accountingSettings.findFirst({
    where: eq(accountingSettings.companyId, companyId),
  });
  const division = getDivisionById(companyId);
  return [
    settings?.legalName || getDivisionName(companyId),
    settings?.address || "",
    [settings?.phone, settings?.email].filter(Boolean).join("  "),
    settings?.crNumber ? `CR ${settings.crNumber}` : "",
    settings?.vatRegistered && settings.vatNumber ? `VAT ${settings.vatNumber}` : "VAT registration not recorded",
    division?.website ?? "",
    "Company logo is shown in Zoom. This PDF is a text copy and does not embed the SVG logo.",
  ].filter(Boolean);
}
