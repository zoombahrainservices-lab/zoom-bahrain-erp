"use client";

import { useEffect, useState } from "react";

import { ContactKindPills } from "@/components/contact-kind-pills";
import type { ContactKind } from "@/db/schema";
import { contactEmailLabelOptions } from "@/lib/contact-fields";
import {
  identifiersForCountry,
  registrationCountries,
} from "@/lib/country-registration";
import {
  companyEmailLabelOptions,
  organizationTypeOptions,
  type OrganizationTypeValue,
} from "@/lib/organization-fields";

export const NEW_PARTY = "new-party";

const inputClass =
  "mt-1 block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 dark:bg-white/5 dark:text-white dark:outline-white/10";

const labelClass = "block text-sm font-medium text-zinc-600 dark:text-zinc-300";

export type PersonDraft = {
  name: string;
  position: string;
  mobiles: string[];
  emails: Array<{ label: string; email: string }>;
  notes: string;
  kinds: ContactKind[];
  organizationId: string;
};

export type CompanyDraft = {
  name: string;
  country: string;
  role: OrganizationTypeValue;
  natureOfBusiness: string;
  registeredAddress: string;
  website: string;
  phone: string;
  email: string;
  notes: string;
  identifiers: Array<{ type: string; label: string; value: string }>;
  personName: string;
  personPosition: string;
  personMobile: string;
  personEmail: string;
};

export type RegisteredParty = {
  id: string;
  name: string;
  code: string | null;
};

export function emptyPersonDraft(): PersonDraft {
  return {
    name: "",
    position: "",
    mobiles: [""],
    emails: [{ label: "work", email: "" }],
    notes: "",
    kinds: [],
    organizationId: "",
  };
}

export function emptyCompanyDraft(role: OrganizationTypeValue = "client"): CompanyDraft {
  return {
    name: "",
    country: "BH",
    role,
    natureOfBusiness: "",
    registeredAddress: "",
    website: "",
    phone: "",
    email: "",
    notes: "",
    identifiers: identifiersForCountry("BH").map((item) => ({
      type: item.type,
      label: item.label,
      value: "",
    })),
    personName: "",
    personPosition: "",
    personMobile: "",
    personEmail: "",
  };
}

export function PersonFields({
  value,
  onChange,
  company,
  onCompanyChange,
}: {
  value: PersonDraft;
  onChange: (value: PersonDraft) => void;
  company?: CompanyDraft;
  onCompanyChange?: (value: CompanyDraft) => void;
}) {
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; orgCode: string | null }>>([]);

  useEffect(() => {
    void fetch("/api/organizations")
      .then((response) => response.json())
      .then((data: { organizations?: Array<{ id: string; name: string; orgCode: string | null }> }) => {
        setOrganizations(data.organizations ?? []);
      })
      .catch(() => setOrganizations([]));
  }, []);

  function set<K extends keyof PersonDraft>(key: K, next: PersonDraft[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:col-span-4">
      <label className={labelClass}>
        Name
        <input className={inputClass} value={value.name} onChange={(event) => set("name", event.target.value)} required />
      </label>
      <label className={labelClass}>
        Position
        <input className={inputClass} value={value.position} onChange={(event) => set("position", event.target.value)} />
      </label>
      <RepeatText
        label="Mobile"
        values={value.mobiles}
        onChange={(mobiles) => set("mobiles", mobiles)}
        type="tel"
        addLabel="Add another mobile"
      />
      <RepeatEmail
        label="Email"
        values={value.emails}
        options={contactEmailLabelOptions}
        onChange={(emails) => set("emails", emails)}
      />
      <label className={`${labelClass} sm:col-span-2`}>
        Company
        <select
          className={inputClass}
          value={value.organizationId}
          onChange={(event) => set("organizationId", event.target.value)}
        >
          <option value="">No company — person only</option>
          <option value={NEW_PARTY}>New company</option>
          {organizations.map((organization) => (
            <option key={organization.id} value={organization.id}>
              {organization.name}
              {organization.orgCode ? ` · ${organization.orgCode}` : ""}
            </option>
          ))}
        </select>
      </label>
      {value.organizationId === NEW_PARTY && company && onCompanyChange ? (
        <div className="sm:col-span-2">
          <CompanyFields value={company} onChange={onCompanyChange} hidePerson />
        </div>
      ) : null}
      <div className="sm:col-span-2">
        <span className={labelClass}>If they are ours</span>
        <div className="mt-1.5">
          <ContactKindPills value={value.kinds} onChange={(kinds) => set("kinds", kinds)} />
        </div>
        <p className="mt-1 text-xs text-zinc-500">Leave empty for a client or supplier person.</p>
      </div>
      <label className={`${labelClass} sm:col-span-2`}>
        Notes
        <textarea className={inputClass} rows={3} value={value.notes} onChange={(event) => set("notes", event.target.value)} />
      </label>
    </div>
  );
}

export function CompanyFields({
  value,
  onChange,
  hidePerson = false,
}: {
  value: CompanyDraft;
  onChange: (value: CompanyDraft) => void;
  hidePerson?: boolean;
}) {
  function set<K extends keyof CompanyDraft>(key: K, next: CompanyDraft[K]) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="grid gap-3 rounded-lg bg-zinc-50 p-3 sm:grid-cols-2 dark:bg-white/5">
      <label className={labelClass}>
        Legal company name
        <input className={inputClass} value={value.name} onChange={(event) => set("name", event.target.value)} required />
      </label>
      <label className={labelClass}>
        Country of registration
        <select
          className={inputClass}
          value={value.country}
          onChange={(event) => {
            const country = event.target.value;
            onChange({
              ...value,
              country,
              identifiers: identifiersForCountry(country).map((item) => ({
                type: item.type,
                label: item.label,
                value: value.identifiers.find((current) => current.type === item.type)?.value ?? "",
              })),
            });
          }}
        >
          {registrationCountries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Type
        <select
          className={inputClass}
          value={value.role}
          onChange={(event) => set("role", event.target.value as OrganizationTypeValue)}
        >
          {organizationTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        Nature of business
        <input className={inputClass} value={value.natureOfBusiness} onChange={(event) => set("natureOfBusiness", event.target.value)} />
      </label>
      {value.identifiers.map((identifier, index) => (
        <label key={identifier.type} className={labelClass}>
          {identifier.label}
          <input
            className={inputClass}
            value={identifier.value}
            onChange={(event) => {
              const identifiers = value.identifiers.map((item, itemIndex) =>
                itemIndex === index ? { ...item, value: event.target.value } : item,
              );
              set("identifiers", identifiers);
            }}
          />
        </label>
      ))}
      <label className={`${labelClass} sm:col-span-2`}>
        Registered address
        <input className={inputClass} value={value.registeredAddress} onChange={(event) => set("registeredAddress", event.target.value)} />
      </label>
      <label className={labelClass}>
        Company phone
        <input className={inputClass} type="tel" value={value.phone} onChange={(event) => set("phone", event.target.value)} />
      </label>
      <label className={labelClass}>
        Company email
        <input className={inputClass} type="email" value={value.email} onChange={(event) => set("email", event.target.value)} />
      </label>
      <label className={labelClass}>
        Website
        <input className={inputClass} value={value.website} onChange={(event) => set("website", event.target.value)} />
      </label>
      <label className={labelClass}>
        Notes
        <input className={inputClass} value={value.notes} onChange={(event) => set("notes", event.target.value)} />
      </label>
      {hidePerson ? null : (
        <>
          <p className={`${labelClass} sm:col-span-2`}>Person at this company</p>
          <label className={labelClass}>
            Person name
            <input className={inputClass} value={value.personName} onChange={(event) => set("personName", event.target.value)} />
          </label>
          <label className={labelClass}>
            Position
            <input className={inputClass} value={value.personPosition} onChange={(event) => set("personPosition", event.target.value)} />
          </label>
          <label className={labelClass}>
            Mobile
            <input className={inputClass} type="tel" value={value.personMobile} onChange={(event) => set("personMobile", event.target.value)} />
          </label>
          <label className={labelClass}>
            Email
            <input className={inputClass} type="email" value={value.personEmail} onChange={(event) => set("personEmail", event.target.value)} />
          </label>
        </>
      )}
    </div>
  );
}

export async function registerCompany(value: CompanyDraft, includePerson = true): Promise<RegisteredParty> {
  const response = await fetch("/api/organizations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: value.name.trim(),
      country: value.country,
      roles: [value.role],
      natureOfBusiness: value.natureOfBusiness,
      registeredAddress: value.registeredAddress,
      website: value.website,
      notes: value.notes,
      status: "active",
      companyPhones: value.phone.trim() ? [value.phone.trim()] : [],
      companyEmails: value.email.trim()
        ? [{ label: companyEmailLabelOptions[0].value, email: value.email.trim() }]
        : [],
      identifiers: value.identifiers.map((item, index) => ({
        type: item.type,
        label: item.label,
        value: item.value.trim(),
        isPrimary: index === 0,
      })),
      contacts:
        includePerson && value.personName.trim()
          ? [
              {
                name: value.personName.trim(),
                position: value.personPosition,
                mobiles: value.personMobile.trim() ? [value.personMobile.trim()] : [],
                emails: value.personEmail.trim()
                  ? [{ label: "work", email: value.personEmail.trim() }]
                  : [],
              },
            ]
          : [],
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Could not register the company");
  const organization = data.organization as { id?: string; name?: string; orgCode?: string | null } | undefined;
  if (!organization?.id) throw new Error("Could not register the company");
  return { id: organization.id, name: organization.name ?? value.name, code: organization.orgCode ?? null };
}

export async function registerPerson(value: PersonDraft, company?: CompanyDraft): Promise<RegisteredParty> {
  let organizationId = value.organizationId;
  if (organizationId === NEW_PARTY) {
    if (!company?.name.trim()) throw new Error("Enter the company name");
    const created = await registerCompany(company, false);
    organizationId = created.id;
  }
  const response = await fetch("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: value.name.trim(),
      position: value.position,
      mobiles: value.mobiles,
      emails: value.emails,
      notes: value.notes,
      kinds: value.kinds,
      organizationId: organizationId || undefined,
      status: "active",
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Could not register the person");
  const contact = data.contact as { id?: string; name?: string | null; contactCode?: string | null } | undefined;
  if (!contact?.id) throw new Error("Could not register the person");
  return { id: contact.id, name: contact.name ?? value.name, code: contact.contactCode ?? null };
}

function RepeatText({
  label,
  values,
  onChange,
  type,
  addLabel,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  type: "tel" | "email";
  addLabel: string;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="mt-1 space-y-2">
        {values.map((item, index) => (
          <input
            key={index}
            type={type}
            className={inputClass}
            value={item}
            onChange={(event) =>
              onChange(values.map((current, itemIndex) => (itemIndex === index ? event.target.value : current)))
            }
          />
        ))}
        <button type="button" className="text-sm font-medium text-zoom-dark" onClick={() => onChange([...values, ""])}>
          + {addLabel}
        </button>
      </div>
    </div>
  );
}

function RepeatEmail({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: Array<{ label: string; email: string }>;
  options: readonly { value: string; label: string }[];
  onChange: (values: Array<{ label: string; email: string }>) => void;
}) {
  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="mt-1 space-y-2">
        {values.map((item, index) => (
          <div key={index} className="flex gap-2">
            <select
              className={inputClass}
              value={item.label}
              onChange={(event) =>
                onChange(values.map((current, itemIndex) =>
                  itemIndex === index ? { ...current, label: event.target.value } : current,
                ))
              }
            >
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="email"
              className={inputClass}
              value={item.email}
              onChange={(event) =>
                onChange(values.map((current, itemIndex) =>
                  itemIndex === index ? { ...current, email: event.target.value } : current,
                ))
              }
            />
          </div>
        ))}
        <button
          type="button"
          className="text-sm font-medium text-zoom-dark"
          onClick={() => onChange([...values, { label: options[0]?.value ?? "work", email: "" }])}
        >
          + Add another email
        </button>
      </div>
    </div>
  );
}
