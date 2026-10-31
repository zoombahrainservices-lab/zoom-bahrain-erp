import { NextResponse } from "next/server";

import { spreadsheetXml } from "@/lib/accounting/files";
import { toCsv } from "@/lib/accounting/csv";
import { parseAccountingFilter } from "@/lib/accounting/filters";
import { accountingError, requireAccounting } from "@/lib/accounting/http";
import { buildReport, isReportId } from "@/lib/accounting/reports";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const access = await requireAccounting("view");
  if ("error" in access && access.error) return access.error;

  try {
    const url = new URL(request.url);
    const report = url.searchParams.get("report") ?? "";
    if (!isReportId(report)) {
      return NextResponse.json({ error: "Unknown report" }, { status: 400 });
    }
    const filter = parseAccountingFilter({
      company: url.searchParams.get("company") ?? undefined,
      from: url.searchParams.get("from") ?? undefined,
      to: url.searchParams.get("to") ?? undefined,
      year: url.searchParams.get("year") ?? undefined,
      organization: url.searchParams.get("organization") ?? undefined,
    });
    const table = await buildReport(report, filter);
    if (url.searchParams.get("format") === "xls") {
      const xml = spreadsheetXml(table.title, table.headers, table.rows);
      return new NextResponse(xml, {
        headers: {
          "Content-Type": "application/vnd.ms-excel",
          "Content-Disposition": `attachment; filename="${report}.xls"`,
        },
      });
    }
    const csv = toCsv(table.headers, table.rows);
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${report}.csv"`,
      },
    });
  } catch (error) {
    return accountingError(error);
  }
}
