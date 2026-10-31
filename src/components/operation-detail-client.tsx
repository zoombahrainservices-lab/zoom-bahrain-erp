"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  EllipsisHorizontalIcon,
  PaperClipIcon,
  PencilSquareIcon,
} from "@heroicons/react/20/solid";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import TextareaAutosize from "react-textarea-autosize";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Select } from "@/components/catalyst/select";
import { OperationEntryAttachments } from "@/components/operation-entry-attachments";
import {
  DocumentStageTrack,
  OperationDocumentPipeline,
} from "@/components/operation-document-pipeline";
import { FilterPills } from "@/components/filter-pills";
import { OperationMoneyStrip } from "@/components/operation-money-strip";
import { OperationPulseBar } from "@/components/operation-pulse-bar";
import { OperationShortcuts } from "@/components/operation-shortcuts";
import { OrganizationLogo } from "@/components/organization-logo";
import { OperationThreadComposer } from "@/components/operation-thread-composer";
import { ReachChips } from "@/components/reach-chips";
import type { RelatedOperations } from "@/lib/create-operation";
import { buildOperationBriefing } from "@/lib/operation-briefing";
import { getOperationMoney, hasOperationMoney } from "@/lib/operation-money";
import {
  getOperationPulse,
  operationStory,
  type PulseAction,
} from "@/lib/operation-pulse";
import { collectReach } from "@/lib/phone";
import {
  clearOperationDraft,
  getOperationDraft,
  getOperationSeenAt,
  markOperationSeen,
  saveOperationDraft,
} from "@/lib/workspace-memory";
import {
  getDivisionName,
  getEntryTypeLabel,
  getOperationPartyLabel,
  getOperationStatusLabel,
  type OperationDocumentStage,
  type OperationEntryFileRecord,
  type OperationEntryRecord,
  type OperationEntryType,
  type OperationRecord,
} from "@/lib/operation-fields";
import {
  defaultOperationActivityTypes,
  type OperationActivityTypeRecord,
} from "@/lib/operation-activity-types";
import { isCommercialDocumentType, resolveDocumentStage, commercialDocumentPath } from "@/lib/operation-documents";
import { getDivisionMeta, getEntryTypeStyle } from "@/lib/operation-thread-ui";
import { formatActivityDate, formatBhd, formatDate, formatRelativeTime, parseMoneyAmount, todayInputDate } from "@/lib/utils";

type UserOption = {
  id: string;
  name: string;
};

function uniqueEntriesById(list: OperationEntryRecord[]) {
  const seen = new Set<string>();
  const unique: OperationEntryRecord[] = [];
  for (const item of list) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

type OperationDetailClientProps = {
  initialOperation: OperationRecord;
  users: UserOption[];
  driveConnected: boolean;
  related?: RelatedOperations;
};

const threadFilters = ["all", "todo", "call", "money", "file"] as const;

function statusBadgeColor(status: string) {
  if (status === "active") return "blue" as const;
  if (status === "completed") return "green" as const;
  return "zinc" as const;
}

export function OperationDetailClient({
  initialOperation,
  users,
  driveConnected,
  related,
}: OperationDetailClientProps) {
  const router = useRouter();
  const [operation, setOperation] = useState(initialOperation);
  const [entries, setEntries] = useState<OperationEntryRecord[]>(() =>
    uniqueEntriesById(initialOperation.entries ?? []),
  );
  const savingRef = useRef(false);
  const [entryType, setEntryType] = useState<OperationEntryType>("note");
  const [activityDate, setActivityDate] = useState(todayInputDate);
  const [body, setBody] = useState("");
  const [amount, setAmount] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [activityTypes, setActivityTypes] = useState<
    OperationActivityTypeRecord[]
  >(
    defaultOperationActivityTypes.map((type) => ({
      id: `seed-${type.slug}`,
      ...type,
    })),
  );
  const [threadFilter, setThreadFilter] =
    useState<(typeof threadFilters)[number]>("all");
  const skipDraftSaveRef = useRef(true);
  const [seenAt, setSeenAt] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadTypes() {
      try {
        const response = await fetch("/api/operation-activity-types");
        const data = (await response.json()) as {
          types?: OperationActivityTypeRecord[];
        };
        if (!cancelled && data.types?.length) {
          setActivityTypes(data.types);
        }
      } catch {
        // Keep the built-in list if the table is not migrated yet.
      }
    }

    void loadTypes();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const draft = getOperationDraft(operation.id);
    if (draft?.body) setBody(draft.body);
    if (draft?.entryType) setEntryType(draft.entryType);
    if (draft?.amount) setAmount(draft.amount);
    skipDraftSaveRef.current = true;
  }, [operation.id]);

  useEffect(() => {
    if (skipDraftSaveRef.current) {
      skipDraftSaveRef.current = false;
      return;
    }
    saveOperationDraft(operation.id, { body, entryType, amount });
  }, [operation.id, body, entryType, amount]);

  useEffect(() => {
    setSeenAt(getOperationSeenAt(operation.id));
    const timer = window.setTimeout(() => markOperationSeen(operation.id), 800);
    return () => window.clearTimeout(timer);
  }, [operation.id]);

  const division = getDivisionMeta(operation.divisionId);
  const threadEntries = entries.filter(
    (entry) => !isCommercialDocumentType(entry.entryType),
  );
  const pulse = useMemo(
    () => getOperationPulse(operation, entries),
    [operation, entries],
  );
  const story = operationStory(operation, pulse);
  const money = useMemo(
    () => getOperationMoney(entries, activityTypes),
    [entries, activityTypes],
  );
  const briefing = useMemo(
    () => buildOperationBriefing(operation, pulse, entries),
    [operation, pulse, entries],
  );
  const visibleThread = useMemo(() => {
    return threadEntries.filter((entry) => {
      if (threadFilter === "todo") return entry.entryType === "task";
      if (threadFilter === "call") return entry.entryType === "meeting";
      if (threadFilter === "money") {
        return Boolean(entry.amount) || entry.entryType === "cost";
      }
      if (threadFilter === "file") return (entry.files?.length ?? 0) > 0;
      return true;
    });
  }, [threadEntries, threadFilter]);
  const reach = collectReach({
    mobilesJson:
      operation.contact?.mobiles || operation.organization?.companyPhones,
    emailsJson: operation.contact?.emails,
    phones: [
      operation.organization?.companyPhone,
      operation.organization?.phone,
    ],
    emails: [
      operation.organization?.salesEmail,
      operation.organization?.email,
    ],
  });

  function handlePulseAction(action: PulseAction) {
    if (action.kind === "open") {
      router.push(action.href);
      return;
    }

    if (action.kind === "composer") {
      setEntryType(action.entryType);
      toast.message("Write it below");
      window.dispatchEvent(new Event("zoom-focus-composer"));
      return;
    }

    void createEntry(
      {
        entryType: action.entryType,
        body: "",
        activityDate: todayInputDate(),
        parentEntryId: action.parentEntryId,
      },
      { attachPending: false },
    );
  }

  async function uploadFilesToEntry(entryId: string, filesToUpload: File[]) {
    const uploaded: OperationEntryFileRecord[] = [];

    for (const file of filesToUpload) {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `/api/operations/${operation.id}/entries/${entryId}/files`,
        { method: "POST", body: formData },
      );
      const data = (await response.json()) as {
        file?: OperationEntryFileRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to upload file");
      }

      if (data.file) {
        uploaded.push(data.file);
      }
    }

    return uploaded;
  }

  async function handleCreateEntry() {
    if (savingRef.current || loading) return;

    if (
      !body.trim() &&
      pendingFiles.length === 0 &&
      !isCommercialDocumentType(entryType) &&
      !parseMoneyAmount(amount)
    ) {
      return;
    }

    const money = parseMoneyAmount(amount);
    await createEntry(
      {
        entryType,
        body: isCommercialDocumentType(entryType)
          ? ""
          : body.trim() || (money ? "Cost" : ""),
        activityDate,
        amount: money ?? undefined,
      },
      { attachPending: !isCommercialDocumentType(entryType) },
    );
  }

  async function createInvoiceFromQuotation(quotation: OperationEntryRecord) {
    const existing = entries.find(
      (item) =>
        item.entryType === "invoice" && item.parentEntryId === quotation.id,
    );
    if (existing) {
      openDocument(existing);
      toast.message("An invoice for this quotation already exists");
      return;
    }

    await createEntry(
      {
        entryType: "invoice",
        body: "",
        activityDate: todayInputDate(),
        parentEntryId: quotation.id,
      },
      { attachPending: false },
    );
  }

  async function createEntry(
    input: {
      entryType: OperationEntryType;
      body: string;
      activityDate: string;
      parentEntryId?: string;
      amount?: number;
      unitAmountMultiplier?: number;
    },
    options?: { attachPending?: boolean },
  ) {
    if (savingRef.current || loading) return;
    if (
      !input.body.trim() &&
      pendingFiles.length === 0 &&
      !isCommercialDocumentType(input.entryType) &&
      input.amount === undefined
    ) {
      return;
    }

    savingRef.current = true;
    setLoading(true);

    try {
      const response = await fetch(`/api/operations/${operation.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: input.entryType,
          body: input.body,
          activityDate: input.activityDate,
          parentEntryId: input.parentEntryId,
          amount: input.amount,
          unitAmountMultiplier: input.unitAmountMultiplier,
        }),
      });

      const data = (await response.json()) as {
        entry?: OperationEntryRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create entry");
      }

      if (data.entry) {
        let entry = data.entry;

        if (options?.attachPending !== false && pendingFiles.length > 0 && driveConnected) {
          const uploaded = await uploadFilesToEntry(entry.id, pendingFiles);
          entry = { ...entry, files: [...uploaded, ...(entry.files ?? [])] };
        }

        setEntries((current) => uniqueEntriesById([entry, ...current]));
        setBody("");
        setAmount("");
        setPendingFiles([]);
        setEntryType("note");
        setActivityDate(todayInputDate());
        clearOperationDraft(operation.id);

        if (isCommercialDocumentType(entry.entryType)) {
          router.push(commercialDocumentPath(operation.id, entry.id));
          return;
        }

        toast.success("Update saved");
      }
    } catch (createError) {
      toast.error(
        createError instanceof Error
          ? createError.message
          : "Failed to create entry",
      );
    } finally {
      savingRef.current = false;
      setLoading(false);
    }
  }

  async function updateEntry(
    entryId: string,
    patch: {
      body?: string;
      status?: "open" | "done";
      assignedToId?: string | null;
      documentStage?: OperationDocumentStage;
    },
  ) {
    const response = await fetch(
      `/api/operations/${operation.id}/entries/${entryId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      },
    );

    const data = (await response.json()) as {
      entry?: OperationEntryRecord;
      error?: string;
      postingNote?: string;
    };

    if (!response.ok) {
      throw new Error(data.error ?? "Failed to update entry");
    }
    if (data.postingNote) toast.message(data.postingNote);

    if (data.entry) {
      setEntries((current) =>
        uniqueEntriesById(
          current.map((entry) =>
            entry.id === entryId
              ? { ...data.entry!, files: entry.files ?? data.entry!.files }
              : entry,
          ),
        ),
      );
    }
  }

  function openDocument(entry: OperationEntryRecord) {
    router.push(commercialDocumentPath(operation.id, entry.id));
  }

  async function reviseDocument(entry: OperationEntryRecord) {
    const existingRevision = entries.find(
      (item) =>
        item.parentEntryId === entry.id && item.entryType === entry.entryType,
    );

    if (existingRevision) {
      openDocument(existingRevision);
      toast.message("That revision already exists");
      return;
    }

    try {
      if (entry.documentStage !== "revised") {
        await updateEntry(entry.id, { documentStage: "revised" });
      }

      const response = await fetch(`/api/operations/${operation.id}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryType: entry.entryType,
          body: entry.body,
          activityDate: todayInputDate(),
          parentEntryId: entry.id,
        }),
      });
      const data = (await response.json()) as {
        entry?: OperationEntryRecord;
        error?: string;
      };

      if (!response.ok || !data.entry) {
        throw new Error(data.error ?? "Failed to open a revision");
      }

      setEntries((current) => uniqueEntriesById([data.entry!, ...current]));
      router.push(commercialDocumentPath(operation.id, data.entry.id));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to revise",
      );
    }
  }

  async function moveDocumentStage(
    entryId: string,
    stage: OperationDocumentStage,
  ) {
    const entry = entries.find((item) => item.id === entryId);
    if (!entry) return;
    if (resolveDocumentStage(entry.entryType, entry.documentStage) === stage) {
      return;
    }

    try {
      await updateEntry(entryId, { documentStage: stage });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to move stage",
      );
    }
  }

  async function patchOperation(patch: {
    status?: "active" | "completed" | "cancelled";
    assignedToId?: string | null;
  }) {
    setLoading(true);

    try {
      const response = await fetch(`/api/operations/${operation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = (await response.json()) as {
        operation?: OperationRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update operation");
      }

      if (data.operation) {
        setOperation(data.operation);
        toast.success(
          patch.status === "completed"
            ? "Operation marked as finished"
            : "Operation updated",
        );
      }
    } catch (updateError) {
      toast.error(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update operation",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-svh w-full flex-col">
      <div className="border-b border-zinc-200 bg-white">
        <div className="px-6 pt-2 lg:px-10">
          <Button href="/operations" plain className="!-ml-2 !px-2">
            <ArrowLeftIcon data-slot="icon" />
            Operations
          </Button>
        </div>

        <header className="px-6 pb-3 pt-1 lg:px-10">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <button
                type="button"
                className="font-mono text-[11px] tracking-wide text-zinc-500 hover:text-zoom-navy"
                onClick={() => {
                  void navigator.clipboard.writeText(operation.operationCode);
                  toast.success("Code copied");
                }}
              >
                {operation.operationCode}
              </button>

              <h1 className="mt-0.5 text-xl font-semibold leading-tight text-zoom-navy">
                {operation.title}
              </h1>

              <p className="mt-0.5 text-sm text-zinc-600">
                {getOperationPartyLabel(operation)}
              </p>

              <p className="mt-0.5 text-xs text-zinc-500">{story}</p>

              {operation.contact?.name &&
              operation.organization &&
              operation.contact.name !== operation.organization.name ? (
                <p className="mt-0.5 text-xs text-zinc-500">
                  Contact: {operation.contact.name}
                  {operation.contact.contactCode
                    ? ` · ${operation.contact.contactCode}`
                    : ""}
                </p>
              ) : null}

              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-zoom-palest px-2 py-0.5 text-xs font-medium text-zoom-dark ring-1 ring-zoom-pale">
                  <span className="font-mono text-[10px] text-zoom-medium">
                    {division.acronym}
                  </span>
                  {getDivisionName(operation.divisionId)}
                </span>
                <ReachChips
                  phone={reach.phone}
                  email={reach.email}
                  message={`Hi, following up on ${operation.operationCode} — ${operation.title}`}
                  subject={`${operation.operationCode} ${operation.title}`}
                />
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-2">
              <OperationShortcuts
                operation={{
                  id: operation.id,
                  title: operation.title,
                  operationCode: operation.operationCode,
                }}
                briefing={briefing}
              />
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Badge color={statusBadgeColor(operation.status)}>
                  {getOperationStatusLabel(operation.status)}
                </Badge>
                {operation.status === "active" ? (
                  <Button
                    type="button"
                    outline
                    disabled={loading}
                    onClick={() => void patchOperation({ status: "completed" })}
                  >
                    <CheckCircleIcon data-slot="icon" />
                    Mark as done
                  </Button>
                ) : null}
              </div>

              <div className="flex h-10 flex-wrap items-center justify-end gap-3">
                {operation.organization?.logoDriveFileId ? (
                  <OrganizationLogo
                    organizationId={operation.organization.id}
                    name={operation.organization.name}
                    hasLogo
                    size="header"
                    className="!h-10 object-right"
                  />
                ) : null}

                {division.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={division.logo}
                    alt={division.name}
                    className="h-10 w-auto object-contain object-right"
                  />
                ) : (
                  <span className="text-sm font-bold text-zoom-dark">
                    {division.acronym}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 border-t border-zinc-100 pt-2 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1">
              Owner
              <select
                aria-label="Owner"
                className="border-0 bg-transparent p-0 text-xs font-medium text-zoom-dark focus:outline-none"
                value={operation.assignedToId ?? ""}
                disabled={loading}
                onChange={(event) =>
                  void patchOperation({
                    assignedToId: event.target.value || null,
                  })
                }
              >
                <option value="">Unassigned</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </span>
            <span>
              Created{" "}
              <strong className="font-medium text-zoom-dark">
                {formatDate(operation.createdAt)}
              </strong>
            </span>
            <span>
              Updated{" "}
              <strong className="font-medium text-zoom-dark">
                {formatRelativeTime(operation.updatedAt) || formatDate(operation.updatedAt)}
              </strong>
            </span>
            <span>
              Opened by{" "}
              <strong className="font-medium text-zoom-dark">
                {operation.createdBy?.name ?? "—"}
              </strong>
            </span>
            <span>
              <strong className="font-medium text-zoom-dark">
                {entries.length}
              </strong>{" "}
              {entries.length === 1 ? "update" : "updates"}
            </span>
          </div>

          <OperationPulseBar pulse={pulse} onAction={handlePulseAction} />
          {hasOperationMoney(money) ? <OperationMoneyStrip money={money} /> : null}

          {related?.operations.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-medium text-zinc-600">
                {related.reason === "person" ? "Same person" : "Same company"}
              </span>
              {related.operations.map((item) => (
                <a
                  key={item.id}
                  href={`/operations/${item.id}`}
                  className="rounded-md bg-zinc-50 px-2 py-0.5 text-zoom-dark ring-1 ring-zinc-200 hover:bg-zoom-palest"
                >
                  {item.operationCode} · {item.title}
                </a>
              ))}
            </div>
          ) : null}
        </header>
      </div>

      <div className="sticky top-0 z-20">
        <OperationThreadComposer
          entryType={entryType}
          activityDate={activityDate}
          body={body}
          amount={amount}
          pendingFiles={pendingFiles}
          loading={loading}
          driveConnected={driveConnected}
          types={activityTypes}
          onEntryTypeChange={(type) => {
            setEntryType(type);
            if (
              activityTypes.find((item) => item.slug === type)?.moneyKind !==
              "out"
            ) {
              setAmount("");
            }
          }}
          onActivityDateChange={setActivityDate}
          onBodyChange={setBody}
          onAmountChange={setAmount}
          onPendingFilesChange={setPendingFiles}
          onTypeCreated={(type) => {
            setActivityTypes((current) =>
              current.some((item) => item.slug === type.slug)
                ? current
                : [...current, type],
            );
          }}
          onSubmit={() => void handleCreateEntry()}
        />
      </div>

      <OperationDocumentPipeline
        entries={entries}
        onStageChange={(entryId, stage) =>
          void moveDocumentStage(entryId, stage)
        }
        onOpenDocument={openDocument}
        onRevise={(entry) => void reviseDocument(entry)}
        onCreateInvoice={(quotation) => createInvoiceFromQuotation(quotation)}
      />

      <div className="flex-1">
        {threadEntries.length > 0 ? (
          <div className="border-b border-zinc-100 px-6 py-2 lg:px-10">
            <FilterPills
              value={threadFilter}
              onChange={setThreadFilter}
              options={[
                { value: "all", label: "All" },
                { value: "todo", label: "To-dos" },
                { value: "call", label: "Calls" },
                { value: "money", label: "Money" },
                { value: "file", label: "Files" },
              ]}
            />
          </div>
        ) : null}
        {visibleThread.length === 0 ? (
          <p className="bg-white px-6 py-8 text-center text-sm text-zinc-500 lg:px-10">
            {threadEntries.length > 0
              ? "Nothing in this filter."
              : entries.length > 0
                ? "Documents sit in the stages above. Notes and calls will show here."
                : "No updates yet. Use the form above to add the first one."}
          </p>
        ) : (
          <ul>
            <AnimatePresence initial={false}>
              {visibleThread.map((entry, index) => (
                <motion.li
                  key={entry.id}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <EntryRow
                    operationId={operation.id}
                    entry={entry}
                    isNew={
                      Boolean(
                        seenAt &&
                          new Date(entry.createdAt).getTime() >
                            new Date(seenAt).getTime(),
                      )
                    }
                    isOpeningEntry={
                      entry.id === threadEntries[threadEntries.length - 1]?.id
                    }
                    isAlternate={index % 2 === 1}
                    users={users}
                    driveConnected={driveConnected}
                    activityTypes={activityTypes}
                    onOpenDocument={() => openDocument(entry)}
                    onStageChange={(stage) =>
                      void moveDocumentStage(entry.id, stage)
                    }
                    onBodySave={async (nextBody) => {
                      try {
                        await updateEntry(entry.id, { body: nextBody });
                        toast.success("Saved");
                      } catch {
                        toast.error("Failed to save");
                      }
                    }}
                    onToggleTaskStatus={() =>
                      void updateEntry(entry.id, {
                        status: entry.status === "done" ? "open" : "done",
                      })
                    }
                    onAssigneeChange={(nextAssignedToId) =>
                      void updateEntry(entry.id, {
                        assignedToId: nextAssignedToId,
                      })
                    }
                    onFilesChange={(files) => {
                      setEntries((current) =>
                        current.map((item) =>
                          item.id === entry.id ? { ...item, files } : item,
                        ),
                      );
                    }}
                  />
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}

function EntryRow({
  operationId,
  entry,
  isNew = false,
  isOpeningEntry = false,
  isAlternate = false,
  users,
  driveConnected,
  activityTypes,
  onOpenDocument,
  onStageChange,
  onBodySave,
  onToggleTaskStatus,
  onAssigneeChange,
  onFilesChange,
}: {
  operationId: string;
  entry: OperationEntryRecord;
  isNew?: boolean;
  isOpeningEntry?: boolean;
  isAlternate?: boolean;
  users: UserOption[];
  driveConnected: boolean;
  activityTypes: OperationActivityTypeRecord[];
  onOpenDocument: () => void;
  onStageChange: (stage: OperationDocumentStage) => void;
  onBodySave: (body: string) => void | Promise<void>;
  onToggleTaskStatus: () => void;
  onAssigneeChange: (assignedToId: string) => void;
  onFilesChange: (files: OperationEntryFileRecord[]) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [body, setBody] = useState(entry.body);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reassignOpen, setReassignOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(
    (entry.files?.length ?? 0) > 0,
  );

  useEffect(() => {
    setBody(entry.body);
  }, [entry.body]);

  const assigneeName = entry.assignedTo?.name ?? "Unknown";
  const typeStyle = getEntryTypeStyle(entry.entryType);

  async function saveBody() {
    if (body.trim() !== entry.body.trim()) {
      await onBodySave(body);
    }
    setEditing(false);
  }

  return (
    <article
      className={`group px-6 py-1.5 lg:px-10 ${
        isOpeningEntry
          ? "bg-zoom-palest/55"
          : isAlternate
            ? "bg-zinc-100/50"
            : "bg-white"
      }`}
    >
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <span className="text-xs font-semibold text-zoom-navy">
              {formatActivityDate(entry.activityDate)}
            </span>
            <span className="text-xs text-zoom-dark">{assigneeName}</span>
            <span
              className={`inline-flex items-center rounded px-1 py-px text-[10px] font-medium ${typeStyle.chip}`}
            >
              {getEntryTypeLabel(entry.entryType, activityTypes)}
            </span>
            {isNew ? (
              <span className="rounded bg-amber-100 px-1 py-px text-[10px] font-medium text-amber-900">
                New
              </span>
            ) : null}
            {isOpeningEntry ? (
              <span className="rounded bg-zoom-dark px-1 py-px text-[10px] font-medium text-white">
                Opened
              </span>
            ) : null}
            {entry.amount ? (
              <span className="text-xs tabular-nums text-zoom-navy">
                {formatBhd(entry.amount)}
              </span>
            ) : null}
            {entry.entryType === "task" ? (
              <button
                type="button"
                onClick={onToggleTaskStatus}
                className={`text-[10px] font-medium ${
                  entry.status === "done"
                    ? "text-emerald-600"
                    : "text-zoom-light hover:underline"
                }`}
              >
                {entry.status === "done" ? "Done" : "Mark done"}
              </button>
            ) : null}
            {isCommercialDocumentType(entry.entryType) ? (
              <button
                type="button"
                onClick={onOpenDocument}
                className="text-[10px] font-medium text-zoom-light hover:underline"
              >
                Open Doc
              </button>
            ) : null}
          </div>

          <div className="relative flex shrink-0 items-center">
            <button
              type="button"
              onClick={() => setAttachOpen(true)}
              className="rounded p-0.5 text-zinc-400 hover:text-zoom-dark"
              aria-label="Attach"
              title="Attach"
            >
              <PaperClipIcon className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded px-1 py-0.5 text-[11px] font-medium text-zoom-medium hover:bg-white"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded p-0.5 text-zinc-400 hover:bg-white hover:text-zinc-600"
              aria-label="More actions"
            >
              <EllipsisHorizontalIcon className="size-4" />
            </button>
            {menuOpen ? (
              <div className="absolute right-0 z-10 mt-7 w-40 rounded-lg bg-white py-1 shadow-lg ring-1 ring-zinc-200">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-zinc-50"
                  onClick={() => {
                    setReassignOpen(true);
                    setMenuOpen(false);
                  }}
                >
                  Change owner
                </button>
              </div>
            ) : null}
          </div>
        </header>

        {isCommercialDocumentType(entry.entryType) ? (
          <DocumentStageTrack
            entryType={entry.entryType}
            stage={entry.documentStage}
            onStageChange={onStageChange}
          />
        ) : null}

        <div className="mt-0.5">
          {editing ? (
            <TextareaAutosize
              autoFocus
              minRows={1}
              maxRows={16}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              onBlur={() => void saveBody()}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setBody(entry.body);
                  setEditing(false);
                }
              }}
              className="w-full resize-none rounded border border-zinc-300 bg-white px-2 py-1 text-xs leading-snug text-zinc-800 focus:border-zoom-light focus:outline-none"
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full text-left"
            >
              {entry.body.trim() ? (
                <p className="whitespace-pre-wrap text-xs leading-snug text-zinc-800">
                  {entry.body}
                </p>
              ) : (
                <p className="flex items-center gap-1 text-xs text-zinc-400">
                  <PencilSquareIcon className="size-3" />
                  Add discussion…
                </p>
              )}
            </button>
          )}

          {attachOpen || (entry.files?.length ?? 0) > 0 ? (
            <OperationEntryAttachments
              operationId={operationId}
              entryId={entry.id}
              driveConnected={driveConnected}
              initialFiles={entry.files}
              compact
              hideIdleTrigger
              onFilesChange={onFilesChange}
            />
          ) : null}
        </div>

        {reassignOpen ? (
          <div className="mt-1 flex items-center gap-2 text-xs">
            <Select
              className="!py-1 !text-xs"
              value={entry.assignedToId ?? ""}
              onChange={(event) => {
                onAssigneeChange(event.target.value);
                setReassignOpen(false);
              }}
            >
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </Select>
            <button
              type="button"
              className="text-zinc-500 hover:underline"
              onClick={() => setReassignOpen(false)}
            >
              Cancel
            </button>
          </div>
        ) : entry.createdBy?.name &&
          entry.createdBy.name !== assigneeName ? (
          <p className="mt-0.5 text-[11px] text-zinc-400">
            Posted by {entry.createdBy.name}
          </p>
        ) : null}
      </div>
    </article>
  );
}
