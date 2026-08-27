"use client";

import { ChevronRightIcon, UserIcon } from "@heroicons/react/16/solid";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Badge, BadgeButton } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/catalyst/dialog";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from "@/components/catalyst/description-list";
import { Heading } from "@/components/catalyst/heading";
import { CopyableFieldValue } from "@/components/copyable-field-value";
import { DescriptionCard } from "@/components/description-card";
import { PartyFiles } from "@/components/party-files";
import type { RelatedOperations } from "@/lib/create-operation";
import { ReachChips } from "@/components/reach-chips";
import { OrganizationFiles } from "@/components/organization-files";
import { OrganizationLinkContactModal } from "@/components/organization-link-contact-modal";
import { OrganizationLogo } from "@/components/organization-logo";
import {
  type OrganizationContactPerson,
  type OrganizationRecord,
  companyEmailLabelOptions,
  contactEmailLabelOptions,
  formatOrganizationTypes,
  getOrganizationContacts,
  getOrganizationIdentifiers,
  getCompanyEmails,
  getCompanyPhones,
  getEmailLabelDisplayName,
  getOrganizationTypes,
  hasOrganizationTypes,
  organizationTypeOptions,
  type OrganizationTypeValue,
} from "@/lib/organization-fields";
import {
  countryOptions,
  formatCountryName,
  normalizeCountryCode,
} from "@/lib/country-registration";

type OrganizationDetailClientProps = {
  organization: OrganizationRecord;
  driveConnected: boolean;
  isAdmin: boolean;
  files?: RelatedOperations;
};

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <>
      <DescriptionTerm>{label}</DescriptionTerm>
      <DescriptionDetails>
        <CopyableFieldValue value={value} />
      </DescriptionDetails>
    </>
  );
}

function OrganizationContactModal({
  contact,
  open,
  onClose,
}: {
  contact: OrganizationContactPerson | null;
  open: boolean;
  onClose: () => void;
}) {
  const name = contact?.name.trim() || "Unnamed contact";

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogTitle>{name}</DialogTitle>
      {contact?.position?.trim() ? (
        <DialogDescription>{contact.position}</DialogDescription>
      ) : null}
      {contact?.code ? (
        <div className="mt-3">
          <Badge color="zinc" className="font-mono">
            {contact.code}
          </Badge>
        </div>
      ) : null}
      <DialogBody>
        {contact ? (
          <DescriptionList>
            {contact.mobiles.length > 0 ? (
              <>
                <DescriptionTerm>Mobile</DescriptionTerm>
                <DescriptionDetails className="space-y-2">
                  {contact.mobiles.map((mobile) => (
                    <CopyableFieldValue
                      key={mobile}
                      value={mobile}
                      variant="phone"
                    />
                  ))}
                </DescriptionDetails>
              </>
            ) : null}

            {contact.emails.map((entry, index) => (
              <div key={`${entry.label}-${entry.email}-${index}`} className="contents">
                <DescriptionTerm>
                  Email{" "}
                  {getEmailLabelDisplayName(
                    entry.label,
                    contactEmailLabelOptions,
                  )}
                </DescriptionTerm>
                <DescriptionDetails>
                  <CopyableFieldValue value={entry.email} />
                </DescriptionDetails>
              </div>
            ))}

            <DetailRow label="Notes" value={contact.notes} />
          </DescriptionList>
        ) : null}
      </DialogBody>
      <DialogActions>
        <Button type="button" outline onClick={onClose}>
          Close
        </Button>
        {contact?.id ? (
          <Button href={`/contacts/${contact.id}`}>Open contact</Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

function OrganizationTypeModal({
  organization,
  open,
  onClose,
  onSaved,
}: {
  organization: OrganizationRecord;
  open: boolean;
  onClose: () => void;
  onSaved: (organization: OrganizationRecord) => void;
}) {
  const [selectedTypes, setSelectedTypes] = useState<OrganizationTypeValue[]>(
    getOrganizationTypes(organization),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setSelectedTypes(getOrganizationTypes(organization));
      setError("");
    }
  }, [open, organization]);

  function toggleType(type: OrganizationTypeValue) {
    setSelectedTypes((current) =>
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type],
    );
  }

  async function handleSave() {
    if (selectedTypes.length === 0) {
      setError("Select at least one organization type");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roles: selectedTypes }),
      });
      const data = (await response.json()) as {
        organization?: OrganizationRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update types");
      }

      if (data.organization) {
        onSaved(data.organization);
        onClose();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to update types",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogTitle>Organization type</DialogTitle>
      <DialogDescription>
        Change how Zoom classifies this org. The org ID never changes.
      </DialogDescription>
      <DialogBody>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {organizationTypeOptions.map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 text-sm text-zinc-900"
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(option.value)}
                onChange={() => toggleType(option.value)}
                className="size-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
              />
              {option.label}
            </label>
          ))}
        </div>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </DialogBody>
      <DialogActions>
        <Button type="button" outline onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save type"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function OrganizationCountryModal({
  organization,
  open,
  onClose,
  onSaved,
}: {
  organization: OrganizationRecord;
  open: boolean;
  onClose: () => void;
  onSaved: (organization: OrganizationRecord) => void;
}) {
  const [country, setCountry] = useState(
    normalizeCountryCode(organization.country),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setCountry(normalizeCountryCode(organization.country));
      setError("");
    }
  }, [open, organization]);

  async function handleSave() {
    const nextCountry = normalizeCountryCode(country);
    const currentCountry = normalizeCountryCode(organization.country);
    const hasIdentifiers = Boolean(
      organization.identifiers?.length ||
        organization.commercialRegistration ||
        organization.vatAccountNumber,
    );

    if (nextCountry !== currentCountry && hasIdentifiers) {
      const confirmed = window.confirm(
        "Change country of registration? Existing identifier values will be kept. Field labels may no longer match until they are updated.",
      );
      if (!confirmed) return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/organizations/${organization.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: nextCountry }),
      });
      const data = (await response.json()) as {
        organization?: OrganizationRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update country");
      }

      if (data.organization) {
        onSaved(data.organization);
        onClose();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update country",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogTitle>Country of Registration</DialogTitle>
      <DialogDescription>
        This determines which registration and tax identifier fields apply.
      </DialogDescription>
      <DialogBody>
        <select
          id="org-country-edit"
          value={country}
          onChange={(event) => setCountry(event.target.value)}
          className="block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
        >
          {countryOptions.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
      </DialogBody>
      <DialogActions>
        <Button type="button" outline onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={loading}>
          {loading ? "Saving…" : "Save country"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function OrganizationDetailClient({
  organization: initialOrganization,
  driveConnected,
  isAdmin,
  files,
}: OrganizationDetailClientProps) {
  const router = useRouter();
  const [organization, setOrganization] = useState(initialOrganization);

  const companyPhones = getCompanyPhones(organization);
  const companyEmails = getCompanyEmails(organization);
  const contacts = getOrganizationContacts(organization);
  const identifiers = getOrganizationIdentifiers(organization);
  const [logoVersion, setLogoVersion] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [countryModalOpen, setCountryModalOpen] = useState(false);
  const [linkContactModalOpen, setLinkContactModalOpen] = useState(false);
  const [selectedContactIndex, setSelectedContactIndex] = useState<number | null>(
    null,
  );
  const logoInputRef = useRef<HTMLInputElement>(null);
  const selectedContact =
    selectedContactIndex !== null ? (contacts[selectedContactIndex] ?? null) : null;

  useEffect(() => {
    setOrganization(initialOrganization);
  }, [initialOrganization]);

  const organizationTypes = getOrganizationTypes(organization);
  const typeLabel = hasOrganizationTypes(organization.roles)
    ? formatOrganizationTypes(organizationTypes)
    : "Not set";
  const typeBadgeColor = hasOrganizationTypes(organization.roles) ? "blue" : "orange";

  async function handleLogoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setLogoUploading(true);
    setLogoError("");

    try {
      const formData = new FormData();
      formData.append("logo", file);
      const response = await fetch(`/api/organizations/${organization.id}/logo`, {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        organization?: OrganizationRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to upload logo");
      }

      if (data.organization) {
        setOrganization(data.organization);
        setLogoVersion((current) => current + 1);
      }
    } catch (uploadError) {
      setLogoError(
        uploadError instanceof Error ? uploadError.message : "Failed to upload logo",
      );
    } finally {
      setLogoUploading(false);
      event.target.value = "";
    }
  }

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <div className="flex flex-wrap gap-2">
          <Button href="/organizations" outline>
            ← Back to organizations
          </Button>
          <Button
            href={`/operations/new?party=organization&organizationId=${organization.id}&entryType=note`}
            outline
          >
            Open as operation
          </Button>
        </div>

        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <Heading>{organization.name}</Heading>
            <div className="mt-2">
              <ReachChips
                phone={getCompanyPhones(organization)[0]}
                email={getCompanyEmails(organization)[0]?.email}
                message={`Hi, following up with ${organization.name}`}
                subject={organization.name}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {organization.orgCode ? (
                <Badge color="zinc" className="font-mono">
                  {organization.orgCode}
                </Badge>
              ) : null}
              {isAdmin ? (
                <BadgeButton
                  color={typeBadgeColor}
                  onClick={() => setTypeModalOpen(true)}
                >
                  {typeLabel}
                </BadgeButton>
              ) : (
                <Badge color={typeBadgeColor}>{typeLabel}</Badge>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-2">
            <OrganizationLogo
              key={logoVersion}
              organizationId={organization.id}
              name={organization.name}
              hasLogo={Boolean(organization.logoDriveFileId)}
              size="header"
            />
            {isAdmin && driveConnected ? (
              <>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  disabled={logoUploading}
                  onChange={handleLogoUpload}
                  className="sr-only"
                />
                <button
                  type="button"
                  disabled={logoUploading}
                  onClick={() => logoInputRef.current?.click()}
                  className="text-xs font-normal text-indigo-600 hover:text-indigo-500 disabled:opacity-50"
                >
                  {logoUploading
                    ? "Uploading…"
                    : organization.logoDriveFileId
                      ? "Replace logo"
                      : "Upload logo"}
                </button>
                {logoError ? (
                  <p className="text-right text-sm text-red-600">{logoError}</p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {files ? (
        <PartyFiles
          files={files}
          empty="No operations for this company yet. Open as operation to start one."
        />
      ) : null}

      {isAdmin ? (
        <>
          <OrganizationTypeModal
            organization={organization}
            open={typeModalOpen}
            onClose={() => setTypeModalOpen(false)}
            onSaved={(updated) => {
              setOrganization(updated);
              router.refresh();
            }}
          />
          <OrganizationCountryModal
            organization={organization}
            open={countryModalOpen}
            onClose={() => setCountryModalOpen(false)}
            onSaved={(updated) => {
              setOrganization(updated);
              router.refresh();
            }}
          />
        </>
      ) : null}

      <DescriptionCard
        variant="accent"
        layout="content"
        title="Company"
        contentClassName="px-4 py-0 sm:px-6 sm:py-0"
      >
        <DescriptionList>
          <DetailRow label="Legal company name" value={organization.name} />
          <DetailRow
            label="Nature of business"
            value={organization.natureOfBusiness}
          />
          <DescriptionTerm>Country of Registration</DescriptionTerm>
          <DescriptionDetails>
            {isAdmin ? (
              <BadgeButton
                color={organization.country?.trim() ? "zinc" : "orange"}
                onClick={() => setCountryModalOpen(true)}
              >
                {formatCountryName(organization.country) || "Not set"}
              </BadgeButton>
            ) : (
              <CopyableFieldValue
                value={formatCountryName(organization.country) || "—"}
              />
            )}
          </DescriptionDetails>
          {identifiers.map((identifier) => (
            <DetailRow
              key={`${identifier.type}-${identifier.label}`}
              label={identifier.label}
              value={identifier.value}
            />
          ))}
          <DetailRow
            label="Registered address"
            value={organization.registeredAddress}
          />
          {companyPhones.length > 0 ? (
            <>
              <DescriptionTerm>Company phone</DescriptionTerm>
              <DescriptionDetails className="space-y-2">
                {companyPhones.map((phone, index) => (
                  <CopyableFieldValue
                    key={index}
                    value={phone}
                    variant="phone"
                  />
                ))}
              </DescriptionDetails>
            </>
          ) : null}
          <DetailRow label="Website" value={organization.website} />
          {companyEmails.length > 0 ? (
            <div
              className="col-span-1 border-t border-zinc-950/5 sm:col-span-2 dark:border-white/5"
              aria-hidden
            />
          ) : null}
          {companyEmails.map((entry, index) => (
            <div key={index} className="contents">
              <DescriptionTerm
                className={
                  index === 0 ? "!border-t-0 sm:!border-t-0" : undefined
                }
              >
                Email{" "}
                {getEmailLabelDisplayName(entry.label, companyEmailLabelOptions)}
              </DescriptionTerm>
              <DescriptionDetails
                className={
                  index === 0 ? "!border-t-0 sm:!border-t-0" : undefined
                }
              >
                <CopyableFieldValue value={entry.email} />
              </DescriptionDetails>
            </div>
          ))}
        </DescriptionList>
      </DescriptionCard>

      <DescriptionCard
        variant="accent"
        layout="content"
        title="Contacts"
        contentClassName="p-0"
      >
        {isAdmin ? (
          <div className="flex justify-end border-b border-zinc-950/5 px-4 py-3 sm:px-6">
            <Button outline onClick={() => setLinkContactModalOpen(true)}>
              Link existing contact
            </Button>
          </div>
        ) : null}
        {contacts.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-500 sm:px-6">
            No contacts linked to this organization.
          </p>
        ) : (
          <ul className="divide-y divide-zinc-950/5">
            {contacts.map((contact, index) => {
              const displayName = contact.name.trim() || "Unnamed contact";
              const reach = [
                contact.mobiles[0],
                contact.emails[0]?.email,
              ].filter(Boolean);

              return (
                <li key={contact.id ?? contact.code ?? index}>
                  <button
                    type="button"
                    onClick={() => setSelectedContactIndex(index)}
                    aria-label={`View contact details for ${displayName}`}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-zoom-palest focus:outline-none focus-visible:bg-zoom-palest sm:px-6"
                  >
                    <UserIcon className="size-5 shrink-0 text-zoom-medium" />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium text-zinc-950">
                        {displayName}
                      </span>
                      {contact.position.trim() ? (
                        <span className="text-zinc-500">
                          {" "}
                          · {contact.position}
                        </span>
                      ) : null}
                      {reach.length > 0 ? (
                        <span className="text-zinc-500">
                          {" "}
                          · {reach.join(" · ")}
                        </span>
                      ) : null}
                    </span>
                    <ChevronRightIcon className="size-4 shrink-0 text-zinc-400" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DescriptionCard>

      <OrganizationContactModal
        contact={selectedContact}
        open={selectedContact !== null}
        onClose={() => setSelectedContactIndex(null)}
      />

      <OrganizationLinkContactModal
        organizationId={organization.id}
        organizationName={organization.name}
        open={linkContactModalOpen}
        onClose={() => setLinkContactModalOpen(false)}
        onLinked={() => router.refresh()}
      />

      <OrganizationFiles
        organizationId={organization.id}
        orgCode={organization.orgCode}
        driveConnected={driveConnected}
      />
    </div>
  );
}
