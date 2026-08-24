"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Field, FieldGroup, Label } from "@/components/catalyst/fieldset";
import { Heading } from "@/components/catalyst/heading";
import { Input } from "@/components/catalyst/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/catalyst/table";
import { ClientFiles } from "@/components/client-files";
import { formatDate } from "@/lib/utils";

type ClientRow = {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  createdAt: Date;
  assignedTo: { id: string; name: string } | null;
};

type ClientsPageClientProps = {
  initialClients: ClientRow[];
  driveConnected: boolean;
};

function statusColor(status: string) {
  if (status === "active") return "green" as const;
  if (status === "lead") return "orange" as const;
  return "zinc" as const;
}

export function ClientsPageClient({
  initialClients,
  driveConnected,
}: ClientsPageClientProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedClientId, setSelectedClientId] = useState(
    initialClients[0]?.id ?? "",
  );

  const selectedClient = useMemo(
    () => initialClients.find((client) => client.id === selectedClientId),
    [initialClients, selectedClientId],
  );

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, phone }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create client");
      }

      setName("");
      setCompany("");
      setEmail("");
      setPhone("");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create client",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form
        onSubmit={handleCreate}
        className="mb-10 rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5"
      >
        <Heading level={2}>Add client</Heading>
        <FieldGroup className="mt-6 grid gap-4 md:grid-cols-2">
          <Field>
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field>
            <Label>Company</Label>
            <Input value={company} onChange={(e) => setCompany(e.target.value)} />
          </Field>
          <Field>
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field>
            <Label>Phone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
        </FieldGroup>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="mt-6" disabled={loading}>
          {loading ? "Saving..." : "Add client"}
        </Button>
      </form>

      <Table className="[--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Company</TableHeader>
            <TableHeader>Contact</TableHeader>
            <TableHeader>Status</TableHeader>
            <TableHeader>Added</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {initialClients.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-zinc-500">
                No clients yet.
              </TableCell>
            </TableRow>
          ) : (
            initialClients.map((client) => (
              <TableRow
                key={client.id}
                onClick={() => setSelectedClientId(client.id)}
                className={
                  selectedClientId === client.id ? "bg-blue-500/5" : undefined
                }
              >
                <TableCell className="font-medium">{client.name}</TableCell>
                <TableCell>{client.company ?? "—"}</TableCell>
                <TableCell>
                  <div>{client.email ?? "—"}</div>
                  <div className="text-xs text-zinc-500">{client.phone ?? ""}</div>
                </TableCell>
                <TableCell>
                  <Badge color={statusColor(client.status)}>{client.status}</Badge>
                </TableCell>
                <TableCell className="text-zinc-500">
                  {formatDate(client.createdAt)}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {selectedClient ? (
        <div className="mt-10">
          <ClientFiles
            key={selectedClient.id}
            clientId={selectedClient.id}
            driveConnected={driveConnected}
          />
        </div>
      ) : null}
    </>
  );
}
