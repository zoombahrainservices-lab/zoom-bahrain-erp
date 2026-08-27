"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/catalyst/table";
import { FilterPills } from "@/components/filter-pills";
import { ListSearch, useListQuery } from "@/components/list-search";
import {
  type ContactRecord,
  contactKindOptions,
  formatContactKinds,
  getContactDisplayName,
  getContactEmails,
  getContactKinds,
  getContactMobiles,
} from "@/lib/contact-fields";
import { matchesQuery } from "@/lib/utils";

type ContactsPageClientProps = {
  contacts: ContactRecord[];
  isAdmin: boolean;
};

export function ContactsPageClient({
  contacts,
  isAdmin,
}: ContactsPageClientProps) {
  const [search] = useListQuery();
  const [kind, setKind] = useState<"all" | "person" | "staff" | "candidate" | "contractor">(
    "all",
  );
  const filtered = useMemo(() => {
    return contacts.filter((contact) => {
      const kinds = getContactKinds(contact);
      if (kind === "person" && kinds.length > 0) return false;
      if (kind !== "all" && kind !== "person" && !kinds.includes(kind)) {
        return false;
      }
      const mobiles = getContactMobiles(contact);
      const emails = getContactEmails(contact);
      return matchesQuery(
        [
          getContactDisplayName(contact),
          contact.position,
          contact.contactCode,
          formatContactKinds(kinds),
          contact.organization?.name,
          contact.organization?.orgCode,
          ...mobiles,
          ...emails.map((item) => item.email),
        ],
        search,
      );
    });
  }, [contacts, search, kind]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ListSearch placeholder="Search by name, phone, or organization…" />
          {isAdmin ? <Button href="/contacts/new">Add new contact</Button> : null}
        </div>
        <FilterPills
          value={kind}
          onChange={setKind}
          options={[
            { value: "all", label: "All people" },
            { value: "person", label: "Person only" },
            ...contactKindOptions.map((item) => ({
              value: item.value,
              label: item.label,
            })),
          ]}
        />
      </div>

      <Table className="[--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Name</TableHeader>
            <TableHeader>Position</TableHeader>
            <TableHeader>Phone</TableHeader>
            <TableHeader>Email</TableHeader>
            <TableHeader>Contact ID</TableHeader>
            <TableHeader>Organization</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {contacts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-zinc-500">
                No active contacts yet.
                {isAdmin ? " Click Add new contact to register one." : ""}
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-zinc-500">
                No matches for your search.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((contact) => {
              const mobiles = getContactMobiles(contact);
              const emails = getContactEmails(contact);

              return (
                <TableRow
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="cursor-pointer"
                >
                  <TableCell className="font-medium">
                    <span className="block">{getContactDisplayName(contact)}</span>
                    {getContactKinds(contact).length > 0 ? (
                      <span className="text-xs font-normal text-zinc-500">
                        {formatContactKinds(getContactKinds(contact))}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {contact.position?.trim() || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {mobiles[0] ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {emails[0]?.email ?? "—"}
                  </TableCell>
                  <TableCell className="font-mono text-sm text-zinc-600">
                    {contact.contactCode}
                  </TableCell>
                  <TableCell
                    className="text-sm text-zinc-600"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {contact.organization ? (
                      <Link
                        href={`/organizations/${contact.organization.id}`}
                        className="text-indigo-600 hover:underline"
                      >
                        {contact.organization.name}
                        {contact.organization.orgCode ? (
                          <span className="mt-0.5 block font-mono text-xs text-zinc-500">
                            {contact.organization.orgCode}
                          </span>
                        ) : null}
                      </Link>
                    ) : (
                      <Badge color="zinc">Not linked</Badge>
                    )}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </>
  );
}
