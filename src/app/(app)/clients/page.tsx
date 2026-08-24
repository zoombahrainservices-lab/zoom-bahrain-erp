import { ClientsPageClient } from "@/components/clients-page-client";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { db } from "@/db";
import { getGoogleConnection } from "@/lib/google";
import { getSession } from "@/lib/session";

export default async function ClientsPage() {
  const session = await getSession();
  const [rows, googleConnection] = await Promise.all([
    db.query.clients.findMany({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      with: {
        assignedTo: {
          columns: { id: true, name: true },
        },
      },
    }),
    session ? getGoogleConnection(session.userId) : null,
  ]);

  return (
    <>
      <Heading>Clients</Heading>
      <Text className="mt-2">Manage leads, active clients, and their documents.</Text>
      <div className="mt-8">
        <ClientsPageClient
          initialClients={rows}
          driveConnected={Boolean(googleConnection)}
        />
      </div>
    </>
  );
}
