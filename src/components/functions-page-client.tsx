"use client";

import { parseAsStringLiteral, useQueryState } from "nuqs";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { Link } from "@/components/catalyst/link";
import { CoreModelNote } from "@/components/core-model-note";
import { FilterPills } from "@/components/filter-pills";
import {
  capabilitiesByGroup,
  visibleQuickCreates,
  type AppCapability,
} from "@/lib/app-capabilities";

type FunctionsPageClientProps = {
  admin?: boolean;
};

const viewFilters = ["all", "live", "later"] as const;

function CapabilityRow({ item }: { item: AppCapability }) {
  const live = item.status === "live" && Boolean(item.href);
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-zoom-dark">{item.label}</p>
        <Badge color={live ? "green" : "zinc"}>
          {live ? "Live" : "Later"}
        </Badge>
      </div>
      <p className="mt-1 text-xs text-zinc-500">{item.how}</p>
    </>
  );

  if (live && item.href) {
    return (
      <Link
        href={item.href}
        className="block rounded-lg px-3 py-2 ring-1 ring-zinc-200 hover:bg-zinc-50"
      >
        {body}
      </Link>
    );
  }

  return (
    <div className="rounded-lg px-3 py-2 ring-1 ring-zinc-100">{body}</div>
  );
}

export function FunctionsPageClient({ admin = false }: FunctionsPageClientProps) {
  const groups = capabilitiesByGroup({ admin });
  const creates = visibleQuickCreates({ admin });
  const hasLater = groups.some((group) =>
    group.items.some((item) => item.status === "later"),
  );
  const [view, setView] = useQueryState(
    "view",
    parseAsStringLiteral(viewFilters).withDefault("all"),
  );

  return (
    <>
      <Heading>Functions</Heading>
      <Text className="mt-2">
        Operations is the work surface. Press Ctrl+K to jump.
      </Text>
      <div className="mt-4">
        <CoreModelNote extra="If a human exists, they are a contact. If a company exists, it is an organization. Everything else opens an operation." />
      </div>

      <div className="mt-6 flex flex-wrap gap-2">
        {creates.map((action) => (
          <Button key={action.id} href={action.href} outline>
            {action.label}
          </Button>
        ))}
      </div>

      {hasLater ? (
        <div className="mt-6">
          <FilterPills
            value={view}
            onChange={(value) => {
              void setView(value);
            }}
            options={[
              { value: "all", label: "All" },
              { value: "live", label: "Live" },
              { value: "later", label: "Later" },
            ]}
          />
        </div>
      ) : null}

      <div className="mt-8 space-y-8">
        {groups.map((group) => {
          const items = group.items.filter(
            (item) => view === "all" || item.status === view,
          );
          if (items.length === 0) return null;
          return (
            <section key={group.group}>
              <h2 className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">
                {group.label}
              </h2>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {items.map((item) => (
                  <CapabilityRow key={item.id} item={item} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
