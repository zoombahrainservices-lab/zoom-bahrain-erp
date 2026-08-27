import { tradingDivisions } from "@/lib/divisions";
import { getDivisionProfile } from "@/lib/division-profiles";

export type CatalogService = {
  id: string;
  divisionId: string;
  divisionName: string;
  divisionAcronym: string;
  logo?: string;
  group: string;
  name: string;
  description: string;
  deliverable: string;
  pricingMethod: string;
};

export function listCatalogServices(): CatalogService[] {
  return tradingDivisions.flatMap((division) => {
    const profile = getDivisionProfile(division.id);
    const groups = profile?.public.serviceGroups ?? [];

    return groups.flatMap((group) =>
      group.services
        .filter((service) => service.status === "active")
        .map((service) => ({
          id: `${division.id}:${group.name}:${service.name}`,
          divisionId: division.id,
          divisionName: division.name,
          divisionAcronym: division.acronym,
          logo: division.logo,
          group: group.name,
          name: service.name,
          description: service.description,
          deliverable: service.deliverable,
          pricingMethod: service.pricingMethod,
        })),
    );
  });
}

export function serviceEntryType(divisionId: string) {
  if (divisionId === "logistics") return "shipment";
  if (divisionId === "warehousing") return "storage";
  if (
    divisionId === "advertising" ||
    divisionId === "events" ||
    divisionId === "e-commerce"
  ) {
    return "campaign";
  }
  if (divisionId === "real-estate") return "lease";
  if (divisionId === "education-training" || divisionId === "sports") {
    return "training";
  }
  return "request";
}

export function serviceOperationHref(service: CatalogService) {
  const params = new URLSearchParams({
    divisionId: service.divisionId,
    title: service.name,
    entryType: serviceEntryType(service.divisionId),
  });
  return `/operations/new?${params.toString()}`;
}

export function catalogDivisions() {
  const seen = new Set<string>();
  const items: Array<{
    id: string;
    name: string;
    acronym: string;
    logo?: string;
    count: number;
  }> = [];

  for (const service of listCatalogServices()) {
    if (!seen.has(service.divisionId)) {
      seen.add(service.divisionId);
      items.push({
        id: service.divisionId,
        name: service.divisionName,
        acronym: service.divisionAcronym,
        logo: service.logo,
        count: 0,
      });
    }
    const row = items.find((item) => item.id === service.divisionId);
    if (row) row.count += 1;
  }

  return items;
}
