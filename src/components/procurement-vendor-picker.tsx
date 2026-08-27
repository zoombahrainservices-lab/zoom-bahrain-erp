"use client";

import { useEffect, useMemo, useState } from "react";

import { parseOrganizationTypes } from "@/lib/organization-fields";

type VendorContact = {
  id: string;
  name: string | null;
  contactCode: string;
};

type VendorOrganization = {
  id: string;
  name: string;
  orgCode: string | null;
  roles?: string | null;
  contacts?: VendorContact[];
};

type ProcurementVendorPickerProps = {
  organizationId: string | null;
  contactId: string | null;
  organizationName?: string | null;
  contactName?: string | null;
  locked: boolean;
  disabled?: boolean;
  onChange: (next: {
    vendorOrganizationId: string | null;
    vendorContactId: string | null;
  }) => void;
};

export function ProcurementVendorPicker({
  organizationId,
  contactId,
  organizationName,
  contactName,
  locked,
  disabled = false,
  onChange,
}: ProcurementVendorPickerProps) {
  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState<VendorOrganization[]>([]);

  useEffect(() => {
    async function load() {
      const response = await fetch("/api/organizations");
      const data = (await response.json()) as {
        organizations?: VendorOrganization[];
      };
      setOrganizations(data.organizations ?? []);
    }

    void load();
  }, []);

  const selected = organizations.find((item) => item.id === organizationId);
  const contacts = selected?.contacts ?? [];

  const ranked = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = organizations.filter((organization) => {
      if (!query) return true;
      const types = parseOrganizationTypes(organization.roles).join(" ");
      return (
        organization.name.toLowerCase().includes(query) ||
        organization.orgCode?.toLowerCase().includes(query) ||
        types.includes(query)
      );
    });

    return [...filtered].sort((a, b) => {
      const aSupplier = parseOrganizationTypes(a.roles).includes("supplier")
        ? 0
        : 1;
      const bSupplier = parseOrganizationTypes(b.roles).includes("supplier")
        ? 0
        : 1;
      if (aSupplier !== bSupplier) return aSupplier - bSupplier;
      return a.name.localeCompare(b.name);
    });
  }, [organizations, search]);

  const displayName = selected?.name ?? organizationName;
  const displayContact =
    contacts.find((item) => item.id === contactId)?.name ??
    contacts.find((item) => item.id === contactId)?.contactCode ??
    contactName;

  if (locked) {
    return (
      <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200">
        <p className="text-[11px] uppercase tracking-wide text-zinc-400">
          Supplier
        </p>
        <p className="mt-0.5 text-sm font-medium text-zoom-dark">
          {displayName ?? "No supplier attached"}
        </p>
        {displayContact ? (
          <p className="text-xs text-zinc-500">{displayContact}</p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white px-3 py-2 ring-1 ring-zinc-200">
      <p className="text-[11px] uppercase tracking-wide text-zinc-400">
        Supplier
      </p>
      <input
        value={search}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search organizations…"
        className="mt-1 w-full border-0 bg-transparent p-0 text-sm text-zoom-dark placeholder:text-zinc-400 focus:outline-none focus:ring-0"
      />
      <div className="mt-2 max-h-40 space-y-0.5 overflow-y-auto">
        {ranked.slice(0, 12).map((organization) => {
          const isSupplier = parseOrganizationTypes(organization.roles).includes(
            "supplier",
          );
          const active = organization.id === organizationId;
          return (
            <button
              key={organization.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                setSearch("");
                onChange({
                  vendorOrganizationId: organization.id,
                  vendorContactId: null,
                });
              }}
              className={`flex w-full items-center justify-between rounded px-2 py-1 text-left text-sm ${
                active
                  ? "bg-zoom-palest text-zoom-dark"
                  : "text-zinc-700 hover:bg-zinc-50"
              }`}
            >
              <span className="truncate">{organization.name}</span>
              <span className="ml-2 shrink-0 text-[10px] text-zinc-400">
                {isSupplier ? "Supplier" : organization.orgCode}
              </span>
            </button>
          );
        })}
      </div>

      {selected && contacts.length > 0 ? (
        <label className="mt-2 block">
          <span className="text-[11px] uppercase tracking-wide text-zinc-400">
            Contact
          </span>
          <select
            value={contactId ?? ""}
            disabled={disabled}
            onChange={(event) =>
              onChange({
                vendorOrganizationId: organizationId,
                vendorContactId: event.target.value || null,
              })
            }
            className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zoom-dark"
          >
            <option value="">Anyone at this supplier</option>
            {contacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name || contact.contactCode}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
