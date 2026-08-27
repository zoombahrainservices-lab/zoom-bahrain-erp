"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/catalyst/button";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { ContactKindPills } from "@/components/contact-kind-pills";
import {
  type ContactFormInput,
  contactEmailLabelOptions,
  emptyContactForm,
  parseContactKinds,
} from "@/lib/contact-fields";
import {
  type LabeledEmail,
  type OrganizationContactPerson,
} from "@/lib/organization-fields";

const selectClassName =
  "h-full shrink-0 rounded-l-md border-0 bg-zinc-50 py-1.5 pr-8 pl-3 text-sm text-zinc-600 outline-none dark:bg-white/10 dark:text-zinc-300";

const groupedInputClassName =
  "flex rounded-md bg-white outline-1 -outline-offset-1 outline-zinc-200 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-indigo-500";

const groupedEmailInputClassName =
  "block min-w-0 grow rounded-r-md border-0 bg-transparent py-1.5 pr-3 pl-2 text-sm text-zinc-900 focus:outline-none dark:text-white";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const textareaClassName =
  "block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm font-medium text-zinc-500 dark:text-zinc-400";

function FormField({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className={labelClassName}>
        {label}
      </label>
      <div className="mt-1.5">{children}</div>
    </div>
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
  options,
  addLabel,
  idPrefix,
}: {
  label: string;
  values: LabeledEmail[];
  onChange: (values: LabeledEmail[]) => void;
  options: readonly { value: string; label: string }[];
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
                id={`${idPrefix}-label-${index}`}
                value={entry.label}
                onChange={(e) => updateEntry(index, { label: e.target.value })}
                className={selectClassName}
                aria-label="Email type"
              >
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                id={`${idPrefix}-${index}`}
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
            onChange([...values, { label: options[0]?.value ?? "work", email: "" }])
          }
          className="text-sm/6 font-semibold text-indigo-600 hover:text-indigo-500"
        >
          + {addLabel}
        </button>
      </div>
    </div>
  );
}

type ContactWizardProps = {
  onCancel?: () => void;
};

export function ContactWizard({ onCancel }: ContactWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState<ContactFormInput>(emptyContactForm);
  const [organizationId, setOrganizationId] = useState("");
  const [organizations, setOrganizations] = useState<
    Array<{ id: string; name: string; orgCode: string | null }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const kind = searchParams.get("kind");
    if (kind) {
      setForm((current) => ({
        ...current,
        kinds: parseContactKinds([kind, ...current.kinds]),
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    void fetch("/api/organizations")
      .then((response) => response.json())
      .then((data: { organizations?: Array<{ id: string; name: string; orgCode: string | null }> }) => {
        setOrganizations(data.organizations ?? []);
      })
      .catch(() => {
        setOrganizations([]);
      });
  }, []);

  function updateContact(patch: Partial<OrganizationContactPerson>) {
    setForm((current) => ({ ...current, ...patch }));
    setError("");
  }

  async function handleRegister() {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          organizationId: organizationId || undefined,
          status: "active",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to register contact");
      }

      if (data.contact?.id) {
        router.push(`/contacts/${data.contact.id}`);
      } else {
        router.push("/contacts");
      }
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to register contact",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleCancel() {
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/contacts");
  }

  return (
    <div className="flex min-h-svh w-full flex-col lg:flex-row lg:items-stretch">
      <aside className="shrink-0 border-b border-zinc-200 px-8 py-10 lg:w-72 lg:border-b-0 lg:border-r lg:px-0 lg:py-10 lg:pl-8 lg:pr-10 xl:w-80">
        <Heading level={2}>Add new contact</Heading>
        <Text className="mt-1">
          A contact is a person — not a company. Tag staff or candidate only if
          that is who they are.
        </Text>
        <div className="mt-6">
          <Button href="/contacts" outline>
            Back to list
          </Button>
        </div>
      </aside>

      <div className="hidden w-px shrink-0 bg-zinc-200 lg:block" aria-hidden />

      <main className="min-w-0 flex-1 px-8 py-10 lg:px-10 xl:px-12">
        <div className="mx-auto max-w-3xl">
          <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
            <div className="sm:col-span-3">
              <FormField id="contact-name" label="Name">
                <input
                  id="contact-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => updateContact({ name: e.target.value })}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <div className="sm:col-span-3">
              <FormField id="contact-position" label="Position">
                <input
                  id="contact-position"
                  type="text"
                  value={form.position}
                  onChange={(e) => updateContact({ position: e.target.value })}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <RepeatableContactField
              label="Mobile"
              values={form.mobiles}
              onChange={(values) => updateContact({ mobiles: values })}
              type="tel"
              addLabel="Add another mobile"
              idPrefix="contact-mobile"
            />

            <RepeatableLabeledEmailField
              label="Email"
              values={form.emails}
              onChange={(values) => updateContact({ emails: values })}
              options={contactEmailLabelOptions}
              addLabel="Add another email"
              idPrefix="contact-email"
            />

            <div className="sm:col-span-6">
              <FormField id="contact-organization" label="Company (optional)">
                <select
                  id="contact-organization"
                  value={organizationId}
                  onChange={(event) => setOrganizationId(event.target.value)}
                  className={inputClassName}
                >
                  <option value="">No company — person only</option>
                  {organizations.map((organization) => (
                    <option key={organization.id} value={organization.id}>
                      {organization.name}
                      {organization.orgCode ? ` · ${organization.orgCode}` : ""}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="sm:col-span-6">
              <FormField id="contact-kinds" label="If they are ours">
                <ContactKindPills
                  value={form.kinds}
                  onChange={(kinds) =>
                    setForm((current) => ({ ...current, kinds }))
                  }
                />
                <p className="mt-1.5 text-xs text-zinc-500">
                  Leave empty for a normal person at a client or supplier.
                </p>
              </FormField>
            </div>

            <div className="sm:col-span-6">
              <FormField id="contact-notes" label="Notes">
                <textarea
                  id="contact-notes"
                  rows={4}
                  value={form.notes}
                  onChange={(e) =>
                    setForm((current) => ({ ...current, notes: e.target.value }))
                  }
                  className={textareaClassName}
                />
              </FormField>
            </div>
          </div>

          {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button onClick={handleRegister} disabled={loading}>
              {loading ? "Registering…" : "Register contact"}
            </Button>
            <Button outline onClick={handleCancel} disabled={loading}>
              Cancel
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
