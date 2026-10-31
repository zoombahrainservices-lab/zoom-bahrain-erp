import { eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { accountingEmployees } from "@/db/schema";
import { getDivisionById } from "@/lib/divisions";

import { assertCompanyAllowed } from "./phase3";
import { AccountingError, filsToAmount, isIsoDate, toFils } from "./money";
import { isPayrollScheme, type PayrollScheme } from "./statutory";

export type EmployeeStatus = "active" | "left";

export type EmployeeInput = {
  companyId: string;
  name: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  salary?: string;
  scheme: string;
  startedOn?: string;
  status?: string;
  notes?: string;
};

export type EmployeeRecord = {
  id: string;
  companyId: string;
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  salary: string;
  scheme: PayrollScheme;
  startedOn: string;
  status: EmployeeStatus;
  notes: string;
};

type Actor = { userId: string; role: string };

function clean(value: string | undefined, limit: number) {
  return (value ?? "").trim().slice(0, limit);
}

function normalize(input: EmployeeInput) {
  const companyId = input.companyId.trim();
  if (!getDivisionById(companyId)) {
    throw new AccountingError("Choose a Zoom company");
  }
  const name = clean(input.name, 160);
  if (!name) throw new AccountingError("Enter the employee name");
  if (!isPayrollScheme(input.scheme)) {
    throw new AccountingError("Choose a payroll scheme");
  }
  const status: EmployeeStatus = input.status === "left" ? "left" : "active";
  if (input.status && input.status !== "active" && input.status !== "left") {
    throw new AccountingError("Choose active or left");
  }
  const salary = filsToAmount(toFils(input.salary?.trim() ? input.salary : "0"));
  if (toFils(salary) < 0n) throw new AccountingError("Salary cannot be negative");
  const startedOn = clean(input.startedOn, 10);
  if (startedOn && !isIsoDate(startedOn)) {
    throw new AccountingError("Start date is not valid");
  }
  const email = clean(input.email, 160);
  if (email && !email.includes("@")) {
    throw new AccountingError("Enter a valid email");
  }
  return {
    companyId,
    name,
    jobTitle: clean(input.jobTitle, 160),
    email,
    phone: clean(input.phone, 40),
    salary,
    scheme: input.scheme,
    startedOn: startedOn || null,
    status,
    notes: clean(input.notes, 2000),
  };
}

export function toEmployeeRecord(row: {
  id: string;
  companyId: string;
  name: string;
  jobTitle: string;
  email: string;
  phone: string;
  salary: string;
  scheme: string;
  startedOn: string | null;
  status: string;
  notes: string;
}): EmployeeRecord {
  return {
    id: row.id,
    companyId: row.companyId,
    name: row.name,
    jobTitle: row.jobTitle,
    email: row.email,
    phone: row.phone,
    salary: row.salary,
    scheme: isPayrollScheme(row.scheme) ? row.scheme : "sio_bahraini",
    startedOn: row.startedOn ?? "",
    status: row.status === "left" ? "left" : "active",
    notes: row.notes,
  };
}

export async function listEmployees(companyId: string, allowedIds: string[]) {
  const ids = companyId === "all" ? allowedIds : allowedIds.filter((id) => id === companyId);
  if (ids.length === 0) return [];
  const rows = await db.query.accountingEmployees.findMany({
    where: inArray(accountingEmployees.companyId, ids),
    orderBy: [accountingEmployees.name],
  });
  return rows.map(toEmployeeRecord);
}

export async function createEmployee(input: EmployeeInput, actor: Actor) {
  const values = normalize(input);
  await assertCompanyAllowed(actor.userId, actor.role, values.companyId);
  const [row] = await db
    .insert(accountingEmployees)
    .values({ id: crypto.randomUUID(), ...values })
    .returning();
  return toEmployeeRecord(row);
}

export async function updateEmployee(id: string, input: EmployeeInput, actor: Actor) {
  const existing = await db.query.accountingEmployees.findFirst({
    where: eq(accountingEmployees.id, id),
  });
  if (!existing) throw new AccountingError("Employee not found");
  await assertCompanyAllowed(actor.userId, actor.role, existing.companyId);
  const values = normalize(input);
  await assertCompanyAllowed(actor.userId, actor.role, values.companyId);
  const [row] = await db
    .update(accountingEmployees)
    .set({ ...values, updatedAt: new Date() })
    .where(eq(accountingEmployees.id, id))
    .returning();
  return toEmployeeRecord(row);
}

export async function deleteEmployee(id: string, actor: Actor) {
  const existing = await db.query.accountingEmployees.findFirst({
    where: eq(accountingEmployees.id, id),
  });
  if (!existing) throw new AccountingError("Employee not found");
  await assertCompanyAllowed(actor.userId, actor.role, existing.companyId);
  await db.delete(accountingEmployees).where(eq(accountingEmployees.id, id));
}
