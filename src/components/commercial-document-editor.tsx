"use client";

import { useMemo, useState } from "react";
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
import { formatBhd, parseDecimal, todayInputDate } from "@/lib/utils";

type EditorLine = {
  key: string;
  description: string;
  quantity: string;
  unitAmount: string;
};

type CommercialDocumentEditorProps = {
  operation: OperationRecord;
  partyName: string;
  divisionName: string;
  entry: OperationEntryRecord;
  driveConnected: boolean;
};

function toEditorLines(entry: OperationEntryRecord): EditorLine[] {
  const lines = (entry.lines ?? [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((line) => ({
    key: line.id,
    description: line.description,
    quantity: Number(line.quantity) ? String(Number(line.quantity)) : "",
    unitAmount: Number(line.unitAmount) ? String(Number(line.unitAmount)) : "",
  }));

  if (lines.length > 0) return lines;

  return [
    {
      key: crypto.randomUUID(),
      description: "",
      quantity: "",
      unitAmount: "",
    },
  ];
}

function draftedLines(lines: EditorLine[]) {
  return lines.map((line) => ({
    description: line.description,
    quantity: parseDecimal(line.quantity) ?? 0,
    unitAmount: parseDecimal(line.unitAmount) ?? 0,
  }));
}

export function CommercialDocumentEditor({
  operation,
  partyName,
  divisionName,
  entry: initialEntry,
  driveConnected,
}: CommercialDocumentEditorProps) {
  const router = useRouter();
  const [entry, setEntry] = useState(initialEntry);
  const [lines, setLines] = useState<EditorLine[]>(() =>
    toEditorLines(initialEntry),
  );
  const [saving, setSaving] = useState(false);
  const [marginPercent, setMarginPercent] = useState("0");

  const kind = getDocumentKindTitle(entry.entryType);
  const stage =
    resolveDocumentStage(entry.entryType, entry.documentStage) ?? "draft";
  const locked = areDocumentNumbersLocked(stage);
  const drafted = useMemo(() => draftedLines(lines), [lines]);
  const total = useMemo(() => documentLinesTotal(drafted), [drafted]);
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
      setLines(toEditorLines(data.entry));
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
    };
    if (!response.ok || !data.entry) {
      throw new Error(data.error ?? "Failed to move stage");
    }
    setEntry((current) => ({ ...current, ...data.entry }));
    return data.entry;
  }

  async function handleVendorChange(next: {
    vendorOrganizationId: string | null;
    vendorContactId: string | null;
  }) {
    if (locked || saving) return;
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
    if (locked || saving) return;
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

  async function handleSend() {
    if (saving) return;
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
    if (saving) return;
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
        setLines(toEditorLines(data.entry));
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
    if (saving) return;
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
    if (saving) return;
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

      {entry.entryType === "procurement" ? (
        <div className="mt-4">
          <ProcurementVendorPicker
            organizationId={entry.vendorOrganizationId ?? null}
            contactId={entry.vendorContactId ?? null}
            organizationName={entry.vendorOrganization?.name}
            contactName={entry.vendorContact?.name}
            locked={locked}
            disabled={saving}
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
              <th className="w-36 px-3 py-2 font-medium">Amount</th>
              <th className="w-36 px-3 py-2 text-right font-medium">Total</th>
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
                <td className="px-3 py-1.5 text-right tabular-nums text-zoom-dark">
                  {(() => {
                    const qty = parseDecimal(line.quantity) ?? 0;
                    const amount = parseDecimal(line.unitAmount) ?? 0;
                    return qty > 0 && amount > 0
                      ? formatBhd(lineTotal(qty, amount))
                      : "—";
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

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-lg font-semibold tabular-nums text-zoom-navy">
          Total {formatBhd(total) || "BHD 0.000"}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {!locked ? (
            <>
              <Button outline onClick={() => void handleSave()} disabled={saving}>
                {saving ? "Saving…" : "Save draft"}
              </Button>
              <Button
                onClick={() => void handleSend()}
                disabled={
                  saving ||
                  (entry.entryType === "procurement" &&
                    !entry.vendorOrganizationId)
                }
              >
                Send
              </Button>
            </>
          ) : null}
          {googleDoc?.webViewLink ? (
            <Button
              outline
              onClick={() => openGoogleDoc(googleDoc.webViewLink)}
              disabled={saving}
            >
              Open Google Doc
            </Button>
          ) : (
            <Button
              outline
              onClick={() => void handleGenerate(false)}
              disabled={saving || !canGenerate}
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
              disabled={saving || !canGenerate}
            >
              Regenerate
            </Button>
          ) : null}
          {entry.entryType === "quotation" && stage === "accepted" ? (
            <Button onClick={() => void handleMakeInvoice()} disabled={saving}>
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
                disabled={saving || !entry.vendorOrganizationId}
              >
                {quotationForThis ? "Open quotation" : "Make client quotation"}
              </Button>
            </>
          ) : null}
        </div>
      </div>
      {!driveConnected ? (
        <p className="mt-2 text-xs text-zinc-500">
          Connect Google Drive in Settings to generate the document.
        </p>
      ) : null}
    </div>
  );
}
