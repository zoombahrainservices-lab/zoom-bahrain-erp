import type { AccountType, NormalBalance, VatTreatment } from "@/db/schema";

export type ChartSeed = {
  code: string;
  name: string;
  accountType: AccountType;
  subtype: string;
  normalBalance: NormalBalance;
};

export const defaultChart: ChartSeed[] = [
  { code: "1000", name: "Cash", accountType: "asset", subtype: "cash", normalBalance: "debit" },
  { code: "1010", name: "Bank", accountType: "asset", subtype: "bank", normalBalance: "debit" },
  { code: "1100", name: "Accounts Receivable", accountType: "asset", subtype: "receivable", normalBalance: "debit" },
  { code: "1150", name: "Input VAT", accountType: "asset", subtype: "vat_input", normalBalance: "debit" },
  { code: "1200", name: "Inventory", accountType: "asset", subtype: "inventory", normalBalance: "debit" },
  { code: "1500", name: "Fixed Assets", accountType: "asset", subtype: "fixed_asset", normalBalance: "debit" },
  { code: "2000", name: "Accounts Payable", accountType: "liability", subtype: "payable", normalBalance: "credit" },
  { code: "2100", name: "VAT Payable", accountType: "liability", subtype: "vat_output", normalBalance: "credit" },
  { code: "2200", name: "Loans", accountType: "liability", subtype: "loan", normalBalance: "credit" },
  { code: "2300", name: "Accrued Expenses", accountType: "liability", subtype: "accrual", normalBalance: "credit" },
  { code: "2350", name: "Card clearing", accountType: "liability", subtype: "card", normalBalance: "credit" },
  { code: "3000", name: "Share Capital", accountType: "equity", subtype: "capital", normalBalance: "credit" },
  { code: "3100", name: "Retained Earnings", accountType: "equity", subtype: "retained_earnings", normalBalance: "credit" },
  { code: "3990", name: "Opening Balance Equity", accountType: "equity", subtype: "opening", normalBalance: "credit" },
  { code: "4000", name: "Sales Revenue", accountType: "income", subtype: "sales", normalBalance: "credit" },
  { code: "4100", name: "Service Revenue", accountType: "income", subtype: "service", normalBalance: "credit" },
  { code: "4200", name: "Rental Income", accountType: "income", subtype: "rental", normalBalance: "credit" },
  { code: "4900", name: "Other Income", accountType: "income", subtype: "other_income", normalBalance: "credit" },
  { code: "5000", name: "Salaries", accountType: "expense", subtype: "salaries", normalBalance: "debit" },
  { code: "5100", name: "Office Rent", accountType: "expense", subtype: "rent", normalBalance: "debit" },
  { code: "5200", name: "Utilities", accountType: "expense", subtype: "utilities", normalBalance: "debit" },
  { code: "5210", name: "Electricity", accountType: "expense", subtype: "utilities", normalBalance: "debit" },
  { code: "5220", name: "Water", accountType: "expense", subtype: "utilities", normalBalance: "debit" },
  { code: "5230", name: "Internet", accountType: "expense", subtype: "utilities", normalBalance: "debit" },
  { code: "5300", name: "Transportation", accountType: "expense", subtype: "transport", normalBalance: "debit" },
  { code: "5310", name: "Fuel", accountType: "expense", subtype: "transport", normalBalance: "debit" },
  { code: "5400", name: "Marketing", accountType: "expense", subtype: "marketing", normalBalance: "debit" },
  { code: "5410", name: "Maintenance", accountType: "expense", subtype: "operating", normalBalance: "debit" },
  { code: "5500", name: "Office Supplies", accountType: "expense", subtype: "operating", normalBalance: "debit" },
  { code: "5600", name: "Purchases", accountType: "expense", subtype: "purchases", normalBalance: "debit" },
  { code: "5610", name: "Cost of goods sold", accountType: "expense", subtype: "purchases", normalBalance: "debit" },
  { code: "1300", name: "Due from group companies", accountType: "asset", subtype: "due_from", normalBalance: "debit" },
  { code: "2400", name: "Due to group companies", accountType: "liability", subtype: "due_to", normalBalance: "credit" },
  { code: "2410", name: "Salaries payable", accountType: "liability", subtype: "payroll", normalBalance: "credit" },
  { code: "2420", name: "Statutory payroll", accountType: "liability", subtype: "statutory", normalBalance: "credit" },
  { code: "5700", name: "Government Fees", accountType: "expense", subtype: "operating", normalBalance: "debit" },
  { code: "5900", name: "Operating Expenses", accountType: "expense", subtype: "operating", normalBalance: "debit" },
];

export type VatSeed = {
  code: string;
  name: string;
  rate: string;
  treatment: VatTreatment;
};

export const defaultVatCodes: VatSeed[] = [
  {
    code: "STD",
    name: "Standard rated (Bahrain)",
    rate: "10.000",
    treatment: "standard",
  },
  {
    code: "ZERO",
    name: "Zero rated",
    rate: "0.000",
    treatment: "zero",
  },
  {
    code: "EXEMPT",
    name: "Exempt",
    rate: "0.000",
    treatment: "exempt",
  },
  { code: "OOS", name: "Out of scope", rate: "0.000", treatment: "out_of_scope" },
  { code: "RC", name: "Reverse charge", rate: "10.000", treatment: "reverse_charge" },
  { code: "IMP", name: "Import VAT", rate: "10.000", treatment: "import" },
  { code: "NR", name: "Non-recoverable", rate: "10.000", treatment: "non_recoverable" },
];

export const accountTypeLabels: Record<AccountType, string> = {
  asset: "Assets",
  liability: "Liabilities",
  equity: "Equity",
  income: "Income",
  expense: "Expenses",
};
