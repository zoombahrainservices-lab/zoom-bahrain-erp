"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, BadgeButton } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import {
  DescriptionDetails,
  DescriptionList,
  DescriptionTerm,
} from "@/components/catalyst/description-list";
import { Heading } from "@/components/catalyst/heading";
import { ContactKindPills } from "@/components/contact-kind-pills";
import { ContactImages } from "@/components/contact-images";
import { ContactOrganizationModal } from "@/components/contact-organization-modal";
import { CopyableFieldValue } from "@/components/copyable-field-value";
import { DescriptionCard } from "@/components/description-card";
import { PartyFiles } from "@/components/party-files";
import { ReachChips } from "@/components/reach-chips";
import type { RelatedOperations } from "@/lib/create-operation";
import {
  type ContactFormInput,
  type ContactOrganizationSummary,
  type ContactRecord,
  contactEmailLabelOptions,
  contactRecordToForm,
  formatContactKinds,
  getContactDisplayName,
  getContactEmails,
  getContactKinds,
  getContactMobiles,
} from "@/lib/contact-fields";
import {
  type LabeledEmail,
  getEmailLabelDisplayName,
} from "@/lib/organization-fields";

type ContactDetailClientProps = {
  contact: ContactRecord;
  driveConnected: boolean;
  isAdmin: boolean;
  files?: RelatedOperations;
};

const selectClassName =
  "h-full shrink-0 rounded-l-md border-0 bg-zinc-50 py-1.5 pr-8 pl-3 text-sm text-zinc-600 outline-none";

const groupedInputClassName =
  "flex rounded-md bg-white outline-1 -outline-offset-1 outline-zinc-200 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600";

const groupedEmailInputClassName =
  "block min-w-0 grow rounded-r-md border-0 bg-transparent py-1.5 pr-3 pl-2 text-sm text-zinc-900 focus:outline-none";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600";

const textareaClassName =
  "block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600";

const labelClassName = "block text-sm font-medium text-zinc-500";

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

function RepeatableContactField({
  label,
  values,
  onChange,
  type,
  addLabel,
  idPrefix,
}: {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  type: "tel" | "email";
  addLabel: string;
  idPrefix: string;
}) {
  function updateValue(index: number, value: string) {
    onChange(values.map((current, i) => (i === index ? value : current)));
  }

  return (
    <div className="sm:col-span-3">
      <span className={labelClassName}>{label}</span>
      <div className="mt-1.5 space-y-3">
        {values.map((value, index) => (
          <div key={index} className="flex items-center gap-3">
            <input
              id={`${idPrefix}-${index}`}
              type={type}
              value={value}
              onChange={(e) => updateValue(index, e.target.value)}
              className={inputClassName}
            />
            {values.length > 1 ? (
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="shrink-0 text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() => onChange([...values, ""])}
          className="text-sm/6 font-semibold text-indigo-600 hover:text-indigo-500"
        >
          + {addLabel}
        </button>
      </div>
    </div>
  );
}

function RepeatableLabeledEmailField({
  label,
  values,
  onChange,
  addLabel,
  idPrefix,
}: {
  label: string;
  values: LabeledEmail[];
  onChange: (values: LabeledEmail[]) => void;
  addLabel: string;
  idPrefix: string;
}) {
  function updateEntry(index: number, patch: Partial<LabeledEmail>) {
    onChange(
      values.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );
  }

  return (
    <div className="sm:col-span-3">
      <span className={labelClassName}>{label}</span>
      <div className="mt-1.5 space-y-3">
        {values.map((entry, index) => (
          <div key={index} className="flex items-center gap-3">
            <div className={`${groupedInputClassName} min-w-0 flex-1`}>
              <select
                value={entry.label}
                onChange={(e) => updateEntry(index, { label: e.target.value })}
                className={selectClassName}
                aria-label="Email type"
              >
                {contactEmailLabelOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                type="email"
                value={entry.email}
                onChange={(e) => updateEntry(index, { email: e.target.value })}
                className={groupedEmailInputClassName}
              />
            </div>
            {values.length > 1 ? (
              <button
                type="button"
                onClick={() => onChange(values.filter((_, i) => i !== index))}
                className="shrink-0 text-sm font-semibold text-gray-500 hover:text-gray-700"
              >
                Remove
              </button>
            ) : null}
          </div>
        ))}
        <button
          type="button"
          onClick={() =>
            onChange([
              ...values,
              { label: contactEmailLabelOptions[0]?.value ?? "work", email: "" },
            ])
          }
          className="text-sm/6 font-semibold text-indigo-600 hover:text-indigo-500"
        >
          + {addLabel}
        </button>
      </div>
    </div>
  );
}

export function ContactDetailClient({
  contact: initialContact,
  driveConnected,
  isAdmin,
  files,
}: ContactDetailClientProps) {
  const router = useRouter();
  const [contact, setContact] = useState(initialContact);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ContactFormInput>(() =>
    contactRecordToForm(initialContact),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [orgModalOpen, setOrgModalOpen] = useState(false);

  const mobiles = getContactMobiles(contact);
  const emails = getContactEmails(contact);

  function startEditing() {
    setForm(contactRecordToForm(contact));
    setError("");
    setEditing(true);
  }

  function cancelEditing() {
    setForm(contactRecordToForm(contact));
    setError("");
    setEditing(false);
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/contacts/${contact.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as {
        contact?: ContactRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save contact");
      }

      if (data.contact) {
        setContact(data.contact);
        setForm(contactRecordToForm(data.contact));
        setEditing(false);
        router.refresh();
      }
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save contact",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleOrganizationSaved(
    organization: ContactOrganizationSummary | null,
  ) {
    setContact((current) => ({
      ...current,
      organizationId: organization?.id ?? null,
      organization,
    }));
    router.refresh();
  }

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button href="/contacts" outline>
            Back to contacts
          </Button>
          <Button
            href={`/operations/new?party=contact&contactId=${contact.id}&entryType=note`}
            outline
          >
            Open as operation
          </Button>
        </div>
        {isAdmin && !editing ? (
          <Button onClick={startEditing}>Edit contact</Button>
        ) : null}
        {isAdmin && editing ? (
          <div className="flex gap-2">
            <Button outline onClick={cancelEditing} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="mb-10 border-b border-zinc-200 pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Heading>{getContactDisplayName(contact)}</Heading>
            {contact.position?.trim() && !editing ? (
              <p className="mt-1 text-sm text-zinc-600">{contact.position}</p>
            ) : null}
            {!editing ? (
              <div className="mt-2">
                <ReachChips
                  phone={getContactMobiles(contact)[0]}
                  email={getContactEmails(contact)[0]?.email}
                  message={`Hi ${getContactDisplayName(contact)}`}
                />
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-md bg-zinc-100 px-2.5 py-1 font-mono text-sm text-zinc-600">
                {contact.contactCode}
              </span>
              {getContactKinds(contact).length > 0 ? (
                <Badge color="blue">
                  {formatContactKinds(getContactKinds(contact))}
                </Badge>
              ) : (
                <Badge color="zinc">Person</Badge>
              )}
              {contact.organization ? (
                <>
                  {isAdmin ? (
                    <BadgeButton
                      color="blue"
                      onClick={() => setOrgModalOpen(true)}
                    >
                      {contact.organization.name}
                      {contact.organization.orgCode
                        ? ` · ${contact.organization.orgCode}`
                        : ""}
                    </BadgeButton>
                  ) : (
                    <BadgeButton
                      href={`/organizations/${contact.organization.id}`}
                      color="blue"
                    >
                      {contact.organization.name}
                      {contact.organization.orgCode
                        ? ` · ${contact.organization.orgCode}`
                        : ""}
                    </BadgeButton>
                  )}
                  {isAdmin ? (
                    <Button
                      href={`/organizations/${contact.organization.id}`}
                      outline
                      className="!px-2.5 !py-1 text-xs"
                    >
                      Open organization
                    </Button>
                  ) : null}
                </>
              ) : isAdmin ? (
                <BadgeButton color="zinc" onClick={() => setOrgModalOpen(true)}>
                  Not linked to an organization
                </BadgeButton>
              ) : (
                <Badge color="zinc">Not linked to an organization</Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {isAdmin ? (
        <ContactOrganizationModal
          contactId={contact.id}
          currentOrganization={contact.organization}
          open={orgModalOpen}
          onClose={() => setOrgModalOpen(false)}
          onSaved={handleOrganizationSaved}
        />
      ) : null}

      {files ? (
        <div className="mb-8">
          <PartyFiles
            files={files}
            empty="No operations for this person yet. Open as operation to start one."
          />
        </div>
      ) : null}

      <DescriptionCard
        variant="accent"
        layout="content"
        title="Contact details"
        contentClassName="px-4 py-0 sm:px-6 sm:py-0"
      >
        {editing ? (
          <div className="py-6">
            <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
              <div className="sm:col-span-3">
                <label htmlFor="edit-name" className={labelClassName}>
                  Name
                </label>
                <input
                  id="edit-name"
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, name: e.target.value }))
                  }
                  className={`${inputClassName} mt-1.5`}
                />
              </div>
              <div className="sm:col-span-3">
                <label htmlFor="edit-position" className={labelClassName}>
                  Position
                </label>
                <input
                  id="edit-position"
                  type="text"
                  value={form.position}
                  onChange={(e) =>
                    setForm((current) => ({
                      ...current,
                      position: e.target.value,
                    }))
                  }
                  className={`${inputClassName} mt-1.5`}
                />
              </div>

              <div className="sm:col-span-6">
                <p className={labelClassName}>If they are ours</p>
                <div className="mt-1.5">
                  <ContactKindPills
                    value={form.kinds}
                    onChange={(kinds) =>
                      setForm((current) => ({ ...current, kinds }))
                    }
                  />
                </div>
              </div>

              <RepeatableContactField
                label="Mobile"
                values={form.mobiles}
                onChange={(values) =>
                  setForm((current) => ({ ...current, mobiles: values }))
                }
                type="tel"
                addLabel="Add another mobile"
                idPrefix="edit-mobile"
              />

              <RepeatableLabeledEmailField
                label="Email"
                values={form.emails}
                onChange={(values) =>
                  setForm((current) => ({ ...current, emails: values }))
                }
                addLabel="Add another email"
                idPrefix="edit-email"
              />

              <div className="sm:col-span-6">
                <label htmlFor="edit-notes" className={labelClassName}>
                  Notes
                </label>
                <textarea
                  id="edit-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, notes: e.target.value }))
                  }
                  className={`${textareaClassName} mt-1.5`}
                />
              </div>
            </div>
            {error ? (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            ) : null}
          </div>
        ) : (
          <DescriptionList>
            <DetailRow label="Name" value={contact.name} />
            <DetailRow label="Position" value={contact.position} />

            {mobiles.length > 0 ? (
              <>
                <DescriptionTerm>Mobile</DescriptionTerm>
                <DescriptionDetails className="space-y-2">
                  {mobiles.map((phone, index) => (
                    <CopyableFieldValue
                      key={index}
                      value={phone}
                      variant="phone"
                    />
                  ))}
                </DescriptionDetails>
              </>
            ) : null}

            {emails.length > 0 ? (
              <div
                className="col-span-1 border-t border-zinc-950/5 sm:col-span-2"
                aria-hidden
              />
            ) : null}

            {emails.map((entry, index) => (
              <div key={index} className="contents">
                <DescriptionTerm
                  className={
                    index === 0 ? "!border-t-0 sm:!border-t-0" : undefined
                  }
                >
                  Email{" "}
                  {getEmailLabelDisplayName(
                    entry.label,
                    contactEmailLabelOptions,
                  )}
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

            <DetailRow label="Notes" value={contact.notes} />
          </DescriptionList>
        )}
      </DescriptionCard>

      <div className="mt-8">
        <ContactImages
          contactId={contact.id}
          contactCode={contact.contactCode}
          driveConnected={driveConnected}
          isAdmin={isAdmin}
        />
      </div>
    </>
  );
}
