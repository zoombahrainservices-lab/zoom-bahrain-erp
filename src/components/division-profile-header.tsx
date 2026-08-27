import { ChevronRightIcon } from "@heroicons/react/20/solid";

import { Badge } from "@/components/catalyst/badge";
import { Divider } from "@/components/catalyst/divider";
import { Heading } from "@/components/catalyst/heading";
import { Link } from "@/components/catalyst/link";
import { Text } from "@/components/catalyst/text";
import { DivisionLogoDownload } from "@/components/division-logo-download";
import type { Division } from "@/lib/divisions";
import {
  contentStatusLabels,
  type DivisionProfile,
} from "@/lib/division-profiles";

type DivisionProfileHeaderProps = {
  division: Division;
  profile: DivisionProfile;
};

export function DivisionProfileHeader({
  division,
  profile,
}: DivisionProfileHeaderProps) {
  return (
    <header>
      <nav aria-label="Breadcrumb" className="flex">
        <ol className="flex min-w-0 flex-wrap items-center gap-2 text-sm/6">
          <li>
            <Link
              href="/divisions"
              className="font-medium text-zoom-light transition hover:text-zoom-medium"
            >
              Companies
            </Link>
          </li>
          <li aria-hidden="true" className="text-zoom-gray">
            <ChevronRightIcon className="size-4" />
          </li>
          <li>
            <span className="font-medium text-zoom-charcoal">{division.acronym}</span>
          </li>
        </ol>
      </nav>

      <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="blue" className="font-mono tracking-wide">
              {division.acronym}
            </Badge>
            <Badge color={profile.erpStatus === "live" ? "green" : "zinc"}>
              {profile.erpStatus === "live" ? "Live in ERP" : "Planned"}
            </Badge>
            <Badge color={profile.content.status === "published" ? "green" : "orange"}>
              {contentStatusLabels[profile.content.status]}
            </Badge>
            <Badge color="zinc">v{profile.content.version}</Badge>
          </div>

          <Heading level={1} className="mt-4">
            {division.name}
          </Heading>

          <Text className="mt-2 max-w-3xl text-base/7 text-zoom-charcoal sm:text-sm/6">
            {profile.identity.shortDescriptor}
          </Text>
          <Text className="mt-2 text-xs text-zoom-gray">
            Updated {profile.content.lastUpdated} by {profile.content.updatedBy}
          </Text>
        </div>

        {division.logo ? (
          <div className="shrink-0 self-start rounded-lg border border-zinc-950/10 bg-white px-5 py-4 shadow-xs ring-1 ring-zinc-950/5">
            <DivisionLogoDownload
              name={division.name}
              acronym={division.acronym}
              logoSrc={division.logo}
              logoClassName="h-10 w-auto max-w-48 object-contain sm:h-12"
            />
          </div>
        ) : null}
      </div>

      <Divider className="mt-8" soft />
    </header>
  );
}
