"use client";

import { useMemo, useState } from "react";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { OrganizationLogo } from "@/components/organization-logo";
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
  type OrganizationRecord,
  formatOrganizationTypes,
  getOrganizationContacts,
  getOrganizationTypes,
  hasOrganizationTypes,
  organizationTypeOptions,
} from "@/lib/organization-fields";
import { formatDate, matchesQuery } from "@/lib/utils";
import { formatCountryName } from "@/lib/country-registration";

type OrganizationsPageClientProps = {
  organizations: OrganizationRecord[];
  isAdmin: boolean;
};

export function OrganizationsPageClient({
  organizations,
  isAdmin,
}: OrganizationsPageClientProps) {
  const [search] = useListQuery();
  const [type, setType] = useState("all");
  const filtered = useMemo(() => {
    return organizations.filter((organization) => {
      const types = getOrganizationTypes(organization);
      if (type !== "all" && !types.includes(type as (typeof types)[number])) {
        return false;
      }
      const contacts = getOrganizationContacts(organization);
      const primary = contacts[0];
      return matchesQuery(
        [
          organization.name,
          organization.orgCode,
          formatCountryName(organization.country),
          hasOrganizationTypes(organization.roles)
            ? formatOrganizationTypes(getOrganizationTypes(organization))
            : "",
          primary?.name,
          primary?.emails[0]?.email,
          primary?.mobiles[0],
        ],
        search,
      );
    });
  }, [organizations, search, type]);

  return (
    <>
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ListSearch placeholder="Search by name, code, or contact…" />
          {isAdmin ? (
            <Button href="/organizations/new">Add new organization</Button>
          ) : null}
        </div>
        <FilterPills
          value={type}
          onChange={setType}
          options={[
            { value: "all", label: "All companies" },
            ...organizationTypeOptions.map((item) => ({
              value: item.value,
              label: item.label,
            })),
          ]}
        />
      </div>

      <Table className="[--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Logo</TableHeader>
            <TableHeader>Org ID</TableHeader>
            <TableHeader>Type</TableHeader>
            <TableHeader>Country</TableHeader>
            <TableHeader>Legal name</TableHeader>
            <TableHeader>Primary contact</TableHeader>
            <TableHeader>Added</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {organizations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-zinc-500">
                No active organizations yet.
                {isAdmin ? " Click Add new organization to register one." : ""}
              </TableCell>
            </TableRow>
          ) : filtered.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-zinc-500">
                No matches for your search.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((organization) => {
              const contacts = getOrganizationContacts(organization);
              const primary = contacts[0];

              return (
                <TableRow
                  key={organization.id}
                  href={`/organizations/${organization.id}`}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <OrganizationLogo
                      organizationId={organization.id}
                      name={organization.name}
                      hasLogo={Boolean(organization.logoDriveFileId)}
                      size="sm"
                    />
                  </TableCell>
                  <TableCell className="font-mono text-sm text-zinc-600">
                    {organization.orgCode ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {hasOrganizationTypes(organization.roles) ? (
                      formatOrganizationTypes(getOrganizationTypes(organization))
                    ) : (
                      <Badge color="orange">Not set</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">
                    {formatCountryName(organization.country) || "—"}
                  </TableCell>
                  <TableCell className="font-medium">{organization.name}</TableCell>
                  <TableCell>
                    <div>{primary?.name ?? "—"}</div>
                    <div className="text-xs text-zinc-500">
                      {primary?.emails[0]?.email ?? primary?.mobiles[0] ?? ""}
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-500">
                    {formatDate(organization.createdAt)}
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
