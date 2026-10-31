import Link from "next/link";

import { HomeDashboard } from "@/components/accounting/home-dashboard";
import { loadHomeContext } from "@/lib/accounting/page";
import { getDashboard, getHomeTrends } from "@/lib/accounting/queries";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{
    company?: string;
    from?: string;
    to?: string;
    year?: string;
  }>;
}) {
  const home = await loadHomeContext(await searchParams);
  if (home.status === "unavailable") {
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold text-heading">Home</h1>
        <p className="text-sm text-text-secondary">Company figures are available to staff.</p>
        <div className="flex gap-3 text-sm">
          <Link href="/guide" className="font-medium text-heading">Guide</Link>
          <Link href="/now" className="font-medium text-heading">Now</Link>
        </div>
      </div>
    );
  }
  if (home.status === "no-company") {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-heading">Home</h1>
        <p className="text-sm text-text-secondary">No company is available for this login.</p>
      </div>
    );
  }

  const dashboard = await getDashboard(home.filter);
  const trends = await getHomeTrends(home.filter, dashboard.includedCompanyIds);
  const figures = home.filter.companyId === "all" ? dashboard.totals : dashboard.companies[0];
  if (!figures) {
    return (
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-heading">Home</h1>
        <p className="text-sm text-text-secondary">No company figures are available.</p>
      </div>
    );
  }

  return (
    <HomeDashboard
      filter={home.filter}
      companies={home.companies}
      figures={figures}
      missingRates={dashboard.missingRates}
      months={trends.months}
      truncated={trends.truncated}
      recent={dashboard.recent}
    />
  );
}
