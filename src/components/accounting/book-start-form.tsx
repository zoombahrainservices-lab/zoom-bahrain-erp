"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";
import type { BookKind } from "@/lib/books-flow";

type Party = { id: string; name: string };
type Company = { id: string; name: string };
type OperationChoice = {
  id: string;
  label: string;
  divisionId: string;
  organizationId: string;
};

export function BookStartForm({
  kind,
  companies,
  parties,
  operations,
}: {
  kind: BookKind;
  companies: Company[];
  parties: Party[];
  operations: OperationChoice[];
}) {
  const router = useRouter();
  const [companyId, setCompanyId] = useState(companies[0]?.id ?? "");
  const [partyId, setPartyId] = useState("");
  const [operationId, setOperationId] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const partyLabel = kind.party === "customer" ? "Customer" : "Supplier";
  const selectedOperation = operations.find((item) => item.id === operationId);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/accounting/book-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: kind.id,
          divisionId: selectedOperation?.divisionId || companyId,
          organizationId: selectedOperation ? undefined : partyId,
          operationId: operationId || undefined,
          note,
        }),
      });
      const data = (await response.json()) as { href?: string; error?: string };
      if (!response.ok || !data.href) {
        throw new Error(data.error ?? "Could not start");
      }
      router.push(data.href);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Could not start");
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="max-w-xl space-y-4">
      <p className="text-sm text-text-secondary">{kind.blurb}</p>
      <label className="block text-sm font-medium text-heading">
        Company
        <Select
          className="mt-1"
          value={selectedOperation?.divisionId || companyId}
          disabled={Boolean(selectedOperation)}
          onChange={(event) => setCompanyId(event.target.value)}
        >
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-sm font-medium text-heading">
        {partyLabel}
        <Select
          className="mt-1"
          value={partyId}
          required={!operationId}
          disabled={Boolean(operationId)}
          onChange={(event) => setPartyId(event.target.value)}
        >
          <option value="">Select a {partyLabel.toLowerCase()}</option>
          {parties.map((party) => (
            <option key={party.id} value={party.id}>
              {party.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-sm font-medium text-heading">
        Existing file
        <Select className="mt-1" value={operationId} onChange={(event) => setOperationId(event.target.value)}>
          <option value="">Start a new file for this party</option>
          {operations.map((operation) => (
            <option key={operation.id} value={operation.id}>
              {operation.label}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-sm font-medium text-heading">
        Note
        <Input className="mt-1" value={note} onChange={(event) => setNote(event.target.value)} />
      </label>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Button type="submit" disabled={loading || companies.length === 0}>
        {loading ? "Opening…" : "Continue"}
      </Button>
    </form>
  );
}
