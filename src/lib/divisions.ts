export type Division = {
  id: string;
  acronym: string;
  name: string;
  description: string;
  website: string;
  /** Public path to division logo (SVG). */
  logo?: string;
  /** Internal owner for operations that are not a trading company. */
  internal?: boolean;
};

export const divisions: Division[] = [
  {
    id: "administration",
    acronym: "ADM",
    name: "Administration",
    description:
      "Internal work that is not a service company — staff, rent, cars, LMRA, office.",
    website: "",
    internal: true,
  },
  {
    id: "real-estate",
    acronym: "REA",
    name: "Zoom Real Estate",
    description: "Property management and real estate solutions.",
    website: "https://zoombahrain.co/real-estate",
    logo: "/logo-realty.svg",
  },
  {
    id: "events",
    acronym: "EVN",
    name: "Zoom Events",
    description: "Corporate Events, Conferences & Exhibitions",
    website: "https://zoombahrain.com/events",
    logo: "/logo-events.svg",
  },
  {
    id: "advertising",
    acronym: "ADV",
    name: "Zoom Advertising",
    description: "Advertising Campaigns, Media & Brand Communication",
    website: "https://zoombahrain.com/advertising",
    logo: "/logo-advertising.svg",
  },
  {
    id: "professional-services",
    acronym: "PRS",
    name: "Zoom Professional Services",
    description: "Customized Projects & Professional Solutions",
    website: "https://zoombahrain.co/professional-services",
    logo: "/logo-services.svg",
  },
  {
    id: "business-consultancy",
    acronym: "BCN",
    name: "Zoom Business Consultancy",
    description: "Strategy, Operations & Management Improvement",
    website: "https://zoombahrain.co/business-consultancy",
    logo: "/logo-consulting.svg",
  },
  {
    id: "e-commerce",
    acronym: "ECM",
    name: "Zoom E-Commerce",
    description: "Online Retail & Digital Commerce",
    website: "https://helloonebahrain.com",
    logo: "/logo-e-commerce.svg",
  },
  {
    id: "software-solutions",
    acronym: "SFS",
    name: "Zoom Software Solutions",
    description: "Websites, Applications & Custom Software",
    website: "https://zoombahrain.com/software-solutions",
    logo: "/logo-software.svg",
  },
  {
    id: "technology-solutions",
    acronym: "TSL",
    name: "Zoom Technology Solutions",
    description: "Digitalization, Backend Systems, Automation & AI",
    website: "https://zoombahrain.com/technology-solutions",
    logo: "/logo-technology.svg",
  },
  {
    id: "sports",
    acronym: "SPT",
    name: "Zoom Sports",
    description: "Sports Instruction, Coaching, Programs & Camps",
    website: "https://zoombahrain.com/sports",
    logo: "/logo-sports.svg",
  },
  {
    id: "education-training",
    acronym: "EDT",
    name: "Zoom Education & Training",
    description: "Learning Programs, Workshops & Skills Development",
    website: "https://nextskillbahrain.com",
    logo: "/logo-education.svg",
  },
  {
    id: "logistics",
    acronym: "LOG",
    name: "Zoom Logistics",
    description: "Cargo Handling & Coordinated Logistics",
    website: "https://zoombahrain.co/logistics",
    logo: "/logo-logistics.svg",
  },
  {
    id: "warehousing",
    acronym: "WHS",
    name: "Zoom Warehousing",
    description: "Warehousing, Storage & Inventory Operations",
    website: "https://zoombahrain.co/warehousing",
    logo: "/logo-warehousing.svg",
  },
  {
    id: "group",
    acronym: "ZGC",
    name: "Zoom Group of Companies",
    description: "Integrated Business Solutions Across Twelve Specialized Companies",
    website: "https://zoomgroupofcompanies.com",
    logo: "/logo-zoom-group-of-companies.svg",
  },
];

export const divisionByAcronym = Object.fromEntries(
  divisions.map((division) => [division.acronym, division]),
) as Record<string, Division>;

export const divisionById = Object.fromEntries(
  divisions.map((division) => [division.id, division]),
) as Record<string, Division>;

export const tradingDivisions = divisions.filter((division) => !division.internal);

export function getDivisionById(id: string) {
  return divisionById[id];
}

export function getDivisionName(divisionId: string) {
  return getDivisionById(divisionId)?.name ?? divisionId;
}
