import { filsToAmount, toFils } from "./money";

export const payrollSchemes = [
  "sio_bahraini",
  "sio_expat",
  "gosi_saudi_existing",
  "gosi_saudi_new",
  "gosi_expat",
] as const;

export type PayrollScheme = (typeof payrollSchemes)[number];

export function isPayrollScheme(value: string): value is PayrollScheme {
  return (payrollSchemes as readonly string[]).includes(value);
}

export type StatutoryPayroll = {
  wage: bigint;
  employee: bigint;
  employerInsurance: bigint;
  endOfService: bigint;
  employer: bigint;
  otherDeductions: bigint;
  net: bigint;
  expense: bigint;
  statutoryPayable: bigint;
};

function percent(amount: bigint, basisPoints: number) {
  return (amount * BigInt(basisPoints)) / 10000n;
}

function sioEmployerBasisPoints(entryDate: string) {
  const year = Number(entryDate.slice(0, 4));
  if (year >= 2028) return 2000;
  if (year === 2027) return 1900;
  if (year === 2026) return 1800;
  if (year === 2025) return 1700;
  if (year === 2024) return 1600;
  if (year === 2023) return 1500;
  return 1400;
}

function gosiNewBasisPoints(entryDate: string) {
  if (entryDate < "2025-07-01") return { employer: 1175, employee: 975 };
  if (entryDate < "2026-07-01") return { employer: 1225, employee: 1025 };
  if (entryDate < "2027-07-01") return { employer: 1275, employee: 1075 };
  if (entryDate < "2028-07-01") return { employer: 1325, employee: 1125 };
  return { employer: 1375, employee: 1175 };
}

function ratesFor(scheme: PayrollScheme, entryDate: string, years: number) {
  if (scheme === "sio_bahraini") {
    const employee = entryDate < "2023-01-01" ? 700 : 800;
    return {
      employee,
      employer: sioEmployerBasisPoints(entryDate),
      endOfService: (_wage: bigint) => 0n,
    };
  }
  if (scheme === "sio_expat") {
    const endOfServiceRate = years < 3 ? 420 : 840;
    return {
      employee: 100,
      employer: 300,
      endOfService: (wage: bigint) => percent(wage, endOfServiceRate),
    };
  }
  if (scheme === "gosi_saudi_existing") {
    return { employee: 975, employer: 1175, endOfService: (_wage: bigint) => 0n };
  }
  if (scheme === "gosi_saudi_new") {
    const rates = gosiNewBasisPoints(entryDate);
    return { employee: rates.employee, employer: rates.employer, endOfService: (_wage: bigint) => 0n };
  }
  return {
    employee: 0,
    employer: 200,
    endOfService: (wage: bigint) => (years < 5 ? wage / 24n : wage / 12n),
  };
}

export function statutoryPayroll(input: {
  scheme: PayrollScheme;
  wage: string;
  yearsOfService: string;
  otherDeductions: string;
  entryDate: string;
}): StatutoryPayroll {
  const wage = toFils(input.wage);
  const otherDeductions = toFils(input.otherDeductions || "0");
  const years = Number(input.yearsOfService || "0");
  if (!Number.isFinite(years) || years < 0) {
    throw new Error("Years of service cannot be negative");
  }
  if (wage <= 0n) throw new Error("Enter the wage");
  if (otherDeductions < 0n) throw new Error("Deductions cannot be negative");
  const rates = ratesFor(input.scheme, input.entryDate, years);
  const employee = percent(wage, rates.employee);
  const employerInsurance = percent(wage, rates.employer);
  const endOfService = rates.endOfService(wage);
  const employer = employerInsurance + endOfService;
  const net = wage - employee - otherDeductions;
  if (net < 0n) throw new Error("Deductions cannot exceed the wage");
  return {
    wage,
    employee,
    employerInsurance,
    endOfService,
    employer,
    otherDeductions,
    net,
    expense: wage + employer,
    statutoryPayable: employee + employer,
  };
}

export function formatStatutory(amounts: StatutoryPayroll) {
  return {
    wage: filsToAmount(amounts.wage),
    employee: filsToAmount(amounts.employee),
    employerInsurance: filsToAmount(amounts.employerInsurance),
    endOfService: filsToAmount(amounts.endOfService),
    net: filsToAmount(amounts.net),
    statutoryPayable: filsToAmount(amounts.statutoryPayable),
  };
}
