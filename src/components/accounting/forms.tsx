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

type CompanyOption = { id: string; name: string };
type AccountOption = { id: string; companyId: string; code: string; name: string; accountType: string };
type PartyOption = { id: string; name: string };
type BankOption = { id: string; companyId: string; name: string; kind: string };
type VatOption = { id: string; companyId: string; code: string; name: string };
type DocumentOption = { id: string; label: string; companyId: string };

const labelClass = "block text-sm font-medium text-foreground";

async function send(url: string, method: string, body?: unknown) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as { error?: string; id?: string };
  if (!response.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export function JournalForm({
  companies,
  accounts,
  canPost,
  journalId,
  initial,
}: {
  companies: CompanyOption[];
  accounts: AccountOption[];
  canPost: boolean;
  journalId?: string;
  initial?: {
    companyId: string;
    entryDate: string;
    description: string;
    lines: Array<{ accountId: string; description: string; debit: string; credit: string }>;
  };
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(initial?.companyId ?? companies[0]?.id ?? "");
  const [entryDate, setEntryDate] = useState(initial?.entryDate ?? today());
  const [description, setDescription] = useState(initial?.description ?? "");
  const [lines, setLines] = useState(
    initial?.lines?.length
      ? initial.lines
      : [
          { accountId: "", description: "", debit: "", credit: "" },
          { accountId: "", description: "", debit: "", credit: "" },
        ],
  );
  const [saving, setSaving] = useState(false);
  const choices = accounts.filter((account) => account.companyId === companyId);

  async function save(status: "draft" | "posted") {
    setSaving(true);
    try {
      const payload = {
        companyId,
        entryDate,
        description,
        status,
        lines: lines.filter((line) => line.accountId),
      };
      if (journalId) {
        await send(`/api/accounting/journals/${journalId}`, "PUT", payload);
        if (status === "posted") {
          await send(`/api/accounting/journals/${journalId}/post`, "POST");
        }
        toast.success(status === "posted" ? "Journal posted" : "Draft saved");
        router.refresh();
      } else {
        const data = await send("/api/accounting/journals", "POST", payload);
        toast.success(status === "posted" ? "Journal posted" : "Draft saved");
        if (data.id) router.push(`/accounting/journals/${data.id}`);
        else router.refresh();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the journal");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          Company
          <Select
            value={companyId}
            onChange={(event) => setCompanyId(event.target.value)}
            className="mt-1"
            disabled={Boolean(journalId)}
          >
            {companies.map((company) => (
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </label>
        <label className={labelClass}>
          Date
          <Input type="date" value={entryDate} onChange={(event) => setEntryDate(event.target.value)} className="mt-1" />
        </label>
        <label className={labelClass}>
          Description
          <Input value={description} onChange={(event) => setDescription(event.target.value)} className="mt-1" />
        </label>
      </div>
      <div className="space-y-2">
        {lines.map((line, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-[2fr_1.4fr_0.8fr_0.8fr]">
            <Select
              value={line.accountId}
              onChange={(event) => updateLine(setLines, index, { accountId: event.target.value })}
            >
              <option value="">Account</option>
              {choices.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.code} {account.name}
                </option>
              ))}
            </Select>
            <Input
              value={line.description}
              placeholder="Line detail"
              onChange={(event) => updateLine(setLines, index, { description: event.target.value })}
            />
            <Input
              value={line.debit}
              inputMode="decimal"
              placeholder="Debit"
              onChange={(event) => updateLine(setLines, index, { debit: event.target.value })}
            />
            <Input
              value={line.credit}
              inputMode="decimal"
              placeholder="Credit"
              onChange={(event) => updateLine(setLines, index, { credit: event.target.value })}
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          outline
          onClick={() =>
            setLines((current) => [
              ...current,
              { accountId: "", description: "", debit: "", credit: "" },
            ])
          }
        >
          Add line
        </Button>
        <Button type="button" outline disabled={saving} onClick={() => void save("draft")}>
          Save draft
        </Button>
        {canPost ? (
          <Button type="button" disabled={saving} onClick={() => void save("posted")}>
            Post journal
          </Button>
        ) : (
          <p className="self-center text-sm text-text-secondary">An admin posts journals.</p>
        )}
      </div>
    </div>
  );
}

export function JournalActions({
  journalId,
  status,
  reversed,
  canPost,
}: {
  journalId: string;
  status: string;
  reversed: boolean;
  canPost: boolean;
}) {
  const router = useRouter();
  const [date, setDate] = useState(today());
  const [working, setWorking] = useState(false);

  async function run(action: "post" | "reverse" | "delete") {
    setWorking(true);
    try {
      if (action === "delete") {
        await send(`/api/accounting/journals/${journalId}`, "DELETE");
        toast.success("Draft deleted");
        router.push("/accounting/journals");
        return;
      }
      await send(`/api/accounting/journals/${journalId}/${action}`, "POST", { entryDate: date });
      toast.success(action === "post" ? "Journal posted" : "Reversal posted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the journal");
    } finally {
      setWorking(false);
    }
  }

  if (status === "draft") {
    return (
      <div className="flex flex-wrap gap-2">
        {canPost ? (
          <Button type="button" disabled={working} onClick={() => void run("post")}>
            Post
          </Button>
        ) : null}
        <Button type="button" outline disabled={working} onClick={() => void run("delete")}>
          Delete draft
        </Button>
      </div>
    );
  }

  if (!canPost || reversed) return null;

  return (
    <div className="flex flex-wrap items-end gap-2">
      <label className={labelClass}>
        Reversal date
        <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="mt-1" />
      </label>
      <Button type="button" outline disabled={working} onClick={() => void run("reverse")}>
        Reverse
      </Button>
    </div>
  );
}

export function PaymentForm({
  companies,
  documents,
  parties,
  banks,
  direction,
}: {
  companies: CompanyOption[];
  documents: DocumentOption[];
  parties: PartyOption[];
  banks: BankOption[];
  direction: "receipt" | "payment";
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [documentId, setDocumentId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [partyOptions, setPartyOptions] = useState(parties);
  const [companyDraft, setCompanyDraft] = useState<CompanyDraft>(
    emptyCompanyDraft(direction === "receipt" ? "client" : "supplier"),
  );
  const [amount, setAmount] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [method, setMethod] = useState("bank");
  const [bankAccountId, setBankAccountId] = useState("");
  const [reference, setReference] = useState("");
  const [saving, setSaving] = useState(false);
  const idempotencyKey = useRef(crypto.randomUUID());
  const companyBanks = banks.filter((bank) => bank.companyId === companyId);
  const companyDocuments = documents.filter((document) => document.companyId === companyId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      let partyId = organizationId;
      if (!documentId && partyId === NEW_PARTY) {
        const created = await registerCompany(companyDraft);
        partyId = created.id;
        setPartyOptions((current) => [{ id: created.id, name: created.name }, ...current]);
        setOrganizationId(created.id);
        setCompanyDraft(emptyCompanyDraft(direction === "receipt" ? "client" : "supplier"));
      }
      await send("/api/accounting/payments", "POST", {
        companyId,
        direction,
        operationEntryId: documentId || null,
        organizationId: documentId ? null : partyId,
        amount,
        paidOn,
        method,
        bankAccountId: bankAccountId || null,
        reference,
        idempotencyKey: idempotencyKey.current,
      });
      idempotencyKey.current = crypto.randomUUID();
      toast.success(direction === "receipt" ? "Receipt posted" : "Payment posted");
      setAmount("");
      setReference("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the payment");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>
        Company
        <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-1">
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        {direction === "receipt" ? "Invoice" : "Purchase bill"}
        <Select value={documentId} onChange={(event) => setDocumentId(event.target.value)} className="mt-1">
          <option value="">On account</option>
          {companyDocuments.map((document) => (
            <option key={document.id} value={document.id}>
              {document.label}
            </option>
          ))}
        </Select>
      </label>
      {documentId ? null : (
        <label className={labelClass}>
          {direction === "receipt" ? "Customer" : "Supplier"}
          <Select
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            className="mt-1"
          >
            <option value="">Choose</option>
            <option value={NEW_PARTY}>{direction === "receipt" ? "New customer…" : "New supplier…"}</option>
            {partyOptions.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </Select>
        </label>
      )}
      {!documentId && organizationId === NEW_PARTY ? (
        <div className="sm:col-span-2">
          <CompanyFields value={companyDraft} onChange={setCompanyDraft} />
        </div>
      ) : null}
      <label className={labelClass}>
        Amount (BHD)
        <Input value={amount} inputMode="decimal" onChange={(event) => setAmount(event.target.value)} className="mt-1" required />
      </label>
      <label className={labelClass}>
        Date
        <Input type="date" value={paidOn} onChange={(event) => setPaidOn(event.target.value)} className="mt-1" />
      </label>
      <label className={labelClass}>
        Method
        <Select value={method} onChange={(event) => setMethod(event.target.value)} className="mt-1">
          <option value="bank">Bank</option>
          <option value="cash">Cash</option>
        </Select>
      </label>
      <label className={labelClass}>
        Account
        <Select value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="mt-1">
          <option value="">Default {method === "cash" ? "cash" : "bank"}</option>
          {companyBanks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        Reference
        <Input value={reference} onChange={(event) => setReference(event.target.value)} className="mt-1" />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          {direction === "receipt" ? "Receive payment" : "Pay supplier"}
        </Button>
      </div>
    </form>
  );
}

export function ExpenseForm({
  companies,
  accounts,
  parties,
  banks,
  vatCodes,
  operations,
  costNotes = [],
}: {
  companies: CompanyOption[];
  accounts: AccountOption[];
  parties: PartyOption[];
  banks: BankOption[];
  vatCodes: VatOption[];
  operations: Array<{ id: string; companyId: string; label: string }>;
  costNotes?: Array<{ id: string; operationId: string; companyId: string; label: string }>;
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [organizationId, setOrganizationId] = useState("");
  const [partyOptions, setPartyOptions] = useState(parties);
  const [companyDraft, setCompanyDraft] = useState<CompanyDraft>(emptyCompanyDraft("supplier"));
  const [saving, setSaving] = useState(false);
  const expenses = accounts.filter(
    (account) => account.companyId === companyId && account.accountType === "expense",
  );

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      let supplierId: string | null = organizationId || null;
      if (organizationId === NEW_PARTY) {
        const created = await registerCompany(companyDraft);
        supplierId = created.id;
        setPartyOptions((current) => [{ id: created.id, name: created.name }, ...current]);
        setOrganizationId("");
        setCompanyDraft(emptyCompanyDraft("supplier"));
      }
      await send("/api/accounting/phase2", "POST", {
        action: "saveExpense",
        companyId,
        expenseDate: String(form.get("entryDate") ?? ""),
        amount: String(form.get("amount") ?? ""),
        accountId: String(form.get("expenseAccountId") ?? ""),
        method: String(form.get("method") ?? "bank"),
        bankAccountId: String(form.get("bankAccountId") ?? "") || null,
        vatCodeId: String(form.get("vatCodeId") ?? "") || null,
        organizationId: supplierId,
        operationId: String(form.get("operationId") ?? "") || null,
        operationEntryId: String(form.get("operationEntryId") ?? "") || null,
        description: String(form.get("description") ?? ""),
        reference: String(form.get("reference") ?? ""),
        currency: String(form.get("currency") ?? "BHD") || "BHD",
        exchangeRate: String(form.get("exchangeRate") ?? "1") || "1",
      });
      toast.success("Expense saved as a draft");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the expense");
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
              <option key={company.id} value={company.id}>
                {company.name}
              </option>
            ))}
          </Select>
        </label>
        <label className={labelClass}>
          Date
          <Input type="date" name="entryDate" defaultValue={today()} className="mt-1" />
        </label>
        <label className={labelClass}>
          Category
          <Select name="expenseAccountId" className="mt-1" required>
            <option value="">Choose</option>
            {expenses.map((account) => (
              <option key={account.id} value={account.id}>
                {account.code} {account.name}
              </option>
            ))}
          </Select>
        </label>
        <label className={labelClass}>
          Amount including VAT
          <Input name="amount" inputMode="decimal" required className="mt-1" />
        </label>
        <label className={labelClass}>
          VAT
          <Select name="vatCodeId" className="mt-1">
            <option value="">No VAT</option>
            {vatCodes
              .filter((code) => code.companyId === companyId)
              .map((code) => (
                <option key={code.id} value={code.id}>
                  {code.code} {code.name}
                </option>
              ))}
          </Select>
        </label>
        <label className={labelClass}>
          Paid from
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
            {banks
              .filter((bank) => bank.companyId === companyId)
              .map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.name}
                </option>
              ))}
          </Select>
        </label>
        <label className={labelClass}>
          Reference
          <Input name="reference" className="mt-1" />
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
          Supplier
          <Select
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            className="mt-1"
          >
            <option value="">None</option>
            <option value={NEW_PARTY}>New supplier…</option>
            {partyOptions.map((party) => (
              <option key={party.id} value={party.id}>
                {party.name}
              </option>
            ))}
          </Select>
        </label>
        {organizationId === NEW_PARTY ? (
          <div className="sm:col-span-2 lg:col-span-4">
            <CompanyFields value={companyDraft} onChange={setCompanyDraft} />
          </div>
        ) : null}
        <label className={labelClass}>
          Cost note
          <Select name="operationEntryId" className="mt-1">
            <option value="">None — this is a separate cost</option>
            {costNotes
              .filter((note) => note.companyId === companyId)
              .map((note) => (
                <option key={note.id} value={note.id}>
                  {note.label}
                </option>
              ))}
          </Select>
        </label>
        <label className={labelClass}>
          Operation
          <Select name="operationId" className="mt-1">
            <option value="">None</option>
            {operations
              .filter((operation) => operation.companyId === companyId)
              .map((operation) => (
                <option key={operation.id} value={operation.id}>
                  {operation.label}
                </option>
              ))}
          </Select>
        </label>
        <label className={`${labelClass} sm:col-span-2 lg:col-span-4`}>
          Description
          <Input name="description" required className="mt-1" />
        </label>
      </div>
      <Button type="submit" disabled={saving}>
        Save draft expense
      </Button>
    </form>
  );
}

export function TransferForm({
  companies,
  banks,
}: {
  companies: CompanyOption[];
  banks: BankOption[];
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const companyBanks = banks.filter((bank) => bank.companyId === companyId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await send("/api/accounting/transfers", "POST", {
        companyId,
        entryDate: String(form.get("entryDate") ?? ""),
        amount: String(form.get("amount") ?? ""),
        fromBankAccountId: String(form.get("fromBankAccountId") ?? ""),
        toBankAccountId: String(form.get("toBankAccountId") ?? ""),
        description: String(form.get("description") ?? ""),
      });
      toast.success("Transfer posted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the transfer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>
        Company
        <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-1">
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        Date
        <Input type="date" name="entryDate" defaultValue={today()} className="mt-1" />
      </label>
      <label className={labelClass}>
        From
        <Select name="fromBankAccountId" className="mt-1" required>
          <option value="">Choose</option>
          {companyBanks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        To
        <Select name="toBankAccountId" className="mt-1" required>
          <option value="">Choose</option>
          {companyBanks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        Amount (BHD)
        <Input name="amount" inputMode="decimal" required className="mt-1" />
      </label>
      <label className={labelClass}>
        Description
        <Input name="description" className="mt-1" />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          Post transfer
        </Button>
      </div>
    </form>
  );
}

export function AccountForm({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await send("/api/accounting/accounts", "POST", {
        companyId: String(form.get("companyId") ?? ""),
        code: String(form.get("code") ?? ""),
        name: String(form.get("name") ?? ""),
        accountType: String(form.get("accountType") ?? "expense"),
        normalBalance: String(form.get("normalBalance") ?? "debit"),
      });
      toast.success("Account added");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>
        Company
        <Select name="companyId" className="mt-1">
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        Code
        <Input name="code" required className="mt-1" />
      </label>
      <label className={labelClass}>
        Name
        <Input name="name" required className="mt-1" />
      </label>
      <label className={labelClass}>
        Category
        <Select name="accountType" defaultValue="expense" className="mt-1">
          <option value="asset">Asset</option>
          <option value="liability">Liability</option>
          <option value="equity">Equity</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </Select>
      </label>
      <label className={labelClass}>
        Normal balance
        <Select name="normalBalance" defaultValue="debit" className="mt-1">
          <option value="debit">Debit</option>
          <option value="credit">Credit</option>
        </Select>
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          Add account
        </Button>
      </div>
    </form>
  );
}

export function OpeningForm({
  companies,
  accounts,
}: {
  companies: CompanyOption[];
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const choices = accounts.filter((account) => account.companyId === companyId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await send("/api/accounting/opening", "POST", {
        companyId,
        accountId: String(form.get("accountId") ?? ""),
        entryDate: String(form.get("entryDate") ?? ""),
        debit: String(form.get("debit") ?? ""),
        credit: String(form.get("credit") ?? ""),
      });
      toast.success("Opening balance posted");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the opening balance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>
        Company
        <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)} className="mt-1">
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        Account
        <Select name="accountId" className="mt-1" required>
          <option value="">Choose</option>
          {choices.map((account) => (
            <option key={account.id} value={account.id}>
              {account.code} {account.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        Date
        <Input type="date" name="entryDate" defaultValue={today()} className="mt-1" />
      </label>
      <label className={labelClass}>
        Debit
        <Input name="debit" inputMode="decimal" className="mt-1" />
      </label>
      <label className={labelClass}>
        Credit
        <Input name="credit" inputMode="decimal" className="mt-1" />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          Post opening balance
        </Button>
      </div>
    </form>
  );
}

export function BankForm({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await send("/api/accounting/banks", "POST", {
        companyId: String(form.get("companyId") ?? ""),
        name: String(form.get("name") ?? ""),
        institution: String(form.get("institution") ?? ""),
        accountNumber: String(form.get("accountNumber") ?? ""),
      });
      toast.success("Bank account added");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the bank account");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>
        Company
        <Select name="companyId" className="mt-1">
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        Name
        <Input name="name" required className="mt-1" />
      </label>
      <label className={labelClass}>
        Bank
        <Input name="institution" className="mt-1" />
      </label>
      <label className={labelClass}>
        Account number
        <Input name="accountNumber" className="mt-1" />
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          Add bank account
        </Button>
      </div>
    </form>
  );
}

export function VatCodeForm({ companies }: { companies: CompanyOption[] }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    try {
      await send("/api/accounting/vat-codes", "POST", {
        companyId: String(form.get("companyId") ?? ""),
        code: String(form.get("code") ?? ""),
        name: String(form.get("name") ?? ""),
        rate: String(form.get("rate") ?? "0"),
        treatment: String(form.get("treatment") ?? "exempt"),
      });
      toast.success("VAT code added");
      event.currentTarget.reset();
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add the VAT code");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(event) => void submit(event)} className="grid gap-3 sm:grid-cols-2">
      <label className={labelClass}>
        Company
        <Select name="companyId" className="mt-1">
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </label>
      <label className={labelClass}>
        Code
        <Input name="code" required className="mt-1" />
      </label>
      <label className={labelClass}>
        Name
        <Input name="name" required className="mt-1" />
      </label>
      <label className={labelClass}>
        Rate %
        <Input name="rate" defaultValue="0.000" inputMode="decimal" className="mt-1" />
      </label>
      <label className={labelClass}>
        Treatment
        <Select name="treatment" defaultValue="exempt" className="mt-1">
          <option value="standard">Standard</option>
          <option value="zero">Zero rated</option>
          <option value="exempt">Exempt</option>
          <option value="out_of_scope">Out of scope</option>
          <option value="reverse_charge">Reverse charge</option>
          <option value="import">Import VAT</option>
          <option value="non_recoverable">Non-recoverable</option>
        </Select>
      </label>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={saving}>
          Add VAT code
        </Button>
      </div>
    </form>
  );
}

export function PeriodButton({
  periodId,
  status,
}: {
  periodId: string;
  status: string;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const next = status === "open" ? "closed" : "open";

  return (
    <Button
      type="button"
      outline
      disabled={working}
      onClick={() => {
        setWorking(true);
        void send(`/api/accounting/periods/${periodId}`, "POST", { status: next })
          .then(() => {
            toast.success(next === "closed" ? "Period closed" : "Period reopened");
            router.refresh();
          })
          .catch((error: unknown) => {
            toast.error(error instanceof Error ? error.message : "Could not update the period");
          })
          .finally(() => setWorking(false));
      }}
    >
      {next === "closed" ? "Close" : "Reopen"}
    </Button>
  );
}

export function PrintButton() {
  return (
    <Button type="button" outline onClick={() => window.print()}>
      Print / Save PDF
    </Button>
  );
}

function updateLine(
  setLines: React.Dispatch<
    React.SetStateAction<Array<{ accountId: string; description: string; debit: string; credit: string }>>
  >,
  index: number,
  patch: Partial<{ accountId: string; description: string; debit: string; credit: string }>,
) {
  setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
}

function today() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}
