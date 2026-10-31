"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/catalyst/button";
import {
  CompanyFields,
  emptyCompanyDraft,
  NEW_PARTY,
  registerCompany,
  type CompanyDraft,
} from "@/components/register-party-panel";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";

const labelClass = "block text-sm font-medium text-foreground";

type Company = { id: string; name: string };
type Account = { id: string; companyId: string; code: string; name: string; accountType: string };
type Party = { id: string; name: string };
type Bank = { id: string; companyId: string; name: string };
type Vat = { id: string; companyId: string; code: string; name: string };
type Operation = { id: string; companyId: string; label: string };

async function postAction(body: Record<string, unknown>) {
  const response = await fetch("/api/accounting/phase2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; id?: string; note?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function PhaseAction({
  action,
  id,
  label,
  extra,
}: {
  action: string;
  id: string;
  label: string;
  extra?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  return (
    <Button
      type="button"
      disabled={working}
      onClick={() => {
        setWorking(true);
        postAction({ action, id, ...extra })
          .then((data) => {
            toast.success(data.note || label);
            router.refresh();
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : "Request failed");
          })
          .finally(() => setWorking(false));
      }}
    >
      {label}
    </Button>
  );
}

export function BillForm({
  companies,
  accounts,
  parties,
  vatCodes,
  operations,
}: {
  companies: Company[];
  accounts: Account[];
  parties: Party[];
  vatCodes: Vat[];
  operations: Operation[];
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [supplierId, setSupplierId] = useState("");
  const [partyOptions, setPartyOptions] = useState(parties);
  const [companyDraft, setCompanyDraft] = useState<CompanyDraft>(emptyCompanyDraft("supplier"));
  const [lines, setLines] = useState(1);
  const [saving, setSaving] = useState(false);
  const expenses = accounts.filter(
    (account) => account.companyId === companyId && account.accountType === "expense",
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = [];
    for (let index = 0; index < lines; index += 1) {
      const quantity = String(form.get(`quantity-${index}`) ?? "");
      if (!quantity) continue;
      payload.push({
        description: String(form.get(`description-${index}`) ?? ""),
        quantity,
        unitAmount: String(form.get(`unit-${index}`) ?? ""),
        discount: String(form.get(`discount-${index}`) ?? "0"),
        expenseAccountId: String(form.get(`account-${index}`) ?? ""),
        vatCodeId: String(form.get(`vat-${index}`) ?? "") || null,
      });
    }
    setSaving(true);
    try {
      let supplierOrganizationId = supplierId;
      if (supplierId === NEW_PARTY) {
        const created = await registerCompany(companyDraft);
        supplierOrganizationId = created.id;
        setPartyOptions((current) => [{ id: created.id, name: created.name }, ...current]);
        setSupplierId(created.id);
        setCompanyDraft(emptyCompanyDraft("supplier"));
      }
      await postAction({
        action: "saveBill",
        companyId,
        supplierOrganizationId,
        billDate: String(form.get("billDate") ?? ""),
        dueDate: String(form.get("dueDate") ?? ""),
        currency: String(form.get("currency") ?? "BHD"),
        exchangeRate: String(form.get("exchangeRate") ?? "1"),
        reference: String(form.get("reference") ?? ""),
        notes: String(form.get("notes") ?? ""),
        operationId: String(form.get("operationId") ?? "") || null,
        procurementEntryId: String(form.get("procurementEntryId") ?? "") || null,
        lines: payload,
      });
      toast.success("Bill saved as a draft");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the bill");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className={labelClass}>
          Company
          <Select name="company" value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-1">
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </Select>
        </label>
        <label className={labelClass}>
          Supplier
          <Select
            value={supplierId}
            onChange={(event) => setSupplierId(event.target.value)}
            className="mt-1"
            required
          >
            <option value="">Choose</option>
            <option value={NEW_PARTY}>New supplier…</option>
            {partyOptions.map((party) => (
              <option key={party.id} value={party.id}>{party.name}</option>
            ))}
          </Select>
        </label>
        {supplierId === NEW_PARTY ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <CompanyFields value={companyDraft} onChange={setCompanyDraft} />
          </div>
        ) : null}
        <label className={labelClass}>
          Bill date
          <Input type="date" name="billDate" required className="mt-1" />
        </label>
        <label className={labelClass}>
          Due date
          <Input type="date" name="dueDate" required className="mt-1" />
        </label>
        <label className={labelClass}>
          Currency
          <Input name="currency" defaultValue="BHD" className="mt-1" />
        </label>
        <label className={labelClass}>
          Rate to BHD
          <Input name="exchangeRate" defaultValue="1.000" className="mt-1" />
        </label>
        <label className={labelClass}>
          Supplier reference
          <Input name="reference" className="mt-1" />
        </label>
        <label className={labelClass}>
          Operation
          <Select name="operationId" className="mt-1">
            <option value="">None</option>
            {operations.filter((operation) => operation.companyId === companyId).map((operation) => (
              <option key={operation.id} value={operation.id}>{operation.label}</option>
            ))}
          </Select>
        </label>
      </div>
      <label className={labelClass}>
        Procurement link
        <Input name="procurementEntryId" placeholder="Procurement id on this company, or leave blank for a standalone bill" className="mt-1" />
        <span className="mt-1 block text-sm text-text-secondary">
          Saving stores the supplier invoice. One non-reversed bill can name a procurement. If that receipt already posted the payable, and the supplier, company, currency, and amount match, posting records the invoice against that payable. A difference is shown and nothing is changed.
        </span>
      </label>
      <div className="space-y-3 rounded-lg bg-surface-elevated p-3 ring-1 ring-border">
        <p className="text-sm font-medium text-heading">Lines</p>
        {Array.from({ length: lines }, (_, index) => (
          <div key={index} className="grid gap-3 lg:grid-cols-12">
            <label className={`${labelClass} lg:col-span-3`}>
              Description
              <Input name={`description-${index}`} className="mt-1" />
            </label>
            <label className={`${labelClass} lg:col-span-1`}>
              Qty
              <Input name={`quantity-${index}`} inputMode="decimal" className="mt-1" />
            </label>
            <label className={`${labelClass} lg:col-span-2`}>
              Unit price
              <Input name={`unit-${index}`} inputMode="decimal" className="mt-1" />
            </label>
            <label className={`${labelClass} lg:col-span-1`}>
              Discount
              <Input name={`discount-${index}`} inputMode="decimal" defaultValue="0" className="mt-1" />
            </label>
            <label className={`${labelClass} lg:col-span-2`}>
              VAT
              <Select name={`vat-${index}`} className="mt-1">
                <option value="">None</option>
                {vatCodes.filter((code) => code.companyId === companyId).map((code) => (
                  <option key={code.id} value={code.id}>{code.code}</option>
                ))}
              </Select>
            </label>
            <label className={`${labelClass} lg:col-span-3`}>
              Expense account
              <Select name={`account-${index}`} className="mt-1">
                <option value="">Choose</option>
                {expenses.map((account) => (
                  <option key={account.id} value={account.id}>{account.code} {account.name}</option>
                ))}
              </Select>
            </label>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Button type="button" outline onClick={() => setLines((count) => count + 1)}>Add line</Button>
        <Button type="submit" disabled={saving}>Save draft bill</Button>
      </div>
    </form>
  );
}

export function PayBillForm({ billId, banks }: { billId: string; banks: Bank[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setSaving(true);
        postAction({
          action: "payBill",
          billId,
          amount: String(form.get("amount") ?? ""),
          paidOn: String(form.get("paidOn") ?? ""),
          method: String(form.get("method") ?? "bank"),
          bankAccountId: String(form.get("bankAccountId") ?? "") || null,
          reference: String(form.get("reference") ?? ""),
          idempotencyKey: idempotencyKey.current,
        })
          .then(() => {
            idempotencyKey.current = crypto.randomUUID();
            toast.success("Payment posted");
            router.refresh();
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not pay"))
          .finally(() => setSaving(false));
      }}
    >
      <label className={labelClass}>Amount<Input name="amount" required className="mt-1" /></label>
      <label className={labelClass}>Date<Input type="date" name="paidOn" required className="mt-1" /></label>
      <label className={labelClass}>
        Method
        <Select name="method" defaultValue="bank" className="mt-1">
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
          <option value="card">Card</option>
        </Select>
      </label>
      <label className={labelClass}>
        Account
        <Select name="bankAccountId" className="mt-1">
          <option value="">Default</option>
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>{bank.name}</option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>Reference<Input name="reference" className="mt-1" /></label>
      <div className="sm:col-span-2"><Button type="submit" disabled={saving}>Pay outstanding</Button></div>
    </form>
  );
}

export function StatementImportForm({ companyId, banks }: { companyId: string; banks: Bank[] }) {
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const file = form.get("file");
        if (!(file instanceof File)) return;
        const bank = banks.find((item) => item.id === String(form.get("bankAccountId") ?? ""));
        const payload = {
          action: "importStatement",
          companyId: bank?.companyId ?? companyId,
          bankAccountId: String(form.get("bankAccountId") ?? ""),
          statementDate: String(form.get("statementDate") ?? ""),
          fileName: file.name,
          csv: "",
          workbookBase64: "",
        };
        const sendFile = file.name.toLowerCase().endsWith(".xlsx")
          ? file.arrayBuffer().then((buffer) => {
              let binary = "";
              const bytes = new Uint8Array(buffer);
              for (const byte of bytes) binary += String.fromCharCode(byte);
              payload.workbookBase64 = btoa(binary);
              return postAction(payload);
            })
          : file.text().then((csv) => postAction({ ...payload, csv }));
        sendFile.then(() => {
          toast.success("Statement imported");
          router.refresh();
        }).catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Import failed"));
      }}
    >
      <p className="text-sm text-text-secondary">
        CSV or the first sheet of an XLSX workbook. The first row must contain date, and either amount or debit and credit. Dates may be YYYY-MM-DD, DD/MM/YYYY, or an Excel date. Importing does not post a journal.
      </p>
      <Select name="bankAccountId" required>
        {banks.filter((bank) => bank.companyId === companyId || companyId === "all").map((bank) => (
          <option key={bank.id} value={bank.id}>{bank.name}</option>
        ))}
      </Select>
      <Input type="date" name="statementDate" required />
      <Input type="file" name="file" accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" required />
      <Button type="submit">Import statement</Button>
    </form>
  );
}

export function ReconciliationForm({ companyId, banks }: { companyId: string; banks: Bank[] }) {
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const bank = banks.find((item) => item.id === String(form.get("bankAccountId") ?? ""));
        postAction({
          action: "openReconciliation",
          companyId: bank?.companyId ?? companyId,
          bankAccountId: String(form.get("bankAccountId") ?? ""),
          periodStart: String(form.get("periodStart") ?? ""),
          periodEnd: String(form.get("periodEnd") ?? ""),
          statementBalance: String(form.get("statementBalance") ?? ""),
        })
          .then(() => {
            toast.success("Reconciliation opened");
            router.refresh();
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not open"));
      }}
    >
      <Select name="bankAccountId" required>
        {banks.map((bank) => (
          <option key={bank.id} value={bank.id}>{bank.name}</option>
        ))}
      </Select>
      <input type="hidden" name="companyId" value={companyId === "all" ? banks[0]?.companyId ?? "" : companyId} />
      <Input type="date" name="periodStart" required />
      <Input type="date" name="periodEnd" required />
      <Input name="statementBalance" placeholder="Statement balance" required />
      <Button type="submit">Start reconciliation</Button>
    </form>
  );
}

export function MatchForm({
  reconciliationId,
  statementLines,
  journalLines,
}: {
  reconciliationId: string;
  statementLines: Array<{ id: string; label: string }>;
  journalLines: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        postAction({
          action: "matchReconciliation",
          reconciliationId,
          statementLineIds: form.getAll("statement").map(String),
          journalLineIds: form.getAll("journal").map(String),
        })
          .then(() => {
            toast.success("Lines matched");
            router.refresh();
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not match"));
      }}
    >
      <p className="text-sm text-text-secondary">Select one or more statement lines and one or more ledger lines. The signed totals must be equal.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          {statementLines.map((line) => (
            <label key={line.id} className="block text-sm text-foreground">
              <input type="checkbox" name="statement" value={line.id} className="mr-2" />
              {line.label}
            </label>
          ))}
        </div>
        <div>
          {journalLines.map((line) => (
            <label key={line.id} className="block text-sm text-foreground">
              <input type="checkbox" name="journal" value={line.id} className="mr-2" />
              {line.label}
            </label>
          ))}
        </div>
      </div>
      <Button type="submit">Match selected</Button>
    </form>
  );
}

export function BankMovementForm({
  companyId,
  banks,
  accounts,
}: {
  companyId: string;
  banks: Bank[];
  accounts: Account[];
}) {
  const router = useRouter();
  return (
    <form
      className="grid gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        postAction({
          action: "bankMovement",
          companyId,
          bankAccountId: String(form.get("bankAccountId") ?? ""),
          offsetAccountId: String(form.get("offsetAccountId") ?? ""),
          entryDate: String(form.get("entryDate") ?? ""),
          amount: String(form.get("amount") ?? ""),
          kind: String(form.get("kind") ?? "charge"),
          description: String(form.get("description") ?? ""),
          settlementPaymentId: String(form.get("settlementPaymentId") ?? "") || null,
        })
          .then(() => {
            toast.success("Bank movement posted");
            router.refresh();
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not post"));
      }}
    >
      <Select name="kind" defaultValue="charge">
        <option value="deposit">Deposit</option>
        <option value="withdrawal">Withdrawal</option>
        <option value="charge">Bank charge</option>
        <option value="interest">Interest</option>
      </Select>
      <Select name="bankAccountId">
        {banks.map((bank) => (
          <option key={bank.id} value={bank.id}>{bank.name}</option>
        ))}
      </Select>
      <Select name="offsetAccountId">
        {accounts.filter((account) => account.companyId === companyId).map((account) => (
          <option key={account.id} value={account.id}>{account.code} {account.name}</option>
        ))}
      </Select>
      <Input type="date" name="entryDate" required />
      <Input name="amount" required />
      <Input name="description" placeholder="Description" />
      <Input name="settlementPaymentId" placeholder="Existing payment id, only if this is that settlement" />
      <Button type="submit">Post movement</Button>
    </form>
  );
}

export function VatSettingsForm({
  companyId,
  initial,
}: {
  companyId: string;
  initial: {
    legalName: string;
    address: string;
    phone: string;
    email: string;
    crNumber: string;
    vatRegistered: boolean;
    vatNumber: string;
    vatEffectiveFrom: string;
    filingFrequency: string;
  };
}) {
  const router = useRouter();
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        postAction({
          action: "saveSettings",
          companyId,
          legalName: String(form.get("legalName") ?? ""),
          address: String(form.get("address") ?? ""),
          phone: String(form.get("phone") ?? ""),
          email: String(form.get("email") ?? ""),
          crNumber: String(form.get("crNumber") ?? ""),
          vatRegistered: form.get("vatRegistered") === "on",
          vatNumber: String(form.get("vatNumber") ?? ""),
          vatEffectiveFrom: String(form.get("vatEffectiveFrom") ?? ""),
          filingFrequency: String(form.get("filingFrequency") ?? "quarterly"),
        })
          .then(() => {
            toast.success("Company VAT settings saved");
            router.refresh();
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not save"));
      }}
    >
      <label className={labelClass}>Legal name<Input name="legalName" defaultValue={initial.legalName} className="mt-1" /></label>
      <label className={labelClass}>Address<Input name="address" defaultValue={initial.address} className="mt-1" /></label>
      <label className={labelClass}>Phone<Input name="phone" defaultValue={initial.phone} className="mt-1" /></label>
      <label className={labelClass}>Email<Input name="email" defaultValue={initial.email} className="mt-1" /></label>
      <label className={labelClass}>CR number<Input name="crNumber" defaultValue={initial.crNumber} className="mt-1" /></label>
      <label className={labelClass}>VAT account number<Input name="vatNumber" defaultValue={initial.vatNumber} className="mt-1" /></label>
      <label className={labelClass}>Effective from<Input type="date" name="vatEffectiveFrom" defaultValue={initial.vatEffectiveFrom} className="mt-1" /></label>
      <label className={labelClass}>
        Filing frequency
        <Select name="filingFrequency" defaultValue={initial.filingFrequency} className="mt-1">
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="none">Not registered</option>
        </Select>
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground sm:col-span-2">
        <input type="checkbox" name="vatRegistered" defaultChecked={initial.vatRegistered} />
        This company is VAT registered
      </label>
      <div className="sm:col-span-2"><Button type="submit">Save settings</Button></div>
    </form>
  );
}

export function VatPrepareForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  return (
    <form
      className="grid gap-3 sm:grid-cols-3"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        postAction({
          action: "prepareVat",
          companyId,
          periodStart: String(form.get("periodStart") ?? ""),
          periodEnd: String(form.get("periodEnd") ?? ""),
        })
          .then(() => {
            toast.success("VAT return prepared from the ledger");
            router.refresh();
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not prepare"));
      }}
    >
      <Input type="date" name="periodStart" required />
      <Input type="date" name="periodEnd" required />
      <Button type="submit">Prepare return</Button>
    </form>
  );
}

export function FilingForm({ id }: { id: string }) {
  const router = useRouter();
  return (
    <form
      className="mt-2 flex flex-wrap gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        postAction({
          action: "fileVat",
          id,
          paymentStatus: String(form.get("paymentStatus") ?? "unpaid"),
        })
          .then((result) => {
            const filed = result as { reference?: string };
            toast.success(filed.reference ? `Filed ${filed.reference}` : "VAT return filed");
            router.refresh();
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not file"));
      }}
    >
      <Select name="paymentStatus" defaultValue="unpaid">
        <option value="unpaid">VAT still unpaid</option>
        <option value="paid">VAT paid</option>
        <option value="refund">Refund due</option>
      </Select>
      <Button type="submit">File with NBR</Button>
    </form>
  );
}

export function ExchangeRateForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  return (
    <form
      className="grid gap-3 sm:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        postAction({
          action: "saveRate",
          companyId,
          currency: String(form.get("currency") ?? ""),
          rateToBhd: String(form.get("rateToBhd") ?? ""),
          effectiveOn: String(form.get("effectiveOn") ?? ""),
        })
          .then(() => {
            toast.success("Exchange rate saved");
            router.refresh();
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Could not save the rate"));
      }}
    >
      <Input name="currency" placeholder="USD" required />
      <Input name="rateToBhd" placeholder="Rate to BHD" required />
      <Input type="date" name="effectiveOn" required />
      <Button type="submit">Save rate</Button>
    </form>
  );
}

export function AttachmentForm({
  companyId,
  entityType,
  entityId,
}: {
  companyId: string;
  entityType: "bill" | "expense";
  entityId: string;
}) {
  const router = useRouter();
  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        form.set("companyId", companyId);
        form.set("entityType", entityType);
        form.set("entityId", entityId);
        fetch("/api/accounting/attachments", { method: "POST", body: form })
          .then(async (response) => {
            const data = (await response.json().catch(() => ({}))) as { error?: string };
            if (!response.ok) throw new Error(data.error ?? "Upload failed");
            toast.success("File attached");
            router.refresh();
          })
          .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Upload failed"));
      }}
    >
      <Input type="file" name="file" accept="application/pdf,image/png,image/jpeg,image/webp" required />
      <Button type="submit">Attach</Button>
    </form>
  );
}
