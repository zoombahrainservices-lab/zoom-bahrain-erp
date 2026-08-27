"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { CoreModelNote } from "@/components/core-model-note";
import { FilterPills } from "@/components/filter-pills";
import { ListSearch, useListQuery } from "@/components/list-search";
import {
  formatContactKinds,
  getContactDisplayName,
  getContactKinds,
  type ContactRecord,
} from "@/lib/contact-fields";
import { getActivityTypeLabel } from "@/lib/operation-activity-types";
import { commercialDocumentPath, isCommercialDocumentType } from "@/lib/operation-documents";
import { getDivisionLabel, getOperationPartyLabel } from "@/lib/operation-fields";
import { formatBhd, formatDate, matchesQuery, todayInputDate } from "@/lib/utils";
import type { WorkDesk, WorkStartAction } from "@/lib/work-desks";

type PartyOrg = { id: string; name: string; orgCode: string | null };
type PartyContact = {
  id: string;
  name: string | null;
  contactCode: string;
  organization?: { name?: string | null } | null;
};

export type DeskOperationRow = {
  id: string;
  operationCode: string;
  title: string;
  status: string;
  divisionId: string;
  createdAt: Date | string;
  organization?: { name?: string | null } | null;
  contact?: { name?: string | null; contactCode?: string | null } | null;
  assignedTo?: { name?: string | null } | null;
};

export type DeskEntryRow = {
  id: string;
  entryType: string;
  amount?: string | number | null;
  activityDate: Date | string;
  operation: {
    id: string;
    operationCode: string;
    title: string;
    divisionId: string;
    organization?: { name?: string | null } | null;
    contact?: { name?: string | null; contactCode?: string | null } | null;
  } | null;
};

export type DeskTaskRow = {
  id: string;
  title: string;
  status: string;
  dueDate: Date | string | null;
  operation: { id: string; operationCode: string; title: string } | null;
  assignedTo?: { name?: string | null } | null;
};

type WorkDeskClientProps = {
  desk: WorkDesk;
  operations?: DeskOperationRow[];
  entries?: DeskEntryRow[];
  tasks?: DeskTaskRow[];
  people?: ContactRecord[];
  activeOperations?: DeskOperationRow[];
  organizations: PartyOrg[];
  contacts: PartyContact[];
  canManage: boolean;
  canManageContacts?: boolean;
};

export function WorkDeskClient({
  desk,
  operations = [],
  entries = [],
  tasks = [],
  people = [],
  activeOperations = [],
  organizations,
  contacts,
  canManage,
  canManageContacts = false,
}: WorkDeskClientProps) {
  const router = useRouter();
  const [search] = useListQuery();
  const [actionId, setActionId] = useState(desk.starts[0]?.id ?? "");
  const [partyId, setPartyId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [peopleFilter, setPeopleFilter] = useState<
    "all" | "staff" | "candidate" | "contractor" | "person"
  >("all");

  const action = desk.starts.find((item) => item.id === actionId) ?? desk.starts[0];

  const filteredOperations = useMemo(
    () =>
      operations.filter((operation) =>
        matchesQuery(
          [
            operation.title,
            operation.operationCode,
            getOperationPartyLabel(operation),
            getDivisionLabel(operation.divisionId),
          ],
          search,
        ),
      ),
    [operations, search],
  );

  const filteredEntries = useMemo(
    () =>
      entries.filter((entry) =>
        matchesQuery(
          [
            entry.entryType,
            getActivityTypeLabel(entry.entryType),
            String(entry.amount ?? ""),
            entry.operation?.title,
            entry.operation?.operationCode,
            entry.operation ? getOperationPartyLabel(entry.operation) : "",
          ],
          search,
        ),
      ),
    [entries, search],
  );

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) =>
        matchesQuery(
          [task.title, task.status, task.operation?.title, task.operation?.operationCode],
          search,
        ),
      ),
    [tasks, search],
  );

  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      const kinds = getContactKinds(person);
      if (peopleFilter === "staff" && !kinds.includes("staff")) return false;
      if (peopleFilter === "candidate" && !kinds.includes("candidate")) return false;
      if (peopleFilter === "contractor" && !kinds.includes("contractor")) {
        return false;
      }
      if (peopleFilter === "person" && kinds.length > 0) return false;
      return matchesQuery(
        [
          getContactDisplayName(person),
          person.contactCode,
          person.position,
          person.organization?.name,
          formatContactKinds(kinds),
        ],
        search,
      );
    });
  }, [people, peopleFilter, search]);

  const attachExisting = action?.attachTo === "existing";

  async function startWork(
    event?: React.FormEvent,
    nextPartyId = partyId,
    nextAction = action,
  ) {
    event?.preventDefault();
    if (!nextAction) return;
    const existing = nextAction.attachTo === "existing";
    if (existing && !operationId) return;
    if (!existing && !nextPartyId) return;

    const partyName =
      nextAction.party === "organization"
        ? organizations.find((item) => item.id === nextPartyId)?.name
        : contacts.find((item) => item.id === nextPartyId)?.name ??
          contacts.find((item) => item.id === nextPartyId)?.contactCode;

    setLoading(true);
    setError("");

    try {
      if (existing) {
        if (nextAction.entryType === "task") {
          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: title.trim() || nextAction.titlePrefix,
              operationId,
            }),
          });
          const data = (await response.json()) as { error?: string };
          if (!response.ok) {
            throw new Error(data.error ?? "Failed to add to-do");
          }
          router.push(`/operations/${operationId}`);
          router.refresh();
          return;
        }

        const response = await fetch(`/api/operations/${operationId}/entries`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            entryType: nextAction.entryType,
            body: title.trim() || nextAction.titlePrefix,
            activityDate: todayInputDate(),
          }),
        });
        const data = (await response.json()) as {
          entry?: { id: string };
          error?: string;
        };
        if (!response.ok) {
          throw new Error(data.error ?? "Failed to add to operation");
        }
        const href =
          data.entry && isCommercialDocumentType(nextAction.entryType)
            ? commercialDocumentPath(operationId, data.entry.id)
            : `/operations/${operationId}`;
        router.push(href);
        router.refresh();
        return;
      }

      if (nextAction.markKind && canManageContacts && nextAction.party === "contact") {
        const person = people.find((item) => item.id === nextPartyId);
        const kinds = new Set(person ? getContactKinds(person) : []);
        kinds.add(nextAction.markKind);
        await fetch(`/api/contacts/${nextPartyId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ kinds: [...kinds] }),
        });
      }

      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId:
            nextAction.party === "organization" ? nextPartyId : undefined,
          contactId: nextAction.party === "contact" ? nextPartyId : undefined,
          divisionId: nextAction.divisionId,
          title:
            title.trim() ||
            `${nextAction.titlePrefix}${partyName ? ` · ${partyName}` : ""}`,
          entryType: nextAction.entryType,
        }),
      });
      const data = (await response.json()) as {
        operation?: { id: string };
        error?: string;
      };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to start operation");
      }
      if (data.operation?.id) {
        router.push(`/operations/${data.operation.id}`);
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to start operation",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <CoreModelNote extra={desk.blurb} />
      {desk.id === "accounting" ? (
        <div className="flex flex-wrap gap-2 text-xs">
          <a href="/quotation" className="text-zoom-dark hover:underline">
            Quotations
          </a>
          <a href="/invoice" className="text-zoom-dark hover:underline">
            Invoices
          </a>
          <a href="/proposal" className="text-zoom-dark hover:underline">
            Proposals
          </a>
          <a href="/procurement" className="text-zoom-dark hover:underline">
            Procurement
          </a>
        </div>
      ) : null}

      {canManage && action ? (
        <form
          onSubmit={(event) => void startWork(event)}
          className="space-y-4 rounded-xl bg-white p-4 ring-1 ring-zinc-200"
        >
          <p className="text-sm font-medium text-zoom-dark">Start on an operation</p>
          <div className="flex flex-wrap gap-1">
            {desk.starts.map((item) => (
              <ActionPill
                key={item.id}
                action={item}
                selected={item.id === action.id}
                onSelect={() => {
                  setActionId(item.id);
                  setPartyId("");
                  setOperationId("");
                  setTitle("");
                }}
              />
            ))}
          </div>
          <p className="text-xs text-zinc-500">{action.how}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {attachExisting ? (
              <label className="text-xs font-medium text-zinc-500">
                Operation
                <select
                  value={operationId}
                  onChange={(event) => setOperationId(event.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zoom-dark"
                >
                  <option value="">Select operation</option>
                  {activeOperations.map((operation) => (
                    <option key={operation.id} value={operation.id}>
                      {operation.operationCode} · {operation.title}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label className="text-xs font-medium text-zinc-500">
                {action.party === "organization" ? "Company" : "Person"}
                <select
                  value={partyId}
                  onChange={(event) => setPartyId(event.target.value)}
                  required
                  className="mt-1 block w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zoom-dark"
                >
                  <option value="">
                    {action.party === "organization"
                      ? "Select organization"
                      : "Select contact"}
                  </option>
                  {action.party === "organization"
                    ? organizations.map((organization) => (
                        <option key={organization.id} value={organization.id}>
                          {organization.name}
                          {organization.orgCode
                            ? ` · ${organization.orgCode}`
                            : ""}
                        </option>
                      ))
                    : contacts.map((contact) => (
                        <option key={contact.id} value={contact.id}>
                          {contact.name ?? contact.contactCode}
                          {contact.organization?.name
                            ? ` · ${contact.organization.name}`
                            : ""}
                        </option>
                      ))}
                </select>
              </label>
            )}
            <label className="text-xs font-medium text-zinc-500">
              Title
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={`${action.titlePrefix} · …`}
                className="mt-1"
              />
            </label>
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button
            type="submit"
            disabled={loading || (attachExisting ? !operationId : !partyId)}
          >
            {loading
              ? "Opening…"
              : attachExisting
                ? "Add on operation"
                : "Open as operation"}
          </Button>
        </form>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ListSearch placeholder="Search this desk…" />
        {desk.people ? (
          <FilterPills
            value={peopleFilter}
            onChange={setPeopleFilter}
            options={[
              { value: "all", label: "All people" },
              { value: "staff", label: "Staff" },
              { value: "candidate", label: "Candidates" },
              { value: "contractor", label: "Contractors" },
              { value: "person", label: "People only" },
            ]}
          />
        ) : null}
      </div>

      {desk.people ? (
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              People
            </h2>
            {canManageContacts ? (
              <Button href="/contacts/new?kind=staff" outline className="!px-2 !py-1 text-xs">
                New person
              </Button>
            ) : null}
          </div>
          <div className="mt-2 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
            {filteredPeople.length === 0 ? (
              <p className="px-4 py-6 text-sm text-zinc-500">
                No people match. Register a contact first.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {filteredPeople.slice(0, 30).map((person) => {
                  const kinds = getContactKinds(person);
                  return (
                    <li
                      key={person.id}
                      className="flex items-center justify-between gap-3 px-4 py-2"
                    >
                      <a href={`/contacts/${person.id}`} className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-zoom-dark">
                          {getContactDisplayName(person)}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {person.contactCode}
                          {person.organization?.name
                            ? ` · ${person.organization.name}`
                            : " · no company"}
                        </span>
                      </a>
                      <div className="flex shrink-0 items-center gap-2">
                        {kinds.length > 0 ? (
                          <Badge color="blue">{formatContactKinds(kinds)}</Badge>
                        ) : (
                          <Badge color="zinc">Person</Badge>
                        )}
                        {canManage ? (
                          <Button
                            type="button"
                            outline
                            className="!px-2 !py-1 text-xs"
                            disabled={loading}
                            onClick={() => {
                              const hire = desk.starts.find((item) => item.id === "hire");
                              setActionId("hire");
                              setPartyId(person.id);
                              void startWork(undefined, person.id, hire);
                            }}
                          >
                            Work
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      ) : null}

      {desk.list.kind === "operations" ? (
        <DeskList
          title="Operations"
          empty={
            desk.starts.length > 0
              ? "No operations on this desk yet. Start one above."
              : "No operations on this desk yet."
          }
        >
          {filteredOperations.map((operation) => (
            <a
              key={operation.id}
              href={`/operations/${operation.id}`}
              className="block px-4 py-2 hover:bg-zinc-50"
            >
              <p className="text-sm font-medium text-zoom-dark">{operation.title}</p>
              <p className="text-xs text-zinc-500">
                {operation.operationCode} · {getOperationPartyLabel(operation)} ·{" "}
                {getDivisionLabel(operation.divisionId)}
              </p>
            </a>
          ))}
        </DeskList>
      ) : null}

      {desk.list.kind === "entries" || desk.list.kind === "money" ? (
        <DeskList
          title={desk.list.kind === "money" ? "Money on operations" : "Movements"}
          empty={
            attachExisting
              ? "Nothing here yet. Pick an operation above to add money on that file."
              : "Nothing on this desk yet. Start one above."
          }
        >
          {filteredEntries.map((entry) =>
            entry.operation ? (
              <a
                key={entry.id}
                href={`/operations/${entry.operation.id}`}
                className="block px-4 py-2 hover:bg-zinc-50"
              >
                <p className="text-sm font-medium text-zoom-dark">
                  {getActivityTypeLabel(entry.entryType)}
                  {entry.amount ? (
                    <span className="ml-2 font-normal tabular-nums text-zinc-500">
                      {formatBhd(entry.amount)}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-zinc-500">
                  {entry.operation.operationCode} · {entry.operation.title} ·{" "}
                  {getOperationPartyLabel(entry.operation)} ·{" "}
                  {formatDate(entry.activityDate)}
                </p>
              </a>
            ) : null,
          )}
        </DeskList>
      ) : null}

      {desk.list.kind === "tasks" ? (
        <DeskList
          title="To-dos on operations"
          empty="No to-dos yet. Add one above on an existing operation."
        >
          {filteredTasks.map((task) =>
            task.operation ? (
              <a
                key={task.id}
                href={`/operations/${task.operation.id}`}
                className="block px-4 py-2 hover:bg-zinc-50"
              >
                <p className="text-sm font-medium text-zoom-dark">{task.title}</p>
                <p className="text-xs text-zinc-500">
                  {task.operation.operationCode} · {task.operation.title}
                  {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ""}
                </p>
              </a>
            ) : (
              <p key={task.id} className="px-4 py-2 text-sm">
                {task.title}
              </p>
            ),
          )}
        </DeskList>
      ) : null}
    </div>
  );
}

function ActionPill({
  action,
  selected,
  onSelect,
}: {
  action: WorkStartAction;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        selected
          ? "rounded-md bg-zoom-dark px-2 py-1 text-xs font-medium text-white"
          : "rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
      }
    >
      {action.label}
    </button>
  );
}

function DeskList({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: React.ReactNode;
}) {
  const items = Array.isArray(children)
    ? children.filter(Boolean)
    : [children].filter(Boolean);

  return (
    <section>
      <h2 className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
        {title}
      </h2>
      <div className="mt-2 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
        {items.length === 0 ? (
          <p className="px-4 py-6 text-sm text-zinc-500">{empty}</p>
        ) : (
          <div className="divide-y divide-zinc-100">{children}</div>
        )}
      </div>
    </section>
  );
}
