import { EmployeesEditor } from "@/components/accounting/employees-editor";
import { Button } from "@/components/catalyst/button";
import { Select } from "@/components/catalyst/select";
import { listEmployees } from "@/lib/accounting/employees";
import { loadAccountingPage } from "@/lib/accounting/page";

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string }>;
}) {
  const page = await loadAccountingPage(await searchParams);
  const employees = await listEmployees(
    page.filter.companyId,
    page.companies.map((company) => company.id),
  );

  return (
    <div className="space-y-6">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="block text-sm font-medium text-foreground">
          Company
          <Select name="company" defaultValue={page.filter.companyId} className="mt-1 min-w-52">
            <option value="all">All companies</option>
            {page.companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit">Apply</Button>
      </form>
      <p className="text-sm text-text-secondary">
        People who work for the selected company. Update the salary, job, contact details, payroll scheme, and status, then save. Delete removes that person from this list.
      </p>
      <EmployeesEditor
        employees={employees}
        companies={page.companies}
        companyId={page.filter.companyId}
      />
    </div>
  );
}
