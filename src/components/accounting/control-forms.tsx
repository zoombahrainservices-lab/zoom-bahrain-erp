"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { formatStatutory, statutoryPayroll, type PayrollScheme } from "@/lib/accounting/statutory";
import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";

async function postControl(body: Record<string, unknown>) {
  const response = await fetch("/api/accounting/phase3", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; status?: string; note?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

function useSubmit(success: string) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  return {
    saving,
    run(body: Record<string, unknown>) {
      setSaving(true);
      postControl(body)
        .then((data) => {
          toast.success(data.note || data.status || success);
          router.refresh();
        })
        .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Request failed"))
        .finally(() => setSaving(false));
    },
  };
}

export function ReminderRunForm() {
  const { saving, run } = useSubmit("Reminders queued");
  return (
    <form
      className="flex flex-wrap items-center gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        run({ action: "runReminders", deliver: form.get("deliver") === "on" });
      }}
    >
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" name="deliver" />
        Attempt delivery
      </label>
      <Button type="submit" disabled={saving}>Queue due reminders</Button>
    </form>
  );
}

export function DeliverButton({ id }: { id: string }) {
  const { saving, run } = useSubmit("Delivery attempted");
  return (
    <Button type="button" disabled={saving} onClick={() => run({ action: "deliverEmail", id })}>
      Retry delivery
    </Button>
  );
}

export function IntercompanyForm({ companies }: { companies: Array<{ id: string; name: string }> }) {
  const { saving, run } = useSubmit("Intercompany journals posted");
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        run({
          action: "intercompany",
          fromCompanyId: String(form.get("fromCompanyId") ?? ""),
          toCompanyId: String(form.get("toCompanyId") ?? ""),
          kind: String(form.get("kind") ?? "expense"),
          amount: String(form.get("amount") ?? ""),
          entryDate: String(form.get("entryDate") ?? ""),
          description: String(form.get("description") ?? ""),
          expenseAccountId: String(form.get("expenseAccountId") ?? "") || null,
        });
      }}
    >
      <Select name="fromCompanyId">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select>
      <Select name="toCompanyId">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select>
      <Select name="kind" defaultValue="expense">
        <option value="expense">Company A pays an expense for Company B</option>
        <option value="loan">Intercompany loan</option>
        <option value="settlement">Settlement</option>
      </Select>
      <Input name="expenseAccountId" placeholder="Expense account id, for the expense kind" />
      <Input name="amount" placeholder="Amount BHD" required />
      <Input type="date" name="entryDate" required />
      <Input name="description" placeholder="Description" required className="sm:col-span-2" />
      <Button type="submit" disabled={saving}>Post both company books</Button>
    </form>
  );
}

export function StockForm({ companies }: { companies: Array<{ id: string; name: string }> }) {
  const { saving, run } = useSubmit("Stock movement saved");
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        run({
          action: "stock",
          companyId: String(form.get("companyId") ?? ""),
          sku: String(form.get("sku") ?? ""),
          name: String(form.get("name") ?? ""),
          ownership: String(form.get("ownership") ?? "company"),
          warehouseName: String(form.get("warehouseName") ?? ""),
          locationName: String(form.get("locationName") ?? "Main"),
          kind: String(form.get("kind") ?? "receipt"),
          quantity: String(form.get("quantity") ?? ""),
          unitCost: String(form.get("unitCost") ?? "0"),
          movedOn: String(form.get("movedOn") ?? ""),
        });
      }}
    >
      <Select name="companyId">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select>
      <Select name="ownership" defaultValue="company">
        <option value="company">Company-owned</option>
        <option value="customer">Customer-owned, held in custody</option>
      </Select>
      <Input name="sku" placeholder="SKU" required />
      <Input name="name" placeholder="Item name" />
      <Input name="warehouseName" placeholder="Warehouse" required />
      <Input name="locationName" placeholder="Location" defaultValue="Main" />
      <Select name="kind" defaultValue="receipt">
        <option value="receipt">Goods received</option>
        <option value="sale">Goods sold</option>
        <option value="issue">Goods issued</option>
        <option value="return">Stock return</option>
        <option value="adjustment">Adjustment</option>
        <option value="transfer">Transfer record</option>
      </Select>
      <Input name="quantity" placeholder="Quantity" required />
      <Input name="unitCost" placeholder="Unit cost BHD" defaultValue="0.000" />
      <Input type="date" name="movedOn" required />
      <Button type="submit" disabled={saving}>Save legacy stock adjustment</Button>
    </form>
  );
}

export function PayrollForm({ companies }: { companies: Array<{ id: string; name: string }> }) {
  const { saving, run } = useSubmit("Payroll posted");
  const [scheme, setScheme] = useState<PayrollScheme>("sio_bahraini");
  const [wage, setWage] = useState("");
  const [yearsOfService, setYearsOfService] = useState("0");
  const [otherDeductions, setOtherDeductions] = useState("0.000");
  const [entryDate, setEntryDate] = useState("");
  const preview = (() => {
    if (!wage.trim() || !entryDate) return null;
    try {
      return formatStatutory(statutoryPayroll({ scheme, wage, yearsOfService, otherDeductions, entryDate }));
    } catch (error) {
      return error instanceof Error ? error.message : "Check the wage";
    }
  })();
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        run({
          action: "payroll",
          companyId: String(form.get("companyId") ?? ""),
          periodLabel: String(form.get("periodLabel") ?? ""),
          scheme,
          wage,
          yearsOfService,
          otherDeductions,
          entryDate,
        });
      }}
    >
      <Select name="companyId">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select>
      <Input name="periodLabel" placeholder="October 2026" required />
      <Select name="scheme" value={scheme} onChange={(event) => setScheme(event.target.value as PayrollScheme)}>
        <option value="sio_bahraini">SIO, Bahraini employee</option>
        <option value="sio_expat">SIO, non-Bahraini employee</option>
        <option value="gosi_saudi_existing">GOSI, Saudi employee registered before 3 July 2024</option>
        <option value="gosi_saudi_new">GOSI, Saudi employee registered on or after 3 July 2024</option>
        <option value="gosi_expat">GOSI, non-Saudi employee</option>
      </Select>
      <Input name="wage" value={wage} onChange={(event) => setWage(event.target.value)} placeholder="Contributory wage" required />
      <Input name="yearsOfService" value={yearsOfService} onChange={(event) => setYearsOfService(event.target.value)} placeholder="Years of service" required />
      <Input name="otherDeductions" value={otherDeductions} onChange={(event) => setOtherDeductions(event.target.value)} placeholder="Other deductions" />
      <Input type="date" name="entryDate" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} required />
      {typeof preview === "string" ? (
        <p className="text-sm text-text-secondary sm:col-span-2">{preview}</p>
      ) : preview ? (
        <p className="text-sm text-foreground sm:col-span-2">
          Employee {preview.employee} · employer insurance {preview.employerInsurance} · end of service {preview.endOfService} · net pay {preview.net} · payable to SIO or GOSI {preview.statutoryPayable}
        </p>
      ) : null}
      <Button type="submit" disabled={saving}>Post calculated payroll</Button>
    </form>
  );
}

export function GrantForm({ companies }: { companies: Array<{ id: string; name: string }> }) {
  const { saving, run } = useSubmit("Company access saved");
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        run({
          action: "grant",
          userId: String(form.get("userId") ?? ""),
          companyId: String(form.get("companyId") ?? ""),
          roleKey: String(form.get("roleKey") ?? "viewer"),
        });
      }}
    >
      <Input name="userId" placeholder="User id" required />
      <Select name="companyId">{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</Select>
      <Select name="roleKey" defaultValue="accountant">
        <option value="group_admin">Group administrator</option>
        <option value="finance_manager">Finance manager</option>
        <option value="accountant">Accountant</option>
        <option value="payables">Accounts payable</option>
        <option value="receivables">Accounts receivable</option>
        <option value="viewer">Finance viewer</option>
        <option value="auditor">Auditor</option>
      </Select>
      <Button type="submit" disabled={saving}>Restrict this user to the company</Button>
    </form>
  );
}
