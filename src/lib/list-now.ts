import { and, desc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { operationEntries, operations, tasks } from "@/db/schema";
import { commercialDocumentPath, isCommercialDocumentType } from "@/lib/operation-documents";
import { getEntryTypeLabel, getOperationPartyLabel } from "@/lib/operation-fields";
import {
  getOperationPulse,
  idleDays,
  type PulseTone,
} from "@/lib/operation-pulse";

export type NowItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
  label: string;
  tone: PulseTone;
};

export type NowFeedItem = {
  id: string;
  href: string;
  title: string;
  meta: string;
  body: string;
};

const pulseEntryTypes = [
  "task",
  "quotation",
  "invoice",
  "procurement",
  "shipment",
  "pickup",
  "delivery",
  "hire",
  "visa",
];

function toneRank(tone: PulseTone) {
  if (tone === "act") return 0;
  if (tone === "wait") return 1;
  if (tone === "quiet") return 2;
  return 3;
}

function preview(body: string | null | undefined) {
  const text = body?.replace(/\s+/g, " ").trim() ?? "";
  if (!text) return "";
  return text.length > 80 ? `${text.slice(0, 77)}…` : text;
}

export async function getNowBoard() {
  const [activeOps, latestEntries, openTasks] = await Promise.all([
    db.query.operations.findMany({
      where: eq(operations.status, "active"),
      orderBy: [desc(operations.updatedAt)],
      limit: 30,
      columns: {
        id: true,
        operationCode: true,
        title: true,
        divisionId: true,
        updatedAt: true,
        status: true,
      },
      with: {
        organization: { columns: { name: true } },
        contact: { columns: { name: true, contactCode: true } },
      },
    }),
    db.query.operationEntries.findMany({
      orderBy: [desc(operationEntries.createdAt)],
      limit: 12,
      columns: {
        id: true,
        operationId: true,
        entryType: true,
        body: true,
        createdAt: true,
      },
      with: {
        operation: {
          columns: { id: true, operationCode: true, title: true },
          with: {
            organization: { columns: { name: true } },
            contact: { columns: { name: true, contactCode: true } },
          },
        },
        createdBy: { columns: { name: true } },
      },
    }),
    db.query.tasks.findMany({
      where: inArray(tasks.status, ["todo", "in_progress"]),
      orderBy: [desc(tasks.updatedAt)],
      limit: 8,
      columns: { id: true, title: true, dueDate: true },
      with: {
        operation: {
          columns: { id: true, operationCode: true, title: true },
        },
      },
    }),
  ]);

  const opIds = activeOps.map((operation) => operation.id);
  const pulseRows =
    opIds.length > 0
      ? await db.query.operationEntries.findMany({
          where: and(
            inArray(operationEntries.operationId, opIds),
            inArray(operationEntries.entryType, pulseEntryTypes),
          ),
          columns: {
            id: true,
            operationId: true,
            entryType: true,
            body: true,
            status: true,
            documentStage: true,
            parentEntryId: true,
            createdAt: true,
          },
        })
      : [];

  const pulseByOp = new Map<string, typeof pulseRows>();
  for (const entry of pulseRows) {
    const list = pulseByOp.get(entry.operationId) ?? [];
    list.push(entry);
    pulseByOp.set(entry.operationId, list);
  }

  const needsYou: NowItem[] = activeOps
    .map((operation) => {
      const pulse = getOperationPulse(
        operation,
        pulseByOp.get(operation.id) ?? [],
      );
      return { operation, pulse };
    })
    .filter(
      (item) =>
        item.pulse.tone === "act" ||
        item.pulse.tone === "wait" ||
        item.pulse.tone === "quiet",
    )
    .sort((left, right) => toneRank(left.pulse.tone) - toneRank(right.pulse.tone))
    .slice(0, 10)
    .map(({ operation, pulse }) => ({
      id: operation.id,
      href:
        pulse.action?.kind === "open"
          ? pulse.action.href
          : `/operations/${operation.id}`,
      title: operation.title,
      meta: `${operation.operationCode} · ${getOperationPartyLabel(operation)}`,
      label: pulse.label,
      tone: pulse.tone,
    }));

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  for (const task of openTasks) {
    if (!task.operation) continue;

    const overdue = Boolean(task.dueDate && task.dueDate < startOfToday);
    needsYou.push({
      id: `task-${task.id}`,
      href: `/operations/${task.operation.id}`,
      title: task.title,
      meta: `${task.operation.operationCode} · ${task.operation.title}`,
      label: overdue ? "Overdue to-do" : "Open to-do",
      tone: overdue ? "act" : "wait",
    });
  }

  needsYou.sort((left, right) => toneRank(left.tone) - toneRank(right.tone));

  const quiet: NowItem[] = activeOps
    .filter((operation) => idleDays(operation.updatedAt) >= 5)
    .slice(0, 8)
    .map((operation) => ({
      id: `quiet-${operation.id}`,
      href: `/operations/${operation.id}`,
      title: operation.title,
      meta: `${operation.operationCode} · ${getOperationPartyLabel(operation)}`,
      label: `Quiet ${idleDays(operation.updatedAt)}d`,
      tone: "quiet",
    }));

  const latest: NowFeedItem[] = latestEntries.flatMap((entry) => {
    if (!entry.operation) return [];

    const who = entry.createdBy?.name ?? "Someone";
    const party = getOperationPartyLabel(entry.operation);

    return [
      {
        id: entry.id,
        href: isCommercialDocumentType(entry.entryType)
          ? commercialDocumentPath(entry.operation.id, entry.id)
          : `/operations/${entry.operation.id}`,
        title: entry.operation.title,
        meta: `${who} · ${getEntryTypeLabel(entry.entryType)} · ${party}`,
        body: preview(entry.body) || getEntryTypeLabel(entry.entryType),
      },
    ];
  });

  return {
    needsYou: needsYou.slice(0, 12),
    quiet,
    latest,
  };
}
