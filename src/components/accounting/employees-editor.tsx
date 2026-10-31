"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";
import { Panel } from "@/components/accounting/ui";
import type { EmployeeRecord, EmployeeStatus } from "@/lib/accounting/employees";
import { payrollSchemes, type PayrollScheme } from "@/lib/accounting/statutory";
import { formatBhd } from "@/lib/utils";

const schemeLabels: Record<PayrollScheme, string> = {
  sio_bahraini: "SIO, Bahraini",
  sio_expat: "SIO, non-Bahraini",
  gosi_saudi_existing: "GOSI, Saudi (before Jul 2024)",
  gosi_saudi_new: "GOSI, Saudi (from Jul 2024)",
  gosi_expat: "GOSI, non-Saudi",
};

const emptyEmployee = {
  companyId: "",
  name: "",
  jobTitle: "",
  email: "",
  phone: "",
  salary: "",
  scheme: "sio_bahraini" as PayrollScheme,
  startedOn: "",
  status: "active" as EmployeeStatus,
  notes: "",
};

type Draft = typeof emptyEmployee;

export function EmployeesEditor({
  employees,
  companies,
  companyId,
}: {
  employees: EmployeeRecord[];
  companies: Array<{ id: string; name: string }>;
  companyId: string;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(employees);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function companyName(id: string) {
    return companies.find((company) => company.id === id)?.name ?? id;
  }

  function startAdd() {
    setEditingId(null);
    setError("");
    setDraft({
      ...emptyEmployee,
      companyId: companyId === "all" ? (companies[0]?.id ?? "") : companyId,
    });
  }

  function startEdit(employee: EmployeeRecord) {
    setEditingId(employee.id);
    setError("");
    setDraft({
      companyId: employee.companyId,
      name: employee.name,
      jobTitle: employee.jobTitle,
      email: employee.email,
      phone: employee.phone,
      salary: employee.salary,
      scheme: employee.scheme,
      startedOn: employee.startedOn,
      status: employee.status,
      notes: employee.notes,
    });
  }

  function closeForm() {
    setDraft(null);
    setEditingId(null);
    setError("");
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const employee = await saveEmployee(
        editingId ? `/api/accounting/employees/${editingId}` : "/api/accounting/employees",
        editingId ? "PATCH" : "POST",
        draft,
      );
      setRows((current) => {
        const next = editingId
          ? current.map((row) => (row.id === employee.id ? employee : row))
          : [...current, employee];
        return next
          .filter((row) => companyId === "all" || row.companyId === companyId)
          .sort((a, b) => a.name.localeCompare(b.name));
      });
      closeForm();
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not save the employee");
    } finally {
      setSaving(false);
    }
  }

  async function remove(employee: EmployeeRecord) {
    if (!window.confirm(`Delete ${employee.name} from the company list?`)) return;
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/accounting/employees/${employee.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not delete the employee");
      setRows((current) => current.filter((row) => row.id !== employee.id));
      if (editingId === employee.id) closeForm();
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Could not delete the employee");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="button" onClick={draft && !editingId ? closeForm : startAdd}>
          {draft && !editingId ? "Close" : "Add employee"}
        </Button>
      </div>

      {draft ? (
        <Panel title={editingId ? "Edit employee" : "Add employee"}>
          <EmployeeFields
            value={draft}
            companies={companies}
            lockCompany={companyId !== "all"}
            onChange={setDraft}
            onSubmit={submit}
            onCancel={closeForm}
            saving={saving}
            error={error}
            submitLabel={saving ? "Saving..." : editingId ? "Save changes" : "Add employee"}
          />
        </Panel>
      ) : null}

      <Panel title="Employees">
        {rows.length === 0 ? (
          <p className="text-sm text-text-secondary">No employees for this company yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-foreground">
              <thead className="text-text-secondary">
                <tr>
                  {(companyId === "all" ? ["Company"] : []).concat([
                    "Name",
                    "Job title",
                    "Salary",
                    "Scheme",
                    "Status",
                    "Phone",
                    "Email",
                    "",
                  ]).map((header) => (
                    <th key={header || "actions"} className="border-b border-border px-3 py-2 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((employee) => (
                  <tr key={employee.id}>
                    {companyId === "all" ? (
                      <td className="border-b border-border px-3 py-2">{companyName(employee.companyId)}</td>
                    ) : null}
                    <td className="border-b border-border px-3 py-2 font-medium text-heading">{employee.name}</td>
                    <td className="border-b border-border px-3 py-2">{employee.jobTitle || "—"}</td>
                    <td className="border-b border-border px-3 py-2 tabular-nums">{formatBhd(employee.salary) || "—"}</td>
                    <td className="border-b border-border px-3 py-2">{schemeLabels[employee.scheme]}</td>
                    <td className="border-b border-border px-3 py-2">{employee.status === "left" ? "Left" : "Active"}</td>
                    <td className="border-b border-border px-3 py-2">{employee.phone || "—"}</td>
                    <td className="border-b border-border px-3 py-2">{employee.email || "—"}</td>
                    <td className="border-b border-border px-3 py-2">
                      <div className="flex justify-end gap-2">
                        <Button type="button" outline disabled={saving} onClick={() => startEdit(employee)}>
                          Edit
                        </Button>
                        <Button type="button" outline disabled={saving} onClick={() => remove(employee)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!draft && error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
      </Panel>
    </div>
  );
}

function EmployeeFields({
  value,
  companies,
  lockCompany,
  onChange,
  onSubmit,
  onCancel,
  saving,
  error,
  submitLabel,
}: {
  value: Draft;
  companies: Array<{ id: string; name: string }>;
  lockCompany?: boolean;
  onChange: (value: Draft) => void;
  onSubmit: (event: React.FormEvent) => void;
  onCancel: () => void;
  saving: boolean;
  error: string;
  submitLabel: string;
}) {
  function set<K extends keyof Draft>(key: K, next: Draft[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <form className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" onSubmit={onSubmit}>
      {lockCompany ? null : (
        <label className="block text-sm font-medium text-foreground">
          Company
          <Select
            className="mt-1"
            value={value.companyId}
            onChange={(event) => set("companyId", event.target.value)}
            required
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </label>
      )}
      <label className="block text-sm font-medium text-foreground">
        Name
        <Input className="mt-1" value={value.name} onChange={(event) => set("name", event.target.value)} required />
      </label>
      <label className="block text-sm font-medium text-foreground">
        Job title
        <Input className="mt-1" value={value.jobTitle} onChange={(event) => set("jobTitle", event.target.value)} />
      </label>
      <label className="block text-sm font-medium text-foreground">
        Monthly salary (BHD)
        <Input className="mt-1" value={value.salary} onChange={(event) => set("salary", event.target.value)} inputMode="decimal" placeholder="0.000" />
      </label>
      <label className="block text-sm font-medium text-foreground">
        Payroll scheme
        <Select
          className="mt-1"
          value={value.scheme}
          onChange={(event) => set("scheme", event.target.value as PayrollScheme)}
        >
          {payrollSchemes.map((scheme) => (
            <option key={scheme} value={scheme}>
              {schemeLabels[scheme]}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-sm font-medium text-foreground">
        Status
        <Select
          className="mt-1"
          value={value.status}
          onChange={(event) => set("status", event.target.value as EmployeeStatus)}
        >
          <option value="active">Active</option>
          <option value="left">Left</option>
        </Select>
      </label>
      <label className="block text-sm font-medium text-foreground">
        Start date
        <Input className="mt-1" type="date" value={value.startedOn} onChange={(event) => set("startedOn", event.target.value)} />
      </label>
      <label className="block text-sm font-medium text-foreground">
        Email
        <Input className="mt-1" type="email" value={value.email} onChange={(event) => set("email", event.target.value)} />
      </label>
      <label className="block text-sm font-medium text-foreground">
        Phone
        <Input className="mt-1" value={value.phone} onChange={(event) => set("phone", event.target.value)} />
      </label>
      <label className="block text-sm font-medium text-foreground sm:col-span-2 xl:col-span-4">
        Notes
        <Input className="mt-1" value={value.notes} onChange={(event) => set("notes", event.target.value)} />
      </label>
      {error ? <p className="text-sm text-red-500 sm:col-span-2 xl:col-span-4">{error}</p> : null}
      <div className="flex flex-wrap gap-2 sm:col-span-2 xl:col-span-4">
        <Button type="submit" disabled={saving}>{submitLabel}</Button>
        <Button type="button" outline disabled={saving} onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

async function saveEmployee(url: string, method: "POST" | "PATCH", value: Draft) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(value),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Could not save the employee");
  return data.employee as EmployeeRecord;
}
