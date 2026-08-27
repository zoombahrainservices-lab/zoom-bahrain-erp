import { desc, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";

import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { Link } from "@/components/catalyst/link";
import { NowPeek } from "@/components/now-board";
import { OperationsControlDashboard } from "@/components/operations-control-dashboard";
import { db } from "@/db";
import { operationEntries, operations, salesInquiries, tasks } from "@/db/schema";
import { bahrainClock, greetingForName } from "@/lib/greeting";
import { getNowBoard } from "@/lib/list-now";
import { getSession } from "@/lib/session";
import { isClientUser } from "@/lib/permissions";

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    return (
      <>
        <Heading>{greetingForName(session.name)}</Heading>
        <Text className="mt-4">
          Your client account is active. More features for the client role will
          be added soon.
        </Text>
      </>
    );
  }

  const [
    activeOperations,
    quotationRows,
    invoiceRows,
    openInquiries,
    openTasks,
    hrOperations,
    movements,
    nowBoard,
  ] =
    await Promise.all([
      db.query.operations.findMany({
        where: eq(operations.status, "active"),
        orderBy: [desc(operations.updatedAt)],
        limit: 8,
        columns: {
          id: true,
          operationCode: true,
          title: true,
          divisionId: true,
        },
        with: {
          organization: { columns: { name: true } },
          contact: { columns: { name: true, contactCode: true } },
        },
      }),
      db.query.operationEntries.findMany({
        where: eq(operationEntries.entryType, "quotation"),
        orderBy: [desc(operationEntries.activityDate)],
        limit: 20,
        columns: {
          id: true,
          amount: true,
          documentStage: true,
        },
        with: {
          operation: {
            columns: {
              id: true,
              operationCode: true,
              title: true,
              divisionId: true,
            },
            with: {
              organization: { columns: { name: true } },
              contact: { columns: { name: true, contactCode: true } },
            },
          },
        },
      }),
      db.query.operationEntries.findMany({
        where: eq(operationEntries.entryType, "invoice"),
        orderBy: [desc(operationEntries.activityDate)],
        limit: 20,
        columns: {
          id: true,
          amount: true,
          documentStage: true,
        },
        with: {
          operation: {
            columns: {
              id: true,
              operationCode: true,
              title: true,
              divisionId: true,
            },
            with: {
              organization: { columns: { name: true } },
              contact: { columns: { name: true, contactCode: true } },
            },
          },
        },
      }),
      db.query.salesInquiries.findMany({
        where: eq(salesInquiries.status, "open"),
        orderBy: [desc(salesInquiries.createdAt)],
        limit: 8,
        columns: {
          id: true,
          inquiryCode: true,
          name: true,
          subject: true,
          convertedOperationId: true,
        },
      }),
      db.query.tasks.findMany({
        where: inArray(tasks.status, ["todo", "in_progress"]),
        orderBy: [desc(tasks.updatedAt)],
        limit: 8,
        columns: { id: true, title: true },
        with: {
          operation: {
            columns: { id: true, operationCode: true, title: true },
          },
        },
      }),
      db.query.operations.findMany({
        where: eq(operations.divisionId, "administration"),
        orderBy: [desc(operations.updatedAt)],
        limit: 6,
        columns: {
          id: true,
          operationCode: true,
          title: true,
          divisionId: true,
        },
        with: {
          organization: { columns: { name: true } },
          contact: { columns: { name: true, contactCode: true } },
        },
      }),
      db.query.operationEntries.findMany({
        where: inArray(operationEntries.entryType, [
          "shipment",
          "pickup",
          "delivery",
        ]),
        orderBy: [desc(operationEntries.activityDate)],
        limit: 6,
        columns: { id: true, entryType: true },
        with: {
          operation: {
            columns: {
              id: true,
              operationCode: true,
              title: true,
              divisionId: true,
            },
            with: {
              organization: { columns: { name: true } },
              contact: { columns: { name: true, contactCode: true } },
            },
          },
        },
      }),
      getNowBoard(),
    ]);

  const quotations = quotationRows.filter(
    (item) =>
      item.documentStage === "draft" ||
      item.documentStage === "sent" ||
      !item.documentStage,
  ).slice(0, 8);

  const invoices = invoiceRows
    .filter(
      (item) =>
        item.documentStage === "sent" || item.documentStage === "overdue",
    )
    .slice(0, 8);

  return (
    <>
      <p className="text-xs text-zinc-500">{bahrainClock()}</p>
      <Heading>{greetingForName(session.name)}</Heading>
      <Text className="mt-2">
        Control view. Contact is a person. Organization is a company. Open an
        operation to do the work.{" "}
        <Link href="/now" className="font-medium text-zoom-dark">
          Open Now
        </Link>
      </Text>
      <div className="mt-6">
        <NowPeek needsYou={nowBoard.needsYou} latest={nowBoard.latest} />
      </div>
      <div className="mt-6">
        <OperationsControlDashboard
          operations={activeOperations}
          quotations={quotations}
          invoices={invoices}
          inquiries={openInquiries}
          tasks={openTasks}
          hrOperations={hrOperations}
          movements={movements}
        />
      </div>
    </>
  );
}
