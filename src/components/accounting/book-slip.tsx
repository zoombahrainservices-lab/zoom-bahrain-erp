"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";
import { getBookKind } from "@/lib/books-flow";
import { getDocumentStageLabel } from "@/lib/operation-documents";
import type { BookSlipStage } from "@/lib/books-flow";

type Line = { description: string; quantity: string; unitAmount: string };

const continueLabels: Record<string, string> = {
  quotation: "quotation",
  "sale-invoice": "invoice",
  procurement: "procurement",
};

export function BookSlipEditor({
  operationId,
  entryId,
  initialDate,
  initialBody,
  initialStage,
  initialLines,
  stages,
  convertTo,
}: {
  operationId: string;
  entryId: string;
  initialDate: string;
  initialBody: string;
  initialStage: BookSlipStage;
  initialLines: Line[];
  stages: BookSlipStage[];
  convertTo: string[];
}) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [body, setBody] = useState(initialBody);
  const [stage, setStage] = useState<BookSlipStage>(initialStage);
  const [lines, setLines] = useState<Line[]>(
    initialLines.length > 0 ? initialLines : [{ description: "", quantity: "1", unitAmount: "" }],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const locked = stage !== "draft";
  const total = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const rate = Number(line.unitAmount);
    if (!Number.isFinite(quantity) || !Number.isFinite(rate)) return sum;
    return sum + Math.round(quantity * rate * 1000) / 1000;
  }, 0);

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  }

  async function save() {
    const response = await fetch(`/api/operations/${operationId}/entries/${entryId}/slip`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        body,
        activityDate: date,
        documentStage: stage,
        lines: lines.map((line) => ({
          description: line.description,
          quantity: Number(line.quantity) || 0,
          unitAmount: Number(line.unitAmount) || 0,
        })),
      }),
    });
    const data = (await response.json()) as { error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not save");
  }

  async function onSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await save();
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function convert(target: string) {
    setSaving(true);
    setError("");
    try {
      if (stage === "draft") await save();
      const response = await fetch("/api/accounting/book-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: target,
          operationId,
          parentEntryId: entryId,
        }),
      });
      const data = (await response.json()) as { href?: string; error?: string };
      if (!response.ok || !data.href) throw new Error(data.error ?? "Could not continue");
      router.push(data.href);
      router.refresh();
    } catch (convertError) {
      setError(convertError instanceof Error ? convertError.message : "Could not continue");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSave} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium text-heading">
          Date
          <Input className="mt-1" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <label className="block text-sm font-medium text-heading">
          Status
          <Select
            className="mt-1"
            value={stage}
            onChange={(event) => setStage(event.target.value as BookSlipStage)}
          >
            {stages.map((item) => (
              <option key={item} value={item}>
                {getDocumentStageLabel(item)}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label className="block text-sm font-medium text-heading">
        Note
        <Input className="mt-1" value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-foreground">
          <thead className="text-text-secondary">
            <tr>
              {["Item", "Qty", "Rate", ""].map((header) => (
                <th key={header} className="border-b border-border px-3 py-2 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={index}>
                <td className="border-b border-border px-3 py-2">
                  <Input
                    value={line.description}
                    disabled={locked}
                    aria-label={`Item ${index + 1}`}
                    onChange={(event) => updateLine(index, { description: event.target.value })}
                  />
                </td>
                <td className="border-b border-border px-3 py-2">
                  <Input
                    value={line.quantity}
                    disabled={locked}
                    inputMode="decimal"
                    aria-label={`Quantity ${index + 1}`}
                    onChange={(event) => updateLine(index, { quantity: event.target.value })}
                  />
                </td>
                <td className="border-b border-border px-3 py-2">
                  <Input
                    value={line.unitAmount}
                    disabled={locked}
                    inputMode="decimal"
                    aria-label={`Rate ${index + 1}`}
                    onChange={(event) => updateLine(index, { unitAmount: event.target.value })}
                  />
                </td>
                <td className="border-b border-border px-3 py-2">
                  {locked ? null : (
                    <button
                      type="button"
                      className="text-sm text-text-secondary"
                      onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {locked ? null : (
          <Button
            type="button"
            outline
            onClick={() =>
              setLines((current) => [...current, { description: "", quantity: "1", unitAmount: "" }])
            }
          >
            Add line
          </Button>
        )}
        <p className="text-sm tabular-nums text-heading">Total {total.toFixed(3)}</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {convertTo.map((target) => {
          const next = getBookKind(target);
          if (!next) return null;
          return (
            <Button key={target} type="button" outline disabled={saving} onClick={() => convert(target)}>
              Continue as {continueLabels[target] ?? next.label.toLowerCase()}
            </Button>
          );
        })}
      </div>
    </form>
  );
}
