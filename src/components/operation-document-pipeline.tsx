"use client";

import { useState } from "react";

import { Button } from "@/components/catalyst/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/catalyst/dialog";
import {
  getDocumentKindTitle,
  getDocumentStageLabel,
  getDocumentStages,
  isCommercialDocumentType,
  resolveDocumentStage,
} from "@/lib/operation-documents";
import type {
  OperationDocumentStage,
  OperationEntryRecord,
} from "@/lib/operation-fields";
import { formatBhd } from "@/lib/utils";

type OperationDocumentPipelineProps = {
  entries: OperationEntryRecord[];
  onStageChange: (entryId: string, stage: OperationDocumentStage) => void;
  onOpenDocument: (entry: OperationEntryRecord) => void;
  onRevise: (entry: OperationEntryRecord) => void;
  onCreateInvoice: (quotation: OperationEntryRecord) => void | Promise<void>;
};

function uniqueById(entries: OperationEntryRecord[]) {
  const seen = new Set<string>();
  const unique: OperationEntryRecord[] = [];
  for (const entry of entries) {
    if (seen.has(entry.id)) continue;
    seen.add(entry.id);
    unique.push(entry);
  }
  return unique;
}

function documentTitle(entry: OperationEntryRecord) {
  const kind = getDocumentKindTitle(entry.entryType);
  const amount = formatBhd(entry.amount);
  return amount ? `${kind} · ${amount}` : kind;
}

export function OperationDocumentPipeline({
  entries,
  onStageChange,
  onOpenDocument,
  onRevise,
  onCreateInvoice,
}: OperationDocumentPipelineProps) {
  const documents = uniqueById(
    entries.filter((entry) => isCommercialDocumentType(entry.entryType)),
  );
  const [pendingMove, setPendingMove] = useState<{
    entry: OperationEntryRecord;
    from: OperationDocumentStage;
    to: OperationDocumentStage;
  } | null>(null);
  const [pendingRevise, setPendingRevise] =
    useState<OperationEntryRecord | null>(null);
  const [pendingInvoice, setPendingInvoice] =
    useState<OperationEntryRecord | null>(null);
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  function invoiceForQuotation(quotationId: string) {
    return documents.find(
      (item) =>
        item.entryType === "invoice" && item.parentEntryId === quotationId,
    );
  }

  function requestMove(entry: OperationEntryRecord, to: OperationDocumentStage) {
    const from =
      resolveDocumentStage(entry.entryType, entry.documentStage) ?? "draft";
    if (from === to) return;
    setPendingMove({ entry, from, to });
  }

  function openInvoicePrompt(quotation: OperationEntryRecord) {
    if (invoiceForQuotation(quotation.id)) return;
    setPendingInvoice(quotation);
  }

  async function submitInvoice() {
    if (!pendingInvoice || creatingInvoice) return;

    setCreatingInvoice(true);
    try {
      await onCreateInvoice(pendingInvoice);
      setPendingInvoice(null);
    } finally {
      setCreatingInvoice(false);
    }
  }

  if (documents.length === 0) return null;

  const groups = new Map<string, OperationEntryRecord[]>();
  for (const entry of documents) {
    const list = groups.get(entry.entryType) ?? [];
    list.push(entry);
    groups.set(entry.entryType, list);
  }

  const pendingName = pendingMove ? documentTitle(pendingMove.entry) : "";

  return (
    <div className="border-b border-zinc-200 bg-white px-6 py-2 lg:px-10">
      <p className="text-[11px] font-medium text-zinc-500">Documents</p>
      <div className="mt-1.5 space-y-2">
        {[...groups.entries()].map(([entryType, items]) => {
          const stages = getDocumentStages(entryType);
          const label =
            entryType === "procurement"
              ? "Procurement"
              : `${getDocumentKindTitle(entryType)}s`;

          return (
            <div key={entryType}>
              <p className="mb-1 text-[10px] uppercase tracking-wide text-zinc-400">
                {label}
              </p>
              <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
                {stages.map((stage) => (
                  <div
                    key={stage}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={(event) => {
                      event.preventDefault();
                      const entryId =
                        event.dataTransfer.getData("text/entry-id");
                      const dropped = documents.find(
                        (item) => item.id === entryId,
                      );
                      if (dropped) requestMove(dropped, stage);
                    }}
                    className="min-h-14 rounded-md bg-zinc-50 px-1.5 py-1 ring-1 ring-zinc-200/80"
                  >
                    <p className="mb-1 text-[10px] font-medium text-zinc-500">
                      {getDocumentStageLabel(stage)}
                    </p>
                    <div className="space-y-1">
                      {uniqueById(
                        items.filter(
                          (item) =>
                            resolveDocumentStage(
                              item.entryType,
                              item.documentStage,
                            ) === stage,
                        ),
                      ).map((item) => (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(event) => {
                            event.dataTransfer.setData("text/entry-id", item.id);
                            event.dataTransfer.effectAllowed = "move";
                          }}
                          className="cursor-grab rounded bg-white px-1.5 py-1 text-[11px] text-zoom-dark shadow-sm ring-1 ring-zinc-200 active:cursor-grabbing"
                        >
                          <button
                            type="button"
                            onClick={() => onOpenDocument(item)}
                            className="block w-full truncate text-left font-medium hover:text-zoom-light"
                          >
                            {documentTitle(item)}
                          </button>
                          {item.vendorOrganization?.name ? (
                            <p className="truncate text-[10px] text-zinc-500">
                              {item.vendorOrganization.name}
                            </p>
                          ) : null}
                          {(stage === "rejected" || stage === "sent") &&
                          !items.some(
                            (other) =>
                              other.parentEntryId === item.id &&
                              other.entryType === item.entryType,
                          ) ? (
                            <button
                              type="button"
                              onClick={() => setPendingRevise(item)}
                              className="mt-0.5 text-[10px] text-zoom-medium hover:underline"
                            >
                              Revise
                            </button>
                          ) : null}
                          {item.entryType === "quotation" &&
                          stage === "accepted" &&
                          !invoiceForQuotation(item.id) ? (
                            <button
                              type="button"
                              onClick={() => openInvoicePrompt(item)}
                              className="mt-0.5 block text-[10px] font-medium text-zoom-medium hover:underline"
                            >
                              Next: make invoice
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog
        open={pendingMove !== null}
        onClose={() => setPendingMove(null)}
        size="sm"
      >
        <DialogTitle>
          {pendingMove?.to === "accepted" &&
          pendingMove.entry.entryType === "quotation"
            ? "Accept this quotation?"
            : "Move this document?"}
        </DialogTitle>
        <DialogDescription>
          {pendingMove?.to === "accepted" &&
          pendingMove.entry.entryType === "quotation"
            ? `Move “${pendingName}” to Accepted. Next: make an invoice from these locked lines.`
            : pendingMove
              ? `Move “${pendingName}” from ${getDocumentStageLabel(pendingMove.from)} to ${getDocumentStageLabel(pendingMove.to)}? This does not create a copy.`
              : null}
        </DialogDescription>
        <DialogBody />
        <DialogActions>
          <Button plain onClick={() => setPendingMove(null)}>
            No
          </Button>
          <Button
            onClick={() => {
              if (!pendingMove) return;
              const { entry, to } = pendingMove;
              onStageChange(entry.id, to);
              setPendingMove(null);
              if (
                entry.entryType === "quotation" &&
                to === "accepted" &&
                !invoiceForQuotation(entry.id)
              ) {
                window.setTimeout(() => openInvoicePrompt(entry), 0);
              }
            }}
          >
            {pendingMove?.to === "accepted" &&
            pendingMove.entry.entryType === "quotation"
              ? "Yes, then make invoice"
              : "Yes, move"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pendingRevise !== null}
        onClose={() => setPendingRevise(null)}
        size="sm"
      >
        <DialogTitle>Create a revision?</DialogTitle>
        <DialogDescription>
          The current document stays where it is. A new draft copy opens with
          the same lines so you can change the numbers.
        </DialogDescription>
        <DialogBody />
        <DialogActions>
          <Button plain onClick={() => setPendingRevise(null)}>
            No
          </Button>
          <Button
            onClick={() => {
              if (!pendingRevise) return;
              const target = pendingRevise;
              setPendingRevise(null);
              onRevise(target);
            }}
          >
            Yes, revise
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={pendingInvoice !== null}
        onClose={() => {
          if (creatingInvoice) return;
          setPendingInvoice(null);
        }}
        size="sm"
      >
        <DialogTitle>Make invoice</DialogTitle>
        <DialogDescription>
          Copy the locked quantities and amounts from this quotation into a
          draft invoice.
        </DialogDescription>
        <DialogBody />
        <DialogActions>
          <Button
            plain
            disabled={creatingInvoice}
            onClick={() => setPendingInvoice(null)}
          >
            Later
          </Button>
          <Button
            onClick={() => void submitInvoice()}
            disabled={creatingInvoice}
          >
            {creatingInvoice ? "Creating…" : "Make invoice"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

export function DocumentStageTrack({
  entryType,
  stage,
  onStageChange,
}: {
  entryType: string;
  stage: OperationDocumentStage | null | undefined;
  onStageChange: (stage: OperationDocumentStage) => void;
}) {
  const stages = getDocumentStages(entryType);
  if (stages.length === 0) return null;

  const current = resolveDocumentStage(entryType, stage) ?? "draft";

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1">
      {stages.map((item) => {
        const active = item === current;
        return (
          <button
            key={item}
            type="button"
            onClick={() => onStageChange(item)}
            className={`rounded px-1.5 py-px text-[10px] font-medium ${
              active
                ? "bg-zoom-dark text-white"
                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200"
            }`}
          >
            {getDocumentStageLabel(item)}
          </button>
        );
      })}
    </div>
  );
}
