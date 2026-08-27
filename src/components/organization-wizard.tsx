"use client";

import { DocumentDuplicateIcon } from "@heroicons/react/16/solid";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/catalyst/button";
import { Heading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import {
  type OrganizationContactPerson,
  type OrganizationWizardInput,
  companyEmailLabelOptions,
  contactEmailLabelOptions,
  emptyContactPerson,
  emptyOrganizationWizard,
  getContactHeading,
  organizationTypeOptions,
  type OrganizationTypeValue,
  type LabeledEmail,
} from "@/lib/organization-fields";
import {
  DEFAULT_COUNTRY_CODE,
  countryOptions,
  emptyCustomIdentifier,
  getCountryRegistrationConfig,
  identifiersForCountry,
  validateRequiredIdentifiers,
} from "@/lib/country-registration";
import {
  buildNatureOfBusinessChatGptPrompt,
  copyTextToClipboard,
} from "@/lib/nature-of-business-prompt";
import { inquiryToOrganizationWizardPrefill } from "@/lib/inquiry-fields";
import type { InquiryRecord } from "@/lib/inquiry-fields";

const steps = [
  { id: "company", label: "Company" },
  { id: "contacts", label: "Contacts" },
  { id: "type", label: "Organization type" },
] as const;

const selectClassName =
  "h-full shrink-0 rounded-l-md border-0 bg-zinc-50 py-1.5 pr-8 pl-3 text-sm text-zinc-600 outline-none dark:bg-white/10 dark:text-zinc-300";

const groupedInputClassName =
  "flex rounded-md bg-white outline-1 -outline-offset-1 outline-zinc-200 focus-within:outline-2 focus-within:-outline-offset-2 focus-within:outline-indigo-600 dark:bg-white/5 dark:outline-white/10 dark:focus-within:outline-indigo-500";

const groupedEmailInputClassName =
  "block min-w-0 grow rounded-r-md border-0 bg-transparent py-1.5 pr-3 pl-2 text-sm text-zinc-900 placeholder:font-normal placeholder:text-zinc-400 focus:outline-none dark:text-white dark:placeholder:text-zinc-500";

const inputClassName =
  "block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 placeholder:font-normal placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-zinc-500 dark:focus:outline-indigo-500";

const textareaClassName =
  "block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 placeholder:font-normal placeholder:text-zinc-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 dark:bg-white/5 dark:text-white dark:outline-white/10 dark:placeholder:text-zinc-500 dark:focus:outline-indigo-500";

const labelClassName =
  "block text-sm font-medium text-zinc-500 dark:text-zinc-400";

const logoPreviewImageClassName =
  "h-16 w-auto max-w-full object-contain object-left";

function FormField({
  id,
  label,
  required,
  helpText,
  labelExtra,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  labelExtra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <label htmlFor={id} className={labelClassName}>
          {label}
          {required ? <span className="text-red-600"> *</span> : null}
        </label>
        {labelExtra}
      </div>
      <div className="mt-1.5">{children}</div>
      {helpText ? (
        <p className="mt-1.5 text-xs text-zinc-500">{helpText}</p>
      ) : null}
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
            onChange([...values, { label: options[0]?.value ?? "general", email: "" }])
          }
          className="text-sm/6 font-semibold text-indigo-600 hover:text-indigo-500"
        >
          + {addLabel}
        </button>
      </div>
    </div>
  );
}

function ContactPersonFields({
  idPrefix,
  contact,
  onChange,
}: {
  idPrefix: string;
  contact: OrganizationContactPerson;
  onChange: (patch: Partial<OrganizationContactPerson>) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-6">
      <div className="sm:col-span-3">
        <FormField id={`${idPrefix}-name`} label="Name">
          <input
            id={`${idPrefix}-name`}
            type="text"
            value={contact.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={inputClassName}
          />
        </FormField>
      </div>

      <div className="sm:col-span-3">
        <FormField id={`${idPrefix}-position`} label="Position">
          <input
            id={`${idPrefix}-position`}
            type="text"
            value={contact.position}
          onChange={(e) => onChange({ position: e.target.value })}
          className={inputClassName}
          />
        </FormField>
      </div>

      <RepeatableContactField
        label="Mobile"
        values={contact.mobiles ?? [""]}
        onChange={(values) => onChange({ mobiles: values })}
        type="tel"
        addLabel="Add another mobile"
        idPrefix={`${idPrefix}-mobile`}
      />

      <RepeatableLabeledEmailField
        label="Email"
        values={contact.emails ?? [{ label: "work", email: "" }]}
        onChange={(values) => onChange({ emails: values })}
        options={contactEmailLabelOptions}
        addLabel="Add another email"
        idPrefix={`${idPrefix}-email`}
      />
    </div>
  );
}

type OrganizationWizardProps = {
  onCancel?: () => void;
};

export function OrganizationWizard({ onCancel }: OrganizationWizardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inquiryId = searchParams.get("inquiryId");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<OrganizationWizardInput>(emptyOrganizationWizard);
  const [loading, setLoading] = useState(false);
  const [naturePromptCopied, setNaturePromptCopied] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoDragOver, setLogoDragOver] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!inquiryId) return;

    fetch(`/api/sales/inquiries/${inquiryId}`)
      .then((response) => response.json())
      .then((data: { inquiry?: InquiryRecord; error?: string }) => {
        if (!data.inquiry || data.inquiry.status === "converted") return;

        const prefill = inquiryToOrganizationWizardPrefill(data.inquiry);
        setForm((current) => ({
          ...current,
          name: prefill.name,
          notes: prefill.notes,
          contacts: prefill.contacts,
          roles: current.roles.length > 0 ? current.roles : ["client"],
        }));
      })
      .catch(() => {
        // Inquiry prefill is optional.
      });
  }, [inquiryId]);

  const contacts = form.contacts ?? [emptyContactPerson()];
  const countryCode = form.country || DEFAULT_COUNTRY_CODE;
  const countryConfig = getCountryRegistrationConfig(countryCode);
  const identifiers = form.identifiers ?? [];
  const extraIdentifiers = identifiers.filter(
    (item) =>
      item.type === "custom" ||
      !countryConfig.fields.some((field) => field.type === item.type),
  );

  function updateField<K extends keyof OrganizationWizardInput>(
    key: K,
    value: OrganizationWizardInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setError("");
  }

  function changeCountry(nextCode: string) {
    if (nextCode === countryCode) return;

    const hasValues = identifiers.some((item) => item.value.trim());
    if (hasValues) {
      const confirmed = window.confirm(
        "Change country of registration? Matching identifier values will be kept. Extra identifier fields that the new country does not use will be removed.",
      );
      if (!confirmed) return;
    }

    setForm((current) => ({
      ...current,
      country: nextCode,
      identifiers: identifiersForCountry(nextCode, current.identifiers),
    }));
    setError("");
  }

  function updateIdentifier(
    type: string,
    patch: Partial<(typeof identifiers)[number]>,
  ) {
    setForm((current) => {
      const next = [...(current.identifiers ?? [])];
      const index = next.findIndex((item) => item.type === type);
      if (index >= 0) {
        next[index] = { ...next[index], ...patch };
      } else {
        next.push({
          type,
          label: patch.label ?? "",
          value: patch.value ?? "",
          ...patch,
        });
      }
      return { ...current, identifiers: next };
    });
    setError("");
  }

  function updateExtraIdentifier(
    extraIndex: number,
    patch: Partial<(typeof identifiers)[number]>,
  ) {
    setForm((current) => {
      const config = getCountryRegistrationConfig(
        current.country || DEFAULT_COUNTRY_CODE,
      );
      let seen = -1;
      const next = (current.identifiers ?? []).map((item) => {
        const isExtra =
          item.type === "custom" ||
          !config.fields.some((field) => field.type === item.type);
        if (!isExtra) return item;
        seen += 1;
        if (seen !== extraIndex) return item;
        return { ...item, ...patch };
      });
      return { ...current, identifiers: next };
    });
    setError("");
  }

  function removeExtraIdentifier(extraIndex: number) {
    setForm((current) => {
      const config = getCountryRegistrationConfig(
        current.country || DEFAULT_COUNTRY_CODE,
      );
      let seen = -1;
      const next = (current.identifiers ?? []).filter((item) => {
        const isExtra =
          item.type === "custom" ||
          !config.fields.some((field) => field.type === item.type);
        if (!isExtra) return true;
        seen += 1;
        return seen !== extraIndex;
      });
      return { ...current, identifiers: next };
    });
  }

  function updateContact(index: number, patch: Partial<OrganizationContactPerson>) {
    setForm((current) => {
      const nextContacts = [...(current.contacts ?? [emptyContactPerson()])];
      nextContacts[index] = { ...nextContacts[index], ...patch };
      return { ...current, contacts: nextContacts };
    });
  }

  function toggleType(type: OrganizationTypeValue) {
    setForm((current) => {
      const next = current.roles.includes(type)
        ? current.roles.filter((item) => item !== type)
        : [...current.roles, type];
      return { ...current, roles: next };
    });
    setError("");
  }

  function validateStep(currentStep: number) {
    if (currentStep === 0) {
      if (!form.name.trim()) {
        setError("Legal company name is required");
        return false;
      }
      if (!form.country?.trim()) {
        setError("Country of registration is required");
        return false;
      }
      const identifierError = validateRequiredIdentifiers(
        form.country,
        form.identifiers,
      );
      if (identifierError) {
        setError(identifierError);
        return false;
      }
    }
    if (currentStep === 2 && form.roles.length === 0) {
      setError("Select at least one organization type");
      return false;
    }
    setError("");
    return true;
  }

  function goNext() {
    if (!validateStep(step)) return;
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  function goBack() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function handleCopyNaturePrompt() {
    setError("");

    try {
      const prompt = buildNatureOfBusinessChatGptPrompt({
        companyName: form.name.trim(),
        website: form.website?.trim() || undefined,
      });
      await copyTextToClipboard(prompt);
      setNaturePromptCopied(true);
      window.setTimeout(() => setNaturePromptCopied(false), 2500);
    } catch {
      setError("Could not copy prompt — try again or copy manually");
    }
  }

  async function handleRegister() {
    if (!validateStep(0) || !validateStep(2)) {
      if (form.roles.length === 0) setStep(2);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      const payload = {
        ...form,
        status: inquiryId ? "lead" : "active",
        ...(inquiryId ? { inquiryId } : {}),
      };
      formData.append("data", JSON.stringify(payload));
      if (logoFile) {
        formData.append("logo", logoFile);
      }

      const response = await fetch("/api/organizations", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to register organization");
      }

      router.push(
        data.operation?.id
          ? `/operations/${data.operation.id}`
          : data.organization?.id
            ? `/organizations/${data.organization.id}`
            : "/organizations",
      );
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to register organization",
      );
    } finally {
      setLoading(false);
    }
  }

  function applyLogoFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Logo must be an image file");
      return;
    }

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFile(file);
    setLogoPreviewUrl(URL.createObjectURL(file));
    setError("");
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    applyLogoFile(file);
  }

  function handleRemoveLogo() {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    setLogoFile(null);
    setLogoPreviewUrl(null);
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
    setError("");
  }

  function handleLogoDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setLogoDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      applyLogoFile(file);
    }
  }

  function handleLogoDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setLogoDragOver(true);
  }

  function handleLogoDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setLogoDragOver(false);
  }

  function handleCancel() {
    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }
    if (onCancel) {
      onCancel();
      return;
    }
    router.push("/organizations");
  }

  return (
    <div className="flex min-h-svh w-full flex-col lg:flex-row lg:items-stretch">
      <aside className="shrink-0 border-b border-zinc-200 px-8 py-10 lg:w-72 lg:border-b-0 lg:border-r lg:px-0 lg:py-10 lg:pl-8 lg:pr-10 xl:w-80">
        <Heading level={2}>Add new organization</Heading>
        <Text className="mt-1">
          Step {step + 1} of {steps.length}: {steps[step].label}
        </Text>
        <div className="mt-6">
          <Button href="/organizations" outline>
            Back to list
          </Button>
        </div>

        <nav aria-label="Progress" className="mt-10">
          <ol className="flex flex-col gap-2">
            {steps.map((item, index) => {
              const isActive = index === step;
              const isComplete = index < step;
              return (
                <li key={item.id}>
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm font-medium ${
                      isActive
                        ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                        : isComplete
                          ? "border-green-200 bg-green-50 text-green-700"
                          : "border-zinc-200 bg-white text-zinc-500"
                    }`}
                  >
                    {index + 1}. {item.label}
                  </div>
                </li>
              );
            })}
          </ol>
        </nav>
      </aside>

      <div className="min-w-0 flex-1 border-t border-zinc-200 px-8 py-10 lg:border-t-0 lg:px-14 lg:py-10">
        {step === 0 ? (
          <div className="space-y-10">
            <div className="border-b border-zinc-100 pb-10 dark:border-white/10">
              <FormField id="org-name" label="Legal company name" required>
                <input
                  id="org-name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClassName}
                />
              </FormField>
            </div>

            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
              <FormField id="org-website" label="Website">
                <input
                  id="org-website"
                  type="text"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className={inputClassName}
                />
              </FormField>
              <div className="sm:col-span-2">
                <FormField
                  id="org-nature"
                  label="Nature of business"
                  labelExtra={
                    <button
                      type="button"
                      onClick={handleCopyNaturePrompt}
                      title={
                        naturePromptCopied
                          ? "Copied!"
                          : "Copy ChatGPT prompt to clipboard"
                      }
                      aria-label="Copy ChatGPT prompt for nature of business"
                      className={`inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors ${
                        naturePromptCopied
                          ? "bg-green-100 text-green-700"
                          : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 hover:text-indigo-700"
                      }`}
                    >
                      <DocumentDuplicateIcon className="size-4" />
                    </button>
                  }
                >
                  {naturePromptCopied ? (
                    <p className="mb-2 text-xs text-green-600">
                      Prompt copied — paste into ChatGPT, then paste the answer
                      here.
                    </p>
                  ) : null}
                  <textarea
                    id="org-nature"
                    rows={3}
                    value={form.natureOfBusiness}
                    onChange={(e) => updateField("natureOfBusiness", e.target.value)}
                    className={textareaClassName}
                  />
                </FormField>
              </div>
              <FormField
                id="org-country"
                label="Country of Registration"
                required
              >
                <select
                  id="org-country"
                  required
                  value={countryCode}
                  onChange={(e) => changeCountry(e.target.value)}
                  className={inputClassName}
                >
                  {countryOptions.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField id="org-address" label="Registered address">
                <textarea
                  id="org-address"
                  rows={3}
                  value={form.registeredAddress}
                  onChange={(e) => updateField("registeredAddress", e.target.value)}
                  className={textareaClassName}
                />
              </FormField>
              {countryCode
                ? countryConfig.fields.map((field) => {
                    const current =
                      identifiers.find((item) => item.type === field.type) ?? {
                        type: field.type,
                        label: field.label,
                        value: "",
                        isPrimary: field.required,
                      };

                    return (
                      <FormField
                        key={field.type}
                        id={`org-identifier-${field.type}`}
                        label={field.label}
                        required={field.required}
                        helpText={field.helpText}
                      >
                        <input
                          id={`org-identifier-${field.type}`}
                          type="text"
                          required={field.required}
                          value={current.value}
                          onChange={(e) =>
                            updateIdentifier(field.type, {
                              label: field.label,
                              value: e.target.value,
                              isPrimary: field.required,
                            })
                          }
                          className={inputClassName}
                        />
                      </FormField>
                    );
                  })
                : null}
              {countryCode && countryConfig.allowExtraIdentifiers ? (
                <div className="sm:col-span-2 space-y-4">
                  {extraIdentifiers.map((item, index) => (
                    <div
                      key={`extra-${index}`}
                      className="grid gap-4 sm:grid-cols-2"
                    >
                      <FormField
                        id={`org-extra-label-${index}`}
                        label="Identifier name"
                      >
                        <input
                          id={`org-extra-label-${index}`}
                          type="text"
                          value={item.label}
                          onChange={(e) =>
                            updateExtraIdentifier(index, {
                              label: e.target.value,
                              type: "custom",
                            })
                          }
                          className={inputClassName}
                        />
                      </FormField>
                      <FormField
                        id={`org-extra-value-${index}`}
                        label="Identifier number"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            id={`org-extra-value-${index}`}
                            type="text"
                            value={item.value}
                            onChange={(e) =>
                              updateExtraIdentifier(index, {
                                value: e.target.value,
                              })
                            }
                            className={inputClassName}
                          />
                          <button
                            type="button"
                            onClick={() => removeExtraIdentifier(index)}
                            className="shrink-0 text-sm font-semibold text-gray-500 hover:text-gray-700"
                          >
                            Remove
                          </button>
                        </div>
                      </FormField>
                    </div>
                  ))}
                  {countryConfig.allowExtraIdentifiers ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          identifiers: [
                            ...(current.identifiers ?? []),
                            emptyCustomIdentifier(),
                          ],
                        }))
                      }
                      className="text-sm/6 font-semibold text-indigo-600 hover:text-indigo-500"
                    >
                      + Add another identifier
                    </button>
                  ) : null}
                </div>
              ) : null}
              <div className="sm:col-span-2">
                <FormField id="org-logo" label="Logo">
                  <div
                    onDrop={handleLogoDrop}
                    onDragOver={handleLogoDragOver}
                    onDragLeave={handleLogoDragLeave}
                    className={`flex flex-wrap items-center gap-4 rounded-lg transition-colors ${
                      logoDragOver
                        ? "bg-indigo-50 ring-2 ring-indigo-300 ring-inset"
                        : ""
                    }`}
                  >
                    {logoPreviewUrl ? (
                      <img
                        src={logoPreviewUrl}
                        alt="Logo preview"
                        className={logoPreviewImageClassName}
                      />
                    ) : null}
                    <input
                      ref={logoInputRef}
                      id="org-logo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoChange}
                      className="sr-only"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        outline
                        onClick={() => logoInputRef.current?.click()}
                      >
                        {logoFile ? "Change logo" : "Choose logo"}
                      </Button>
                      {logoFile ? (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="text-sm font-semibold text-zinc-500 hover:text-zinc-700"
                        >
                          Remove
                        </button>
                      ) : (
                        <span className="text-sm text-zinc-400">
                          or drop an image here
                        </span>
                      )}
                    </div>
                  </div>
                </FormField>
              </div>
            </div>
            <div className="grid gap-x-6 gap-y-8 sm:grid-cols-6">
              <RepeatableContactField
                label="Company phone"
                values={form.companyPhones ?? [""]}
                onChange={(values) => updateField("companyPhones", values)}
                type="tel"
                addLabel="Add another phone"
                idPrefix="org-company-phone"
              />
              <RepeatableLabeledEmailField
                label="Email"
                values={form.companyEmails ?? [{ label: "sales", email: "" }]}
                onChange={(values) => updateField("companyEmails", values)}
                options={companyEmailLabelOptions}
                addLabel="Add another email"
                idPrefix="org-company-email"
              />
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-8">
            <Text>
              People at this organization. Each contact gets a ZGC-CON ID and is
              linked to this org automatically when you register.
            </Text>
            {contacts.map((contact, index) => (
              <div
                key={index}
                className={
                  index > 0 ? "border-t border-zinc-200 pt-8" : undefined
                }
              >
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-500">
                    {getContactHeading(index)}
                  </h3>
                  {index > 0 ? (
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => {
                          const next = [...(current.contacts ?? [])];
                          next.splice(index, 1);
                          return { ...current, contacts: next };
                        })
                      }
                      className="text-sm font-semibold text-zinc-500 hover:text-zinc-700"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <ContactPersonFields
                  idPrefix={`org-contact-${index}`}
                  contact={{
                    ...contact,
                    mobiles: contact.mobiles ?? [""],
                    emails: contact.emails ?? [{ label: "work", email: "" }],
                  }}
                  onChange={(patch) => updateContact(index, patch)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  contacts: [...(current.contacts ?? []), emptyContactPerson()],
                }))
              }
              className="text-sm font-semibold text-indigo-600 hover:text-indigo-500"
            >
              + Add another contact
            </button>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="space-y-6">
            <Text>
              What is this organization to Zoom? Select all that apply. You can
              change types later — the org ID stays locked.
            </Text>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {organizationTypeOptions.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-3 text-sm text-zinc-900"
                >
                  <input
                    type="checkbox"
                    checked={form.roles.includes(option.value)}
                    onChange={() => toggleType(option.value)}
                    className="size-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        ) : null}

        {error ? <p className="mt-6 text-sm text-red-600">{error}</p> : null}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="text-sm font-semibold text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
          >
            Cancel
          </button>
          <div className="flex gap-3">
            {step > 0 ? (
              <Button type="button" outline onClick={goBack} disabled={loading}>
                Back
              </Button>
            ) : null}
            {step < steps.length - 1 ? (
              <Button type="button" onClick={goNext} disabled={loading}>
                Next
              </Button>
            ) : (
              <Button type="button" onClick={handleRegister} disabled={loading}>
                {loading ? "Registering…" : "Register organization"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** @deprecated Use OrganizationWizard */
export const OrganizationRegistrationForm = OrganizationWizard;
