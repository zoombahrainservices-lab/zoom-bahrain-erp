export type AccountVisibility = "visible" | "other-company" | "inaccessible";

export function accountVisibleForCompany(
  accountCompanyId: string,
  filterCompanyId: string,
  allowedCompanyIds: string[],
): AccountVisibility {
  if (!allowedCompanyIds.includes(accountCompanyId)) return "inaccessible";
  if (filterCompanyId !== "all" && accountCompanyId !== filterCompanyId) return "other-company";
  return "visible";
}

export function bankKindLabel(kind: string) {
  if (kind === "cash") return "Cash";
  if (kind === "bank") return "Bank";
  if (!kind) return "Account";
  return kind.charAt(0).toUpperCase() + kind.slice(1).replaceAll("_", " ");
}

export function bankMovementLabel(sourceType: string, lineDescription: string) {
  const line = lineDescription.trim().toLowerCase();
  if (sourceType === "bank_movement") {
    if (line === "deposit") return "Deposit";
    if (line === "withdrawal") return "Withdrawal";
    if (line === "charge") return "Bank charge";
    if (line === "interest") return "Interest";
    return "Bank movement";
  }

  const known: Record<string, string> = {
    receipt: "Receipt",
    payment: "Payment",
    bank_transfer: "Transfer",
    invoice: "Sale",
    expense: "Expense",
    operation_cost: "Cost",
    opening: "Opening balance",
    reversal: "Reversal",
    supplier_bill: "Supplier bill",
    supplier_credit: "Supplier credit",
    customer_credit: "Customer credit",
    procurement: "Procurement",
    payroll: "Payroll",
    payroll_payment: "Payroll payment",
    intercompany: "Intercompany",
    inventory: "Inventory",
  };
  return known[sourceType] ?? sourceType.replaceAll("_", " ");
}

export function bankAccountHref(accountId: string | null, query: string) {
  const path = accountId ? `/accounting/banking/${accountId}` : "/accounting/banking";
  return query ? `${path}?${query}` : path;
}
