"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon, PlusIcon, TrashIcon } from "@heroicons/react/20/solid";
import { toast } from "sonner";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Heading } from "@/components/catalyst/heading";
import { ProcurementVendorPicker } from "@/components/procurement-vendor-picker";
import {
  documentLinesTotal,
  lineTotal,
} from "@/lib/operation-document-lines";
import {
  areDocumentNumbersLocked,
  commercialDocumentPath,
  getDocumentKindTitle,
  getDocumentStageLabel,
  googleDocOnEntry,
  resolveDocumentStage,
} from "@/lib/operation-documents";
import type {
  OperationDocumentStage,
  OperationEntryRecord,
  OperationRecord,
} from "@/lib/operation-fields";
import type { BillToDetails } from "@/lib/commercial-print-data";
import { divisions } from "@/lib/divisions";
import { filsToAmount } from "@/lib/accounting/money";
import { priceSalesLine } from "@/lib/accounting/phase3-rules";
import { formatBhd, parseDecimal, todayInputDate } from "@/lib/utils";

type EditorLine = {
  key: string;
  description: string;
  quantity: string;
  unitAmount: string;
  discount: string;
  vatCodeId: string;
};

type VatChoice = {
  id: string;
  code: string;
  name: string;
  rate: string;
  treatment: "standard" | "zero" | "exempt" | "out_of_scope" | "reverse_charge" | "import" | "non_recoverable";
};

const salesVatTreatments = new Set(["standard", "zero", "exempt", "out_of_scope"]);

type CommercialDocumentEditorProps = {
  operation: OperationRecord;
  partyName: string;
  divisionName: string;
  entry: OperationEntryRecord;
  driveConnected: boolean;
  vatCodes?: VatChoice[];
  billTo: BillToDetails;
};

function toEditorLines(entry: OperationEntryRecord, allowedVat: Set<string>): EditorLine[] {
  const lines = (entry.lines ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((line) => ({
    key: line.id,
    description: line.description,
    quantity: Number(line.quantity) ? String(Number(line.quantity)) : "",
    unitAmount: Number(line.unitAmount) ? String(Number(line.unitAmount)) : "",
    discount: line.discount && Number(line.discount) ? String(Number(line.discount)) : "0",
    vatCodeId: line.vatCodeId && allowedVat.has(line.vatCodeId) ? line.vatCodeId : "",
  }));

  if (lines.length > 0) return lines;

  return [
    {
      key: crypto.randomUUID(),
      description: "",
      quantity: "",
      unitAmount: "",
      discount: "0",
      vatCodeId: "",
    },
  ];
}

function draftedLines(lines: EditorLine[]) {
  return lines.map((line) => ({
    description: line.description,
    quantity: parseDecimal(line.quantity) ?? 0,
    unitAmount: parseDecimal(line.unitAmount) ?? 0,
    discount: parseDecimal(line.discount) ?? 0,
    vatCodeId: line.vatCodeId || null,
  }));
}

export function CommercialDocumentEditor({
  operation,
  partyName,
  divisionName,
  entry: initialEntry,
  driveConnected,
  vatCodes = [],
  billTo: initialBillTo,
}: CommercialDocumentEditorProps) {
  const router = useRouter();
  const [entry, setEntry] = useState(initialEntry);
  const [lines, setLines] = useState<EditorLine[]>(() =>
    toEditorLines(
      initialEntry,
      new Set(vatCodes.filter((code) => salesVatTreatments.has(code.treatment)).map((code) => code.id)),
    ),
  );
  const [saving, setSaving] = useState(false);
  const [downloadKind, setDownloadKind] = useState<"docx" | "pdf" | null>(null);
  const downloading = downloadKind !== null;
  const busy = saving || downloading;
  const [marginPercent, setMarginPercent] = useState("0");
  const [issuedOn, setIssuedOn] = useState(initialEntry.issuedOn ?? "");
  const [dueOn, setDueOn] = useState(initialEntry.dueOn ?? "");
  const [paymentTerms, setPaymentTerms] = useState(initialEntry.paymentTerms ?? "");
  const [scope, setScope] = useState(initialEntry.body ?? "");
  const [billTo, setBillTo] = useState(initialBillTo);
  const [companyName, setCompanyName] = useState(initialBillTo.companyName);
  const [companyAddress, setCompanyAddress] = useState(initialBillTo.address);
  const [customerVat, setCustomerVat] = useState(initialBillTo.customerVat);
  const [contactName, setContactName] = useState(initialBillTo.contactName);
  const [logoId, setLogoId] = useState(
    divisions.some((division) => division.id === operation.divisionId && division.logo)
      ? operation.divisionId
      : "",
  );
  const [stampChoice, setStampChoice] = useState("");
  const [stampFile, setStampFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  useEffect(() => {
    if (stampChoice !== "upload" || !stampFile) {
      setUploadPreview(null);
      return;
    }
    const url = URL.createObjectURL(stampFile);
    setUploadPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [stampChoice, stampFile]);
  const logoChoices = divisions.filter((division) => division.logo);
  const selectedLogo = logoChoices.find((division) => division.id === logoId);
  const salesVatCodes = useMemo(
    () => vatCodes.filter((code) => salesVatTreatments.has(code.treatment)),
    [vatCodes],
  );
  const allowedVat = useMemo(
    () => new Set(salesVatCodes.map((code) => code.id)),
    [salesVatCodes],
  );

  const kind = getDocumentKindTitle(entry.entryType);
  const stage =
    resolveDocumentStage(entry.entryType, entry.documentStage) ?? "draft";
  const locked = areDocumentNumbersLocked(stage);
  const drafted = useMemo(() => draftedLines(lines), [lines]);
  const figures = useMemo(() => {
    if (entry.entryType !== "invoice") {
      const net = documentLinesTotal(drafted);
      return { net, vat: 0, total: net };
    }
    let net = 0n;
    let vat = 0n;
    let total = 0n;
    for (const line of drafted) {
      if (line.quantity <= 0 || line.unitAmount <= 0) continue;
      const code = salesVatCodes.find((item) => item.id === line.vatCodeId);
      const priced = priceSalesLine({
        description: line.description,
        quantity: line.quantity.toFixed(3),
        unitAmount: line.unitAmount.toFixed(3),
        discount: (line.discount ?? 0).toFixed(3),
        vat: code ? { id: code.id, rate: code.rate, treatment: code.treatment } : null,
      });
      net += priced.net;
      vat += priced.vat;
      total += priced.total;
    }
    return {
      net: Number(filsToAmount(net)),
      vat: Number(filsToAmount(vat)),
      total: Number(filsToAmount(total)),
    };
  }, [drafted, entry.entryType, salesVatCodes]);
  const invoiceForThis =
    entry.entryType === "quotation"
      ? (operation.entries ?? []).find(
          (item) =>
            item.entryType === "invoice" && item.parentEntryId === entry.id,
        )
      : undefined;
  const quotationForThis =
    entry.entryType === "procurement"
      ? (operation.entries ?? []).find(
          (item) =>
            item.entryType === "quotation" && item.parentEntryId === entry.id,
        )
      : undefined;
  const googleDoc = googleDocOnEntry(entry);
  const canGenerate =
    driveConnected &&
    (entry.entryType !== "procurement" || Boolean(entry.vendorOrganizationId));

  function updateLine(key: string, patch: Partial<EditorLine>) {
    setLines((current) =>
      current.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  async function saveLines() {
    const response = await fetch(
      `/api/operations/${operation.id}/entries/${entry.id}/lines`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lines: draftedLines(lines),
          issuedOn: issuedOn,
          dueOn: dueOn,
          paymentTerms: paymentTerms,
          body: scope,
        }),
      },
    );
    const data = (await response.json()) as {
      entry?: OperationEntryRecord;
      error?: string;
    };
    if (!response.ok || !data.entry) {
      throw new Error(data.error ?? "Failed to save");
    }
    setEntry(data.entry);
    if (data.entry.lines?.length) {
      setLines(toEditorLines(data.entry, allowedVat));
    }
    return data.entry;
  }

  async function changeStage(next: OperationDocumentStage) {
    const response = await fetch(
      `/api/operations/${operation.id}/entries/${entry.id}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentStage: next }),
      },
    );
    const data = (await response.json()) as {
      entry?: OperationEntryRecord;
      error?: string;
      postingNote?: string;
    };
    if (!response.ok || !data.entry) {
      throw new Error(data.error ?? "Failed to move stage");
    }
    if (data.postingNote) toast.message(data.postingNote);
    setEntry((current) => ({ ...current, ...data.entry }));
    return data.entry;
  }

  async function handleVendorChange(next: {
    vendorOrganizationId: string | null;
    vendorContactId: string | null;
  }) {
    if (locked || busy) return;
    setSaving(true);
    try {
      const updated = await fetch(
        `/api/operations/${operation.id}/entries/${entry.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next),
        },
      );
      const data = (await updated.json()) as {
        entry?: OperationEntryRecord;
        error?: string;
      };
      if (!updated.ok || !data.entry) {
        throw new Error(data.error ?? "Failed to save supplier");
      }
      setEntry((current) => ({ ...current, ...data.entry }));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to save supplier",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (locked || busy) return;
    setSaving(true);
    try {
      await saveLines();
      toast.success("Saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function openBillToGaps() {
    return billTo.missing.filter((field) => {
      if (field === "companyName") return !companyName.trim();
      if (field === "address") return !companyAddress.trim();
      if (field === "customerVat") return !customerVat.trim();
      return !contactName.trim();
    });
  }

  async function persistBillTo() {
    const response = await fetch(`/api/operations/${operation.id}/bill-to`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyName,
        address: companyAddress,
        customerVat,
        contactName,
      }),
    });
    const data = (await response.json()) as { billTo?: BillToDetails; error?: string };
    if (!response.ok || !data.billTo) throw new Error(data.error ?? "Failed to save details");
    setBillTo(data.billTo);
    setCompanyName(data.billTo.companyName);
    setCompanyAddress(data.billTo.address);
    setCustomerVat(data.billTo.customerVat);
    setContactName(data.billTo.contactName);
    if (data.billTo.missing.length > 0) {
      throw new Error("Fill the missing details. They are printed on the document.");
    }
    return data.billTo;
  }

  async function handleBillTo() {
    if (busy) return;
    setSaving(true);
    try {
      await persistBillTo();
      toast.success("Details saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save details");
    } finally {
      setSaving(false);
    }
  }

  async function handleDownload(format: "docx" | "pdf") {
    if (busy) return;
    if (openBillToGaps().length > 0) {
      toast.error("Fill the missing details before downloading.");
      return;
    }
    setDownloadKind(format);
    try {
      if (billTo.missing.length > 0) await persistBillTo();
      if (!locked) await saveLines();
      if (stampChoice === "upload" && !stampFile) {
        throw new Error("Choose a stamp image to upload");
      }
      const form = new FormData();
      form.set("format", format);
      if (logoId) form.set("logo", logoId);
      if (stampChoice === "upload" && stampFile) form.set("stampFile", stampFile);
      else if (stampChoice) form.set("stamp", stampChoice);
      const response = await fetch(
        `/api/operations/${operation.id}/entries/${entry.id}/document`,
        { method: "POST", body: form },
      );
      if (!response.ok) {
        const data = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Failed to download");
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = match?.[1] ?? `${kind}.${format}`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to download");
    } finally {
      setDownloadKind(null);
    }
  }

  async function handleSend() {
    if (busy) return;
    setSaving(true);
    try {
      if (!locked) {
        await saveLines();
      }
      await changeStage("sent");
      toast.success(`${kind} sent — numbers are locked`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to send");
    } finally {
      setSaving(false);
    }
  }

  function openGoogleDoc(link: string | null | undefined) {
    if (!link) {
      toast.error("No Google Doc link yet");
      return;
    }
    window.open(link, "_blank", "noopener,noreferrer");
  }

  async function handleGenerate(replace = false) {
    if (busy) return;
    setSaving(true);
    try {
      if (!locked) {
        await saveLines();
      }
      const response = await fetch(
        `/api/operations/${operation.id}/entries/${entry.id}/document`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ replace }),
        },
      );
      const data = (await response.json()) as {
        entry?: OperationEntryRecord;
        file?: { webViewLink: string | null };
        created?: boolean;
        error?: string;
      };
      if (!response.ok || !data.entry) {
        throw new Error(data.error ?? "Failed to generate Google Doc");
      }
      setEntry((current) => ({ ...current, ...data.entry }));
      if (data.entry.lines?.length) {
        setLines(toEditorLines(data.entry, allowedVat));
      }
      openGoogleDoc(
        data.file?.webViewLink ?? googleDocOnEntry(data.entry)?.webViewLink,
      );
      toast.success(
        replace ? "Google Doc regenerated from the fields" : "Google Doc created",
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to generate Google Doc",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleMakeInvoice() {
    if (busy) return;
    if (invoiceForThis) {
      router.push(commercialDocumentPath(operation.id, invoiceForThis.id));
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/operations/${operation.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "invoice",
          activityDate: todayInputDate(),
          parentEntryId: entry.id,
        }),
      });
      const data = (await response.json()) as {
        entry?: OperationEntryRecord;
        error?: string;
      };
      if (!response.ok || !data.entry) {
        throw new Error(data.error ?? "Failed to make invoice");
      }
      router.push(commercialDocumentPath(operation.id, data.entry.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to make invoice",
      );
      setSaving(false);
    }
  }

  async function handleMakeQuotation() {
    if (busy) return;
    if (quotationForThis) {
      router.push(commercialDocumentPath(operation.id, quotationForThis.id));
      return;
    }

    const margin = Number(marginPercent);
    const multiplier =
      Number.isFinite(margin) && margin > 0 ? 1 + margin / 100 : 1;

    setSaving(true);
    try {
      if (!locked) {
        await saveLines();
      }
      const response = await fetch(`/api/operations/${operation.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: "quotation",
          activityDate: todayInputDate(),
          parentEntryId: entry.id,
          unitAmountMultiplier: multiplier,
        }),
      });
      const data = (await response.json()) as {
        entry?: OperationEntryRecord;
        error?: string;
      };
      if (!response.ok || !data.entry) {
        throw new Error(data.error ?? "Failed to make quotation");
      }
      router.push(commercialDocumentPath(operation.id, data.entry.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to make quotation",
      );
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <button
        type="button"
        onClick={() => router.push(`/operations/${operation.id}`)}
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zoom-dark"
      >
        <ArrowLeftIcon className="size-4" />
        {operation.operationCode}
      </button>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <Heading>{kind}</Heading>
          <p className="mt-1 text-sm text-zinc-500">
            {partyName} · {divisionName} · {operation.title}
          </p>
        </div>
        <Badge color={stage === "draft" ? "zinc" : "blue"}>
          {getDocumentStageLabel(stage)}
        </Badge>
      </div>

      {locked ? (
        <p className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Qty and amounts are locked because this {kind.toLowerCase()} was sent.
          Revise from the operation if you need a new version.
        </p>
      ) : entry.entryType === "procurement" ? (
        <p className="mt-4 text-sm text-zinc-500">
          Attach the supplier and enter quantities and costs here. Generate the
          Google Doc when the numbers are ready — covering text is edited there.
        </p>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">
          Edit quantities and amounts here. Generate the Google Doc when they
          are right, then write covering text in Google Docs.
        </p>
      )}

      {entry.entryType === "invoice" || entry.entryType === "quotation" ? (
        billTo.missing.length > 0 ? (
          <div className="mt-4 rounded-md bg-amber-50 px-3 py-3 text-sm text-amber-950">
            <p>
              This {kind.toLowerCase()} is missing{" "}
              {billTo.missing
                .map((field) =>
                  field === "companyName"
                    ? "the company name"
                    : field === "address"
                      ? "the address"
                      : field === "customerVat"
                        ? "the customer VAT number"
                        : "the contact",
                )
                .join(", ")}
              . Fill the fields below. They are printed on the document.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {billTo.missing.includes("companyName") ? (
                <label>
                  Company name
                  <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark" />
                </label>
              ) : null}
              {billTo.missing.includes("address") ? (
                <label>
                  Address
                  <input value={companyAddress} onChange={(event) => setCompanyAddress(event.target.value)} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark" />
                </label>
              ) : null}
              {billTo.missing.includes("customerVat") ? (
                <label>
                  Customer VAT number
                  <input value={customerVat} onChange={(event) => setCustomerVat(event.target.value)} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark" />
                </label>
              ) : null}
              {billTo.missing.includes("contactName") ? (
                <label>
                  Contact
                  <input value={contactName} onChange={(event) => setContactName(event.target.value)} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark" />
                </label>
              ) : null}
            </div>
            <Button className="mt-3" onClick={() => void handleBillTo()} disabled={busy}>
              Save details
            </Button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-zinc-500">
            Bill to {billTo.companyName}
            {billTo.accountId ? ` · ${billTo.accountId}` : ""}
            {billTo.address ? ` · ${billTo.address}` : ""}
            {billTo.customerVat ? ` · VAT ${billTo.customerVat}` : ""}
          </p>
        )
      ) : null}

      {entry.entryType === "invoice" || entry.entryType === "quotation" || entry.entryType === "proposal" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="text-sm text-zinc-600">
            {entry.entryType === "invoice" ? "Issue date" : "Date"}
            <input type="date" value={issuedOn} onChange={(event) => setIssuedOn(event.target.value)} disabled={locked} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark" />
          </label>
          <label className="text-sm text-zinc-600">
            {entry.entryType === "invoice" ? "Due date" : "Valid until"}
            <input type="date" value={dueOn} onChange={(event) => setDueOn(event.target.value)} disabled={locked} className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark" />
          </label>
          {entry.entryType === "invoice" ? (
            <label className="text-sm text-zinc-600">
              Payment terms
              <input value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} disabled={locked} placeholder="30 days" className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark" />
            </label>
          ) : null}
        </div>
      ) : null}
      {entry.entryType === "invoice" || entry.entryType === "quotation" || entry.entryType === "proposal" ? (
        <label className="mt-4 block text-sm text-zinc-600">
          {entry.entryType === "invoice" ? "Invoice description" : "Quotation scope"}
          <textarea
            value={scope}
            disabled={locked}
            onChange={(event) => setScope(event.target.value)}
            rows={3}
            placeholder={entry.entryType === "invoice" ? "What this tax invoice covers" : "What this quotation covers"}
            className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark"
          />
        </label>
      ) : null}
      {entry.entryType === "invoice" && entry.taxVersion === 1 ? (
        <p className="mt-2 text-sm text-zinc-500">This invoice uses line VAT. Sent invoices are not recalculated.</p>
      ) : null}

      {entry.entryType === "procurement" ? (
        <div className="mt-4">
          <ProcurementVendorPicker
            organizationId={entry.vendorOrganizationId ?? null}
            contactId={entry.vendorContactId ?? null}
            organizationName={entry.vendorOrganization?.name}
            contactName={entry.vendorContact?.name}
            locked={locked}
            disabled={busy}
            onChange={(next) => void handleVendorChange(next)}
          />
        </div>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg bg-white ring-1 ring-zinc-200">
        <table className="min-w-full text-sm">
          <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-3 py-2 font-medium">Item</th>
              <th className="w-28 px-3 py-2 font-medium">Qty</th>
              <th className="w-36 px-3 py-2 font-medium">{entry.entryType === "invoice" ? "Price / unit" : "Rate"}</th>
              {entry.entryType === "invoice" ? <th className="w-36 px-3 py-2 font-medium">VAT</th> : null}
              <th className="w-36 px-3 py-2 text-right font-medium">Amount</th>
              {!locked ? <th className="w-10 px-2 py-2" /> : null}
            </tr>
          </thead>
          <tbody>
            {lines.map((line) => (
              <tr key={line.key} className="border-t border-zinc-100">
                <td className="px-3 py-1.5">
                  <input
                    value={line.description}
                    disabled={locked}
                    onChange={(event) =>
                      updateLine(line.key, { description: event.target.value })
                    }
                    placeholder="Optional"
                    className="w-full bg-transparent text-sm text-zoom-dark placeholder:text-zinc-400 focus:outline-none disabled:text-zinc-600"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <input
                    value={line.quantity}
                    disabled={locked}
                    inputMode="decimal"
                    onChange={(event) =>
                      updateLine(line.key, { quantity: event.target.value })
                    }
                    placeholder="0"
                    className="w-full bg-transparent text-sm tabular-nums text-zoom-dark placeholder:text-zinc-400 focus:outline-none disabled:text-zinc-600"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-zinc-400">BHD</span>
                    <input
                      value={line.unitAmount}
                      disabled={locked}
                      inputMode="decimal"
                      onChange={(event) =>
                        updateLine(line.key, { unitAmount: event.target.value })
                      }
                      placeholder="0.000"
                      className="w-full bg-transparent text-sm tabular-nums text-zoom-dark placeholder:text-zinc-400 focus:outline-none disabled:text-zinc-600"
                    />
                  </div>
                </td>
                {entry.entryType === "invoice" ? (
                  <td className="px-3 py-1.5">
                    <select
                      value={line.vatCodeId}
                      disabled={locked}
                      onChange={(event) => updateLine(line.key, { vatCodeId: event.target.value })}
                      className="bg-transparent text-sm text-zoom-dark"
                    >
                      <option value="">No VAT</option>
                      {salesVatCodes.map((code) => (
                        <option key={code.id} value={code.id}>{code.name}</option>
                      ))}
                    </select>
                  </td>
                ) : null}
                <td className="px-3 py-1.5 text-right tabular-nums text-zoom-dark">
                  {(() => {
                    const qty = parseDecimal(line.quantity) ?? 0;
                    const amount = parseDecimal(line.unitAmount) ?? 0;
                    if (qty <= 0 || amount <= 0) return "—";
                    if (entry.entryType !== "invoice") return formatBhd(lineTotal(qty, amount));
                    const code = salesVatCodes.find((item) => item.id === line.vatCodeId);
                    const priced = priceSalesLine({
                      description: line.description,
                      quantity: qty.toFixed(3),
                      unitAmount: amount.toFixed(3),
                      discount: line.discount || "0",
                      vat: code ? { id: code.id, rate: code.rate, treatment: code.treatment } : null,
                    });
                    return formatBhd(filsToAmount(priced.total));
                  })()}
                </td>
                {!locked ? (
                  <td className="px-2 py-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setLines((current) =>
                          current.length === 1
                            ? current
                            : current.filter((item) => item.key !== line.key),
                        )
                      }
                      className="text-zinc-400 hover:text-red-600"
                      aria-label="Remove line"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>

        {!locked ? (
          <button
            type="button"
            onClick={() =>
              setLines((current) => [
                ...current,
                {
                  key: crypto.randomUUID(),
                  description: "",
                  quantity: "",
                  unitAmount: "",
                  discount: "0",
                  vatCodeId: "",
                },
              ])
            }
            className="flex w-full items-center gap-1 border-t border-zinc-100 px-3 py-2 text-left text-sm text-zoom-medium hover:bg-zinc-50"
          >
            <PlusIcon className="size-4" />
            Add line
          </button>
        ) : null}
      </div>

      {entry.entryType === "invoice" || entry.entryType === "quotation" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm text-zoom-navy">
            Header logo
            <select
              value={logoId}
              onChange={(event) => setLogoId(event.target.value)}
              className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark"
            >
              <option value="">Template logo</option>
              {logoChoices.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.name}
                </option>
              ))}
            </select>
            {selectedLogo?.logo ? (
              <img src={selectedLogo.logo} alt={selectedLogo.name} className="mt-[10px] h-8 w-auto" />
            ) : null}
          </label>
          {entry.entryType === "invoice" ? (
            <label className="text-sm text-zoom-navy">
              Stamp
              <select
                value={stampChoice}
                onChange={(event) => {
                  setStampChoice(event.target.value);
                  if (event.target.value !== "upload") setStampFile(null);
                }}
                className="mt-1 w-full rounded-md border border-zinc-200 bg-white px-2 py-1 text-sm text-zoom-dark"
              >
                <option value="">Template stamp and signature</option>
                <option value="real-estate-advertising">Zoom Real Estate &amp; Advertising stamp and signature</option>
                <option value="solutions">Zoom Solutions stamp and signature</option>
                <option value="upload">Upload a stamp</option>
              </select>
              {stampChoice === "upload" ? (
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => setStampFile(event.target.files?.[0] ?? null)}
                  className="mt-2 block w-full text-sm text-zinc-600"
                />
              ) : null}
              <div className="mt-2 flex items-end gap-4">
                {stampChoice === "upload" && !uploadPreview ? null : (
                  <figure>
                    <img
                      src={
                        stampChoice === "upload"
                          ? (uploadPreview ?? "")
                          : `/api/commercial-artwork?piece=${stampChoice || "template-stamp"}`
                      }
                      alt="Stamp"
                      className="h-16 w-auto"
                    />
                    <figcaption className="mt-1 text-xs text-zinc-500">Stamp</figcaption>
                  </figure>
                )}
                <figure>
                  <img src="/api/commercial-artwork?piece=signature" alt="Signature" className="h-14 w-auto" />
                  <figcaption className="mt-1 text-xs text-zinc-500">Signature</figcaption>
                </figure>
              </div>
              <p className="mt-2 text-xs text-zinc-500">Both are printed on the invoice, with the signature beside the stamp.</p>
            </label>
          ) : null}
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm tabular-nums text-zoom-navy">
          {entry.entryType === "invoice" ? (
            <p>Subtotal {formatBhd(figures.net) || "BHD 0.000"} · VAT {formatBhd(figures.vat) || "BHD 0.000"}</p>
          ) : null}
          <p className="text-lg font-semibold">Total {formatBhd(figures.total) || "BHD 0.000"}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!locked ? (
            <>
              <Button outline onClick={() => void handleSave()} disabled={busy}>
                {saving ? "Saving…" : "Save draft"}
              </Button>
              <Button
                onClick={() => void handleSend()}
                disabled={
                  busy ||
                  (entry.entryType === "procurement" &&
                    !entry.vendorOrganizationId)
                }
              >
                {entry.entryType === "invoice" ? "Issue invoice" : "Mark sent"}
              </Button>
            </>
          ) : null}
          <Button
            outline
            onClick={() => void handleDownload("docx")}
            disabled={busy || openBillToGaps().length > 0}
            title={openBillToGaps().length > 0 ? "Fill the missing details first" : undefined}
          >
            {downloadKind === "docx" ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Downloading…
              </span>
            ) : (
              "Download Word"
            )}
          </Button>
          <Button
            outline
            onClick={() => void handleDownload("pdf")}
            disabled={busy || openBillToGaps().length > 0}
            title={openBillToGaps().length > 0 ? "Fill the missing details first" : "Download a PDF to send to the client"}
          >
            {downloadKind === "pdf" ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Downloading…
              </span>
            ) : (
              "Download PDF"
            )}
          </Button>
          {googleDoc?.webViewLink ? (
            <Button
              outline
              onClick={() => openGoogleDoc(googleDoc.webViewLink)}
              disabled={busy}
            >
              Open Google Doc
            </Button>
          ) : (
            <Button
              outline
              onClick={() => void handleGenerate(false)}
              disabled={busy || !canGenerate}
              title={
                driveConnected
                  ? undefined
                  : "Connect Google Drive in Settings first"
              }
            >
              Generate Google Doc
            </Button>
          )}
          {googleDoc && !locked ? (
            <Button
              plain
              onClick={() => void handleGenerate(true)}
              disabled={busy || !canGenerate}
            >
              Regenerate
            </Button>
          ) : null}
          {entry.entryType === "quotation" && stage === "accepted" ? (
            <Button onClick={() => void handleMakeInvoice()} disabled={busy}>
              {invoiceForThis ? "Open invoice" : "Make invoice"}
            </Button>
          ) : null}
          {entry.entryType === "procurement" ? (
            <>
              {quotationForThis ? null : (
                <label className="flex items-center gap-1 text-xs text-zinc-500">
                  Margin %
                  <input
                    value={marginPercent}
                    onChange={(event) => setMarginPercent(event.target.value)}
                    inputMode="decimal"
                    className="h-8 w-14 rounded-md border border-zinc-200 bg-white px-1.5 text-sm tabular-nums text-zoom-dark"
                  />
                </label>
              )}
              <Button
                onClick={() => void handleMakeQuotation()}
                disabled={busy || !entry.vendorOrganizationId}
              >
                {quotationForThis ? "Open quotation" : "Make client quotation"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        Download Word and Download PDF use the saved lines and do not email anyone.
        {entry.entryType === "invoice"
          ? " Issue invoice is the step that posts this invoice to the accounts and locks the lines."
          : " Mark sent only locks the numbers. It does not email the client."}
        {!driveConnected ? " Google Doc still needs Drive connected in Settings." : ""}
      </p>
    </div>
  );
}
