export const DEFAULT_COUNTRY_CODE = "BH";

export const identifierTypes = [
  "commercial_registration",
  "company_registration",
  "registration_number",
  "trade_license",
  "vat_registration",
  "tax_registration",
  "uen",
  "gst_registration",
  "custom",
] as const;

export type IdentifierType = (typeof identifierTypes)[number];

export type CountryIdentifierField = {
  type: IdentifierType;
  label: string;
  required: boolean;
  order: number;
  helpText?: string;
};

export type CountryRegistrationConfig = {
  code: string;
  name: string;
  fields: CountryIdentifierField[];
  allowExtraIdentifiers: boolean;
};

export type OrganizationIdentifierInput = {
  type: IdentifierType | string;
  label: string;
  value: string;
  isPrimary?: boolean;
  issuingAuthority?: string;
  expiryDate?: string;
};

export type OrganizationIdentifierRow = {
  id: string;
  organizationId: string;
  countryCode: string | null;
  identifierType: string;
  identifierLabel: string;
  identifierValue: string;
  isPrimary: number;
  issuingAuthority: string | null;
  expiryDate: string | null;
  sortOrder: number;
  createdAt: Date;
};

export const registrationCountries = [
  { code: "BH", name: "Bahrain" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "QA", name: "Qatar" },
  { code: "KW", name: "Kuwait" },
  { code: "OM", name: "Oman" },
  { code: "EG", name: "Egypt" },
  { code: "JO", name: "Jordan" },
  { code: "LB", name: "Lebanon" },
  { code: "IQ", name: "Iraq" },
  { code: "IR", name: "Iran" },
  { code: "TR", name: "Turkey" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "CN", name: "China" },
  { code: "IN", name: "India" },
  { code: "SG", name: "Singapore" },
  { code: "MY", name: "Malaysia" },
  { code: "PK", name: "Pakistan" },
  { code: "PH", name: "Philippines" },
  { code: "BD", name: "Bangladesh" },
  { code: "ID", name: "Indonesia" },
  { code: "JP", name: "Japan" },
  { code: "KR", name: "South Korea" },
  { code: "HK", name: "Hong Kong" },
  { code: "TW", name: "Taiwan" },
  { code: "AU", name: "Australia" },
  { code: "NZ", name: "New Zealand" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "ES", name: "Spain" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  { code: "CH", name: "Switzerland" },
  { code: "AT", name: "Austria" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "IE", name: "Ireland" },
  { code: "PL", name: "Poland" },
  { code: "CZ", name: "Czechia" },
  { code: "GR", name: "Greece" },
  { code: "PT", name: "Portugal" },
  { code: "RU", name: "Russia" },
  { code: "UA", name: "Ukraine" },
  { code: "CA", name: "Canada" },
  { code: "MX", name: "Mexico" },
  { code: "BR", name: "Brazil" },
  { code: "AR", name: "Argentina" },
  { code: "ZA", name: "South Africa" },
  { code: "NG", name: "Nigeria" },
  { code: "KE", name: "Kenya" },
  { code: "MA", name: "Morocco" },
  { code: "TN", name: "Tunisia" },
  { code: "CY", name: "Cyprus" },
  { code: "MT", name: "Malta" },
  { code: "LU", name: "Luxembourg" },
  { code: "IL", name: "Israel" },
  { code: "PS", name: "Palestine" },
  { code: "YE", name: "Yemen" },
  { code: "SD", name: "Sudan" },
  { code: "ET", name: "Ethiopia" },
  { code: "GH", name: "Ghana" },
  { code: "TH", name: "Thailand" },
  { code: "VN", name: "Vietnam" },
  { code: "KH", name: "Cambodia" },
  { code: "LK", name: "Sri Lanka" },
  { code: "NP", name: "Nepal" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "UZ", name: "Uzbekistan" },
] as const;

export type RegistrationCountryCode =
  (typeof registrationCountries)[number]["code"];

const fallbackConfig: Omit<CountryRegistrationConfig, "code" | "name"> = {
  allowExtraIdentifiers: true,
  fields: [
    {
      type: "registration_number",
      label: "Registration Number",
      required: true,
      order: 1,
    },
    {
      type: "trade_license",
      label: "Business / Trade Licence Number",
      required: false,
      order: 2,
    },
    {
      type: "tax_registration",
      label: "Tax Registration Number",
      required: false,
      order: 3,
    },
  ],
};

const countryConfigs: Record<string, CountryRegistrationConfig> = {
  BH: {
    code: "BH",
    name: "Bahrain",
    allowExtraIdentifiers: false,
    fields: [
      {
        type: "commercial_registration",
        label: "Commercial Registration (CR) Number",
        required: true,
        order: 1,
        helpText: "The CR Number is the main organization registration identifier.",
      },
      {
        type: "vat_registration",
        label: "VAT Account Number",
        required: false,
        order: 2,
      },
    ],
  },
  AE: {
    code: "AE",
    name: "United Arab Emirates",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "registration_number",
        label: "Registration Number",
        required: true,
        order: 1,
      },
      {
        type: "trade_license",
        label: "Trade Licence Number",
        required: false,
        order: 2,
      },
      {
        type: "tax_registration",
        label: "Tax Registration Number (TRN)",
        required: false,
        order: 3,
      },
    ],
  },
  GB: {
    code: "GB",
    name: "United Kingdom",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "company_registration",
        label: "Company Number",
        required: true,
        order: 1,
      },
      {
        type: "vat_registration",
        label: "VAT Registration Number",
        required: false,
        order: 2,
      },
    ],
  },
  SG: {
    code: "SG",
    name: "Singapore",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "uen",
        label: "UEN",
        required: true,
        order: 1,
        helpText: "Unique Entity Number issued by ACRA.",
      },
      {
        type: "gst_registration",
        label: "GST Registration Number",
        required: false,
        order: 2,
      },
    ],
  },
  SA: {
    code: "SA",
    name: "Saudi Arabia",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "commercial_registration",
        label: "Commercial Registration Number",
        required: true,
        order: 1,
      },
      {
        type: "vat_registration",
        label: "VAT Registration Number",
        required: false,
        order: 2,
      },
    ],
  },
  QA: {
    code: "QA",
    name: "Qatar",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "commercial_registration",
        label: "Commercial Registration Number",
        required: true,
        order: 1,
      },
      {
        type: "tax_registration",
        label: "Tax Card Number",
        required: false,
        order: 2,
      },
    ],
  },
  KW: {
    code: "KW",
    name: "Kuwait",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "commercial_registration",
        label: "Commercial Licence Number",
        required: true,
        order: 1,
      },
      {
        type: "tax_registration",
        label: "Tax Registration Number",
        required: false,
        order: 2,
      },
    ],
  },
  OM: {
    code: "OM",
    name: "Oman",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "commercial_registration",
        label: "Commercial Registration Number",
        required: true,
        order: 1,
      },
      {
        type: "vat_registration",
        label: "VAT Registration Number",
        required: false,
        order: 2,
      },
    ],
  },
  US: {
    code: "US",
    name: "United States",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "registration_number",
        label: "Registration Number",
        required: true,
        order: 1,
      },
      {
        type: "tax_registration",
        label: "Employer Identification Number (EIN)",
        required: false,
        order: 2,
      },
    ],
  },
  CN: {
    code: "CN",
    name: "China",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "registration_number",
        label: "Unified Social Credit Code",
        required: true,
        order: 1,
      },
      {
        type: "tax_registration",
        label: "Tax Registration Number",
        required: false,
        order: 2,
      },
    ],
  },
  IN: {
    code: "IN",
    name: "India",
    allowExtraIdentifiers: true,
    fields: [
      {
        type: "registration_number",
        label: "CIN / Registration Number",
        required: true,
        order: 1,
      },
      {
        type: "tax_registration",
        label: "GSTIN",
        required: false,
        order: 2,
      },
    ],
  },
};

export const countryOptions = [...registrationCountries].sort((a, b) => {
  if (a.code === DEFAULT_COUNTRY_CODE) return -1;
  if (b.code === DEFAULT_COUNTRY_CODE) return 1;
  return a.name.localeCompare(b.name);
});

export function getCountryRegistrationConfig(
  countryCode: string | null | undefined,
): CountryRegistrationConfig {
  const code = normalizeCountryCode(countryCode);
  const named = countryConfigs[code];
  if (named) return named;

  const country = registrationCountries.find((item) => item.code === code);
  return {
    code,
    name: country?.name ?? code,
    ...fallbackConfig,
  };
}

export function normalizeCountryCode(value: string | null | undefined) {
  if (!value?.trim()) return DEFAULT_COUNTRY_CODE;
  const trimmed = value.trim();
  if (trimmed.length === 2) return trimmed.toUpperCase();

  const byName = registrationCountries.find(
    (item) => item.name.toLowerCase() === trimmed.toLowerCase(),
  );
  return byName?.code ?? trimmed;
}

export function formatCountryName(countryCode: string | null | undefined) {
  if (!countryCode?.trim()) return "";
  const code = normalizeCountryCode(countryCode);
  return (
    registrationCountries.find((item) => item.code === code)?.name ??
    countryConfigs[code]?.name ??
    countryCode.trim()
  );
}

export function isPrimaryIdentifierType(type: string, fields: CountryIdentifierField[]) {
  const required = fields.filter((field) => field.required);
  return (required[0] ?? fields[0])?.type === type;
}

export function emptyCustomIdentifier(): OrganizationIdentifierInput {
  return {
    type: "custom",
    label: "",
    value: "",
    isPrimary: false,
  };
}

export function identifiersForCountry(
  countryCode: string,
  existing: OrganizationIdentifierInput[] = [],
): OrganizationIdentifierInput[] {
  const config = getCountryRegistrationConfig(countryCode);
  const configuredTypes = new Set(config.fields.map((field) => field.type));
  const existingByType = new Map(
    existing
      .filter((item) => item.type !== "custom")
      .map((item) => [item.type, item]),
  );

  const configured = [...config.fields]
    .sort((a, b) => a.order - b.order)
    .map((field) => {
      const previous = existingByType.get(field.type);
      return {
        type: field.type,
        label: field.label,
        value: previous?.value ?? "",
        isPrimary: isPrimaryIdentifierType(field.type, config.fields),
        issuingAuthority: previous?.issuingAuthority,
        expiryDate: previous?.expiryDate,
      };
    });

  const extras = config.allowExtraIdentifiers
    ? existing.filter((item) => {
        if (!item.value.trim() && !item.label.trim()) return false;
        if (item.type === "custom") return true;
        return !configuredTypes.has(item.type as IdentifierType);
      })
    : [];

  return [...configured, ...extras];
}

export function normalizeIdentifiers(
  values: OrganizationIdentifierInput[] | undefined,
  countryCode: string,
) {
  const config = getCountryRegistrationConfig(countryCode);

  return (values ?? [])
    .map((item, index) => {
      const value = item.value.trim();
      const label = item.label.trim();
      if (!value) return null;

      const field = config.fields.find((entry) => entry.type === item.type);
      return {
        type: item.type || "custom",
        label: label || field?.label || "Identifier",
        value,
        isPrimary: Boolean(
          item.isPrimary ||
            (field && isPrimaryIdentifierType(field.type, config.fields)),
        ),
        issuingAuthority: item.issuingAuthority?.trim() || undefined,
        expiryDate: item.expiryDate?.trim() || undefined,
        sortOrder: index,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);
}

export function validateRequiredIdentifiers(
  countryCode: string,
  identifiers: OrganizationIdentifierInput[] | undefined,
) {
  const config = getCountryRegistrationConfig(countryCode);
  const byType = new Map((identifiers ?? []).map((item) => [item.type, item]));

  for (const field of config.fields) {
    if (!field.required) continue;
    if (!byType.get(field.type)?.value.trim()) {
      return `${field.label} is required`;
    }
  }

  return "";
}

const LEGACY_REGISTRATION_TYPES = [
  "commercial_registration",
  "company_registration",
  "registration_number",
  "uen",
] as const;

const LEGACY_TAX_TYPES = [
  "vat_registration",
  "tax_registration",
  "gst_registration",
] as const;

export function legacyRegistrationFromIdentifiers(
  identifiers: ReturnType<typeof normalizeIdentifiers>,
) {
  const registration = identifiers.find((item) =>
    LEGACY_REGISTRATION_TYPES.includes(
      item.type as (typeof LEGACY_REGISTRATION_TYPES)[number],
    ),
  );
  const tax = identifiers.find((item) =>
    LEGACY_TAX_TYPES.includes(item.type as (typeof LEGACY_TAX_TYPES)[number]),
  );

  return {
    commercialRegistration: registration?.value ?? null,
    vatAccountNumber: tax?.value ?? null,
  };
}

export function identifiersFromLegacyColumns(organization: {
  country?: string | null;
  commercialRegistration?: string | null;
  vatAccountNumber?: string | null;
}): OrganizationIdentifierInput[] {
  const config = getCountryRegistrationConfig(organization.country);
  const values: OrganizationIdentifierInput[] = identifiersForCountry(
    config.code,
  );

  const registration = organization.commercialRegistration?.trim();
  const tax = organization.vatAccountNumber?.trim();

  return values.map((item) => {
    if (
      registration &&
      LEGACY_REGISTRATION_TYPES.includes(
        item.type as (typeof LEGACY_REGISTRATION_TYPES)[number],
      )
    ) {
      return { ...item, value: registration };
    }
    if (
      tax &&
      LEGACY_TAX_TYPES.includes(item.type as (typeof LEGACY_TAX_TYPES)[number])
    ) {
      return { ...item, value: tax };
    }
    return item;
  });
}
