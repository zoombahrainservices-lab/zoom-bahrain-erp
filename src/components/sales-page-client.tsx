"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { parseAsBoolean, useQueryState } from "nuqs";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Field, Label } from "@/components/catalyst/fieldset";
import { Input } from "@/components/catalyst/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/catalyst/table";
import { Textarea } from "@/components/catalyst/textarea";
import { CopyableFieldValue } from "@/components/copyable-field-value";
import { InquiryDetailModal } from "@/components/inquiry-detail-modal";
import { ListSearch, useListQuery } from "@/components/list-search";
import {
  type InquiryRecord,
  getInquiryDisplayName,
} from "@/lib/inquiry-fields";
import { formatDate, matchesQuery } from "@/lib/utils";

type SalesPageClientProps = {
  initialInquiries: InquiryRecord[];
  canConvert: boolean;
  canConvertToOrganization: boolean;
};

function statusBadgeColor(status: string) {
  if (status === "open") return "blue" as const;
  if (status === "converted") return "green" as const;
  return "zinc" as const;
}

export function SalesPageClient({
  initialInquiries,
  canConvert,
  canConvertToOrganization,
}: SalesPageClientProps) {
  const phoneRef = useRef<HTMLInputElement>(null);
  const [inquiries, setInquiries] = useState(initialInquiries);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(
    null,
  );
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [search] = useListQuery();
  const [wantNew, setWantNew] = useQueryState(
    "new",
    parseAsBoolean.withDefault(false).withOptions({ clearOnDefault: true }),
  );

  useEffect(() => {
    if (!wantNew) return;
    phoneRef.current?.focus();
    phoneRef.current?.scrollIntoView({ block: "center" });
    void setWantNew(false);
  }, [wantNew, setWantNew]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch("/api/sales/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, email, subject }),
      });
      const data = (await response.json()) as {
        inquiry?: InquiryRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save inquiry");
      }

      if (data.inquiry) {
        setInquiries((current) => [data.inquiry!, ...current]);
      }

      setName("");
      setPhone("");
      setEmail("");
      setSubject("");
      setSuccess("Inquiry saved.");
      phoneRef.current?.focus();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to save inquiry",
      );
    } finally {
      setLoading(false);
    }
  }

  const openInquiries = inquiries.filter((inquiry) => inquiry.status === "open");
  const filtered = useMemo(() => {
    return inquiries.filter((inquiry) =>
      matchesQuery(
        [
          inquiry.inquiryCode,
          getInquiryDisplayName(inquiry),
          inquiry.phone,
          inquiry.email,
          inquiry.subject,
          inquiry.status,
        ],
        search,
      ),
    );
  }, [inquiries, search]);

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-zinc-950/5">
        <div className="border-b border-zinc-950/5 bg-zoom-dark px-4 py-4 sm:px-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-white">
            Quick capture
          </h2>
          <p className="mt-1 text-sm text-zoom-pale dark:text-zoom-soft">
            Log a call in seconds. Work happens on the operation.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
          <Field>
            <Label htmlFor="inquiry-phone">Phone</Label>
            <Input
              ref={phoneRef}
              id="inquiry-phone"
              type="tel"
              autoFocus
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+973 ..."
              className="[&_input]:py-3 [&_input]:text-lg"
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field>
              <Label htmlFor="inquiry-name">Name</Label>
              <Input
                id="inquiry-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Caller name"
              />
            </Field>

            <Field>
              <Label htmlFor="inquiry-email">Email</Label>
              <Input
                id="inquiry-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="email@example.com"
              />
            </Field>
          </div>

          <Field>
            <Label htmlFor="inquiry-subject">What do they need?</Label>
            <Textarea
              id="inquiry-subject"
              rows={3}
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Brief note about the enquiry..."
            />
          </Field>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {success ? <p className="text-sm text-green-700">{success}</p> : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save inquiry"}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-zinc-950">Inquiries</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {openInquiries.length} open · click a row to manage
            </p>
          </div>
          <ListSearch
            placeholder="Search inquiries…"
            className="sm:max-w-xs"
          />
        </div>

        <Table className="[--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
          <TableHead>
            <TableRow>
              <TableHeader>Inquiry ID</TableHeader>
              <TableHeader>Caller</TableHeader>
              <TableHeader>Phone</TableHeader>
              <TableHeader>Email</TableHeader>
              <TableHeader>What they need</TableHeader>
              <TableHeader>Status</TableHeader>
              <TableHeader>Logged</TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {inquiries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-zinc-500">
                  No inquiries yet. Use the form above to log the first one.
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-zinc-500">
                  No matches for your search.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((inquiry) => (
                <TableRow
                  key={inquiry.id}
                  onClick={() => setSelectedInquiry(inquiry)}
                  className="cursor-pointer"
                >
                  <TableCell className="font-mono text-sm text-zinc-600">
                    {inquiry.inquiryCode}
                  </TableCell>
                  <TableCell className="font-medium">
                    {getInquiryDisplayName(inquiry)}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {inquiry.phone ? (
                      <CopyableFieldValue
                        value={inquiry.phone}
                        variant="phone"
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {inquiry.email ? (
                      <CopyableFieldValue value={inquiry.email} />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-sm text-zinc-600">
                    {inquiry.subject?.trim() || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge color={statusBadgeColor(inquiry.status)}>
                      {inquiry.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-500">
                    {formatDate(inquiry.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <InquiryDetailModal
        inquiry={selectedInquiry}
        open={selectedInquiry !== null}
        canConvert={canConvert}
        canConvertToOrganization={canConvertToOrganization}
        onClose={() => setSelectedInquiry(null)}
        onUpdated={(inquiry) => {
          setInquiries((current) =>
            current.map((item) => (item.id === inquiry.id ? inquiry : item)),
          );
          setSelectedInquiry(inquiry);
        }}
      />
    </div>
  );
}
