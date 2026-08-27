"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { PaperClipIcon } from "@heroicons/react/20/solid";
import TextareaAutosize from "react-textarea-autosize";
import { toast } from "sonner";

import { Button } from "@/components/catalyst/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/catalyst/dialog";
import { Field, Label } from "@/components/catalyst/fieldset";
import { Input } from "@/components/catalyst/input";
import type { OperationActivityMoneyKind } from "@/db/schema";
import {
  groupActivityTypes,
  type OperationActivityTypeRecord,
} from "@/lib/operation-activity-types";
import { isCommercialDocumentType } from "@/lib/operation-documents";
import { type OperationEntryType } from "@/lib/operation-fields";
import { todayInputDate, yesterdayInputDate } from "@/lib/utils";

const ADD_NEW_VALUE = "__add_new__";

const moneyKindOptions: {
  value: OperationActivityMoneyKind;
  label: string;
  help: string;
}[] = [
  { value: "none", label: "No money", help: "Notes, calls, to-dos" },
  { value: "in", label: "Money in", help: "Invoice, quotation" },
  { value: "out", label: "Money out", help: "Cost, expense" },
];

type OperationThreadComposerProps = {
  entryType: OperationEntryType;
  activityDate: string;
  body: string;
  amount: string;
  pendingFiles: File[];
  loading: boolean;
  driveConnected: boolean;
  types: OperationActivityTypeRecord[];
  onEntryTypeChange: (type: OperationEntryType) => void;
  onActivityDateChange: (date: string) => void;
  onBodyChange: (body: string) => void;
  onAmountChange: (amount: string) => void;
  onPendingFilesChange: (files: File[]) => void;
  onTypeCreated: (type: OperationActivityTypeRecord) => void;
  onSubmit: () => void;
};

export function OperationThreadComposer({
  entryType,
  activityDate,
  body,
  amount,
  pendingFiles,
  loading,
  driveConnected,
  types,
  onEntryTypeChange,
  onActivityDateChange,
  onBodyChange,
  onAmountChange,
  onPendingFilesChange,
  onTypeCreated,
  onSubmit,
}: OperationThreadComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [addTypeOpen, setAddTypeOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState("");
  const [newMoneyKind, setNewMoneyKind] =
    useState<OperationActivityMoneyKind>("none");
  const [savingType, setSavingType] = useState(false);

  useEffect(() => {
    function onFocus() {
      textareaRef.current?.focus();
    }
    window.addEventListener("zoom-focus-composer", onFocus);
    return () => window.removeEventListener("zoom-focus-composer", onFocus);
  }, []);

  const selectedType = types.some((type) => type.slug === entryType)
    ? entryType
    : (types[0]?.slug ?? "note");
  const isDocument = isCommercialDocumentType(selectedType);
  const selectedMoneyKind =
    types.find((type) => type.slug === selectedType)?.moneyKind ?? "none";
  const asksAmount = selectedMoneyKind === "out" && !isDocument;
  const canSave = Boolean(
    body.trim() ||
      pendingFiles.length > 0 ||
      isDocument ||
      (asksAmount && amount.trim()),
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length === 0) return;
      onPendingFilesChange([...pendingFiles, ...accepted]);
    },
    [onPendingFilesChange, pendingFiles],
  );

  const { getRootProps, getInputProps, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: loading || !driveConnected,
  });

  function handlePaste(event: React.ClipboardEvent) {
    if (!driveConnected || loading) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    const pasted: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) pasted.push(file);
      }
    }

    if (pasted.length > 0) {
      event.preventDefault();
      onPendingFilesChange([...pendingFiles, ...pasted]);
    }
  }

  async function addNewType() {
    const name = newTypeName.trim();
    if (!name || savingType) return;

    setSavingType(true);

    try {
      const response = await fetch("/api/operation-activity-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: name,
          moneyKind: newMoneyKind,
        }),
      });
      const data = (await response.json()) as {
        type?: OperationActivityTypeRecord;
        error?: string;
      };

      if (!response.ok || !data.type) {
        throw new Error(data.error ?? "Failed to add type");
      }

      onTypeCreated(data.type);
      onEntryTypeChange(data.type.slug);
      setNewTypeName("");
      setNewMoneyKind("none");
      setAddTypeOpen(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to add type",
      );
    } finally {
      setSavingType(false);
    }
  }

  return (
    <div
      className="bg-zoom-palest/40 px-6 py-2 lg:px-10"
      onPaste={handlePaste}
      {...getRootProps()}
    >
      <input {...getInputProps()} />

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <input
            type="date"
            aria-label="Date"
            value={activityDate}
            onChange={(event) => onActivityDateChange(event.target.value)}
            className="h-6 w-[8.5rem] cursor-pointer border-0 bg-transparent p-0 text-[11px] text-zinc-500 focus:outline-none focus:ring-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-40"
          />
          <button
            type="button"
            className={`text-[11px] ${activityDate === todayInputDate() ? "font-medium text-zoom-dark" : "text-zinc-400 hover:text-zoom-dark"}`}
            onClick={() => onActivityDateChange(todayInputDate())}
          >
            Today
          </button>
          <button
            type="button"
            className={`text-[11px] ${activityDate === yesterdayInputDate() ? "font-medium text-zoom-dark" : "text-zinc-400 hover:text-zoom-dark"}`}
            onClick={() => onActivityDateChange(yesterdayInputDate())}
          >
            Yesterday
          </button>
          <select
            aria-label="Type"
            value={selectedType}
            onChange={(event) => {
              if (event.target.value === ADD_NEW_VALUE) {
                setAddTypeOpen(true);
                return;
              }
              onEntryTypeChange(event.target.value);
            }}
            className="h-6 max-w-[9rem] cursor-pointer border-0 bg-transparent p-0 text-[11px] text-zinc-500 focus:outline-none focus:ring-0"
          >
            {groupActivityTypes(types).map((group) => (
              <optgroup key={group.id} label={group.label}>
                {group.items.map((type) => (
                  <option key={type.id ?? type.slug} value={type.slug}>
                    {type.label}
                  </option>
                ))}
              </optgroup>
            ))}
            <option value={ADD_NEW_VALUE}>Add new…</option>
          </select>

          {isDocument ? (
            <span className="hidden text-[11px] text-zinc-400 sm:inline">
              Opens the editor — qty and amounts. Generate the Google Doc after.
            </span>
          ) : null}

          <div className="ml-auto flex items-center gap-2">
            {isDocument ? null : (
              <button
                type="button"
                title={
                  driveConnected
                    ? "Attach a file"
                    : "Connect Google Drive in Settings first"
                }
                disabled={!driveConnected || loading}
                onClick={open}
                className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zoom-dark disabled:opacity-40"
              >
                <PaperClipIcon className="size-3.5" />
                Attach
              </button>
            )}
            <Button
              type="button"
              disabled={loading || !canSave}
              onClick={onSubmit}
              className="!px-2.5 !py-1 !text-xs"
            >
              {loading ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>

        {isDocument ? (
          <p className="text-[11px] text-zinc-500">
            Save to enter quantities. Generate the Google Doc when the numbers
            are ready.
          </p>
        ) : (
          <div className="flex items-start gap-2">
            <TextareaAutosize
              id="operation-composer"
              ref={textareaRef}
              minRows={1}
              maxRows={8}
              value={body}
              onChange={(event) => onBodyChange(event.target.value)}
              placeholder="What happened?"
              className="block min-w-0 flex-1 resize-none rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-sm leading-snug text-zinc-800 shadow-none placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none focus:ring-0"
            />
            {asksAmount ? (
              <input
                value={amount}
                onChange={(event) => onAmountChange(event.target.value)}
                inputMode="decimal"
                placeholder="BHD"
                aria-label="Amount"
                className="h-[34px] w-24 shrink-0 rounded-md border border-zinc-200 bg-white px-2 text-sm tabular-nums text-zinc-800 placeholder:text-zinc-400 focus:border-zinc-300 focus:outline-none"
              />
            ) : null}
          </div>
        )}

        {pendingFiles.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => (
              <span
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm text-zoom-dark ring-1 ring-zinc-200"
              >
                {file.name}
                <button
                  type="button"
                  className="text-lg text-zinc-400 hover:text-red-600"
                  onClick={() =>
                    onPendingFilesChange(
                      pendingFiles.filter((_, i) => i !== index),
                    )
                  }
                  aria-label={`Remove ${file.name}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <Dialog open={addTypeOpen} onClose={setAddTypeOpen} size="sm">
        <DialogTitle>Add new type</DialogTitle>
        <DialogDescription>
          Saved for everyone. Invoice types later collect money in; cost types
          collect money out.
        </DialogDescription>
        <DialogBody>
          <div className="space-y-4">
            <Field>
              <Label>Type name</Label>
              <Input
                autoFocus
                value={newTypeName}
                onChange={(event) => setNewTypeName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    void addNewType();
                  }
                }}
                placeholder="e.g. Follow-up"
              />
            </Field>
            <Field>
              <Label>Tagging</Label>
              <select
                value={newMoneyKind}
                onChange={(event) =>
                  setNewMoneyKind(
                    event.target.value as OperationActivityMoneyKind,
                  )
                }
                className="mt-1 h-9 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zoom-dark shadow-sm focus:border-zoom-light focus:outline-none focus:ring-2 focus:ring-zoom-light/30"
              >
                {moneyKindOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {option.help}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </DialogBody>
        <DialogActions>
          <Button
            plain
            onClick={() => {
              setAddTypeOpen(false);
              setNewTypeName("");
              setNewMoneyKind("none");
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void addNewType()}
            disabled={!newTypeName.trim() || savingType}
          >
            {savingType ? "Saving…" : "Add type"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
