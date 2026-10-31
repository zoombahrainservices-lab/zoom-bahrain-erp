import { Suspense } from "react";
import { redirect } from "next/navigation";

import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { WorkDeskClient } from "@/components/work-desk-client";
import {
  listActiveOperations,
  listDeskEntries,
  listDeskMoney,
  listDeskOperations,
  listDeskPeople,
  listDeskTasks,
  listPartyOptions,
} from "@/lib/list-work-desk";
import { canManageContacts, canManageOperations, isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";
import { getWorkDesk, type WorkDeskId } from "@/lib/work-desks";

export async function WorkDeskPage({
  deskId,
  hideTitle = false,
  initialStart,
}: {
  deskId: WorkDeskId;
  hideTitle?: boolean;
  initialStart?: string;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (isClientUser(session)) {
    return (
      <>
        <Heading>{getWorkDesk(deskId)?.title ?? "Desk"}</Heading>
        <Text className="mt-4">
          The client role does not have access to this section yet.
        </Text>
      </>
    );
  }

  const desk = getWorkDesk(deskId);
  if (!desk) redirect("/functions");

  const needsExisting = desk.starts.some((item) => item.attachTo === "existing");

  const [parties, operations, entries, tasks, people, activeOperations] =
    await Promise.all([
      listPartyOptions(),
      desk.list.kind === "operations"
        ? listDeskOperations(desk)
        : Promise.resolve([]),
      desk.list.kind === "entries" && desk.list.entryTypes
        ? listDeskEntries(desk.list.entryTypes)
        : desk.list.kind === "money"
          ? listDeskMoney()
          : Promise.resolve([]),
      desk.list.kind === "tasks" ? listDeskTasks() : Promise.resolve([]),
      desk.people ? listDeskPeople() : Promise.resolve([]),
      needsExisting ? listActiveOperations() : Promise.resolve([]),
    ]);

  return (
    <>
      {hideTitle ? null : (
        <>
          <Heading>{desk.title}</Heading>
          <Text className="mt-2">{desk.blurb}</Text>
        </>
      )}
      <div className={hideTitle ? undefined : "mt-6"}>
        <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
          <WorkDeskClient
            desk={desk}
            operations={operations}
            entries={entries}
            tasks={tasks}
            people={people}
            activeOperations={activeOperations}
            organizations={parties.organizations}
            contacts={parties.contacts}
            canManage={canManageOperations(session)}
            canManageContacts={canManageContacts(session)}
            initialStart={initialStart}
          />
        </Suspense>
      </div>
    </>
  );
}
