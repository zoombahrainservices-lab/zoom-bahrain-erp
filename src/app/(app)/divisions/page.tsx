import { redirect } from "next/navigation";

import { Badge } from "@/components/catalyst/badge";
import { Heading } from "@/components/catalyst/heading";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/catalyst/table";
import { Text, TextLink } from "@/components/catalyst/text";
import { DivisionLogoDownload } from "@/components/division-logo-download";
import { hasDivisionProfile } from "@/lib/division-profiles";
import { tradingDivisions } from "@/lib/divisions";
import { isClientUser } from "@/lib/permissions";
import { getSession } from "@/lib/session";

export default async function DivisionsPage() {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }

  if (isClientUser(session)) {
    return (
      <>
        <Heading>Companies</Heading>
        <Text className="mt-4">
          The client role does not have access to this section yet.
        </Text>
      </>
    );
  }

  return (
    <>
      <Heading>Companies</Heading>
      <Text className="mt-2">
        Company matrix - three-letter codes for mapping across the ERP.
      </Text>

      <Table className="mt-8 [--gutter:--spacing(6)] lg:[--gutter:--spacing(10)]">
        <TableHead>
          <TableRow>
            <TableHeader>Code</TableHeader>
            <TableHeader>Name</TableHeader>
            <TableHeader>Logo</TableHeader>
            <TableHeader>Short description</TableHeader>
            <TableHeader>Main content webpage</TableHeader>
          </TableRow>
        </TableHead>
        <TableBody>
          {tradingDivisions.map((division) => (
            <TableRow key={division.id}>
              <TableCell>
                <Badge color="zinc" className="font-mono tracking-wide">
                  {division.acronym}
                </Badge>
              </TableCell>
              <TableCell className="font-medium">
                {hasDivisionProfile(division.id) ? (
                  <TextLink href={`/divisions/${division.id}`}>
                    {division.name}
                  </TextLink>
                ) : (
                  division.name
                )}
              </TableCell>
              <TableCell>
                {division.logo ? (
                  <DivisionLogoDownload
                    name={division.name}
                    acronym={division.acronym}
                    logoSrc={division.logo}
                  />
                ) : (
                  <Text className="text-zinc-400">-</Text>
                )}
              </TableCell>
              <TableCell className="text-zinc-500">{division.description}</TableCell>
              <TableCell>
                <TextLink
                  href={division.website}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {division.website.replace(/^https?:\/\//, "")}
                </TextLink>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
