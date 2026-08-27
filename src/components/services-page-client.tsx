"use client";

import { useMemo } from "react";
import { parseAsString, useQueryState } from "nuqs";

import { Button } from "@/components/catalyst/button";
import { CoreModelNote } from "@/components/core-model-note";
import { FilterPills } from "@/components/filter-pills";
import { ListSearch, useListQuery } from "@/components/list-search";
import { matchesQuery } from "@/lib/utils";
import {
  catalogDivisions,
  serviceOperationHref,
  type CatalogService,
} from "@/lib/zoom-services";

type ServicesPageClientProps = {
  services: CatalogService[];
};

export function ServicesPageClient({ services }: ServicesPageClientProps) {
  const divisions = catalogDivisions();
  const [search] = useListQuery();
  const [company, setCompany] = useQueryState(
    "company",
    parseAsString.withDefault("all"),
  );

  const filtered = useMemo(() => {
    return services.filter((service) => {
      if (company !== "all" && service.divisionId !== company) return false;
      return matchesQuery(
        [
          service.name,
          service.description,
          service.group,
          service.divisionName,
          service.pricingMethod,
        ],
        search,
      );
    });
  }, [services, company, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, CatalogService[]>();
    for (const service of filtered) {
      const key = `${service.divisionId}::${service.group}`;
      const current = map.get(key) ?? [];
      current.push(service);
      map.set(key, current);
    }
    return [...map.entries()];
  }, [filtered]);

  return (
    <div className="space-y-6">
      <CoreModelNote extra="Pick a Zoom service. It opens as an operation for a company or a person." />

      <div className="flex flex-col gap-3">
        <ListSearch placeholder="Search what we sell…" />
        <FilterPills
          value={company}
          onChange={(value) => {
            void setCompany(value);
          }}
          options={[
            { value: "all", label: "All companies" },
            ...divisions.map((item) => ({
              value: item.id,
              label: `${item.acronym} (${item.count})`,
            })),
          ]}
        />
      </div>

      {grouped.length === 0 ? (
        <p className="text-sm text-zinc-500">No services match.</p>
      ) : (
        <div className="space-y-8">
          {grouped.map(([key, items]) => {
            const first = items[0];
            return (
              <section key={key}>
                <div className="flex items-center gap-2">
                  {first.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={first.logo} alt="" className="h-6 w-6 object-contain" />
                  ) : null}
                  <h2 className="text-sm font-semibold text-zoom-navy">
                    {first.divisionName}
                    <span className="ml-2 font-normal text-zinc-400">
                      {first.group}
                    </span>
                  </h2>
                </div>
                <div className="mt-2 overflow-hidden rounded-xl bg-white ring-1 ring-zinc-200">
                  <ul className="divide-y divide-zinc-100">
                    {items.map((service) => (
                      <li
                        key={service.id}
                        className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zoom-dark">
                            {service.name}
                          </p>
                          <p className="mt-0.5 text-xs text-zinc-500">
                            {service.description}
                          </p>
                        </div>
                        <Button
                          href={serviceOperationHref(service)}
                          outline
                          className="shrink-0"
                        >
                          Open as operation
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
