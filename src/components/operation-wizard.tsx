"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/catalyst/button";
import { Field, Label } from "@/components/catalyst/fieldset";
import { Heading } from "@/components/catalyst/heading";
import { Input } from "@/components/catalyst/input";
import { Text } from "@/components/catalyst/text";
import { Textarea } from "@/components/catalyst/textarea";
import {
  defaultOperationActivityTypes,
  getActivityTypeLabel,
  groupActivityTypes,
} from "@/lib/operation-activity-types";
import { divisionOptions } from "@/lib/operation-fields";
import { titleExamples, wizardSteps } from "@/lib/operation-ui";
import {
  CompanyFields,
  emptyCompanyDraft,
  emptyPersonDraft,
  PersonFields,
  registerCompany,
  registerPerson,
  type CompanyDraft,
  type PersonDraft,
} from "@/components/register-party-panel";

type PartyType = "organization" | "contact";

type OrganizationOption = {
  id: string;
  name: string;
  orgCode: string | null;
};

type ContactOption = {
  id: string;
  name: string | null;
  contactCode: string;
  organization?: { name: string } | null;
};

export function OperationWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(0);
  const [partyType, setPartyType] = useState<PartyType>("organization");
  const [organizationId, setOrganizationId] = useState("");
  const [contactId, setContactId] = useState("");
  const [divisionId, setDivisionId] = useState("group");
  const [title, setTitle] = useState("");
  const [entryType, setEntryType] = useState("note");
  const [search, setSearch] = useState("");
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [person, setPerson] = useState<PersonDraft>(emptyPersonDraft);
  const [company, setCompany] = useState<CompanyDraft>(emptyCompanyDraft("client"));

  useEffect(() => {
    async function loadOptions() {
      const [orgResponse, contactResponse] = await Promise.all([
        fetch("/api/organizations"),
        fetch("/api/contacts"),
      ]);

      const orgData = (await orgResponse.json()) as {
        organizations?: OrganizationOption[];
      };
      const contactData = (await contactResponse.json()) as {
        contacts?: ContactOption[];
      };

      setOrganizations(orgData.organizations ?? []);
      setContacts(contactData.contacts ?? []);
    }

    void loadOptions();
  }, []);

  useEffect(() => {
    const nextDivision = searchParams.get("divisionId");
    const nextTitle = searchParams.get("title");
    const nextContact = searchParams.get("contactId");
    const nextOrg = searchParams.get("organizationId");
    const nextParty = searchParams.get("party");
    const nextEntryType = searchParams.get("entryType");

    if (nextDivision) setDivisionId(nextDivision);
    if (nextTitle) setTitle(nextTitle);
    if (nextContact) {
      setContactId(nextContact);
      setPartyType("contact");
    }
    if (nextOrg) {
      setOrganizationId(nextOrg);
      setPartyType("organization");
    }
    if (nextParty === "contact" || nextParty === "organization") {
      setPartyType(nextParty);
    }
    if (nextEntryType) setEntryType(nextEntryType);
    if ((nextContact || nextOrg) && nextDivision && nextTitle) {
      setStep(2);
    }
  }, [searchParams]);

  const filteredOrganizations = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return organizations;
    return organizations.filter(
      (organization) =>
        organization.name.toLowerCase().includes(query) ||
        organization.orgCode?.toLowerCase().includes(query),
    );
  }, [organizations, search]);

  const filteredContacts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) => {
      const label = [
        contact.name,
        contact.contactCode,
        contact.organization?.name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return label.includes(query);
    });
  }, [contacts, search]);

  const selectedPartyId =
    partyType === "organization" ? organizationId : contactId;

  function canGoNext() {
    if (step === 0) return Boolean(selectedPartyId);
    if (step === 1) return Boolean(divisionId);
    return Boolean(title.trim());
  }

  async function handleSubmit() {
    if (!title.trim()) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId:
            partyType === "organization" ? organizationId : undefined,
          contactId: partyType === "contact" ? contactId : undefined,
          divisionId,
          title: title.trim(),
          entryType,
        }),
      });

      const data = (await response.json()) as {
        operation?: { id: string };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to create operation");
      }

      if (data.operation?.id) {
        router.push(`/operations/${data.operation.id}`);
        router.refresh();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to create operation",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <Heading>New operation</Heading>
      <Text className="mt-2">
        One file for a job. Company or person first — then the Zoom company — then
        the name.
      </Text>

      <div className="mt-6 flex gap-2">
        {wizardSteps.map((item, index) => (
          <div
            key={item.id}
            className={`rounded-lg px-3 py-2 ${
              index === step
                ? "bg-zoom-dark text-white"
                : index < step
                  ? "bg-zoom-palest text-zoom-dark"
                  : "bg-zinc-100 text-zinc-500"
            }`}
          >
            <p className="text-xs font-semibold">
              {index + 1}. {item.label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5">
        {step === 0 ? (
          <div className="space-y-5">
            <div>
              <p className="text-sm font-semibold text-zoom-navy">
                Who is this work about?
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                A company, or a person (client, supplier, or staff).
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => {
                  setPartyType("organization");
                  setContactId("");
                }}
                className={`rounded-lg px-4 py-3 text-left text-sm font-medium ring-1 transition ${
                  partyType === "organization"
                    ? "bg-zoom-palest ring-zoom-medium text-zoom-navy"
                    : "bg-white ring-zinc-200 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Company
                <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                  Client, supplier, hotel, government…
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setPartyType("contact");
                  setOrganizationId("");
                }}
                className={`rounded-lg px-4 py-3 text-left text-sm font-medium ring-1 transition ${
                  partyType === "contact"
                    ? "bg-zoom-palest ring-zoom-medium text-zoom-navy"
                    : "bg-white ring-zinc-200 text-zinc-700 hover:bg-zinc-50"
                }`}
              >
                Person
                <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                  Contact or employee
                </span>
              </button>
            </div>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={
                partyType === "organization"
                  ? "Search companies…"
                  : "Search people…"
              }
            />

            <div className="max-h-80 space-y-2 overflow-y-auto">
              {partyType === "organization"
                ? filteredOrganizations.map((organization) => (
                    <button
                      key={organization.id}
                      type="button"
                      onClick={() => setOrganizationId(organization.id)}
                      className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left ring-1 ${
                        organizationId === organization.id
                          ? "bg-zoom-palest ring-zoom-medium"
                          : "ring-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-950">
                        {organization.name}
                      </span>
                      {organization.orgCode ? (
                        <span className="ml-2 text-xs text-zinc-500">
                          {organization.orgCode}
                        </span>
                      ) : null}
                    </button>
                  ))
                : filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      type="button"
                      onClick={() => setContactId(contact.id)}
                      className={`flex w-full flex-col rounded-lg px-4 py-3 text-left ring-1 ${
                        contactId === contact.id
                          ? "bg-zoom-palest ring-zoom-medium"
                          : "ring-zinc-200 hover:bg-zinc-50"
                      }`}
                    >
                      <span className="text-sm font-medium text-zinc-950">
                        {contact.name ?? contact.contactCode}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {contact.contactCode}
                        {contact.organization?.name
                          ? ` · ${contact.organization.name}`
                          : ""}
                      </span>
                    </button>
                  ))}
            </div>
            <div className="border-t border-zinc-200 pt-4">
              <button
                type="button"
                className="text-sm font-medium text-zoom-dark"
                onClick={() => setRegistering((current) => !current)}
              >
                {registering
                  ? "Close registration"
                  : partyType === "organization"
                    ? "Register a new company"
                    : "Register a new person"}
              </button>
              {registering ? (
                <div className="mt-3 space-y-3">
                  {partyType === "organization" ? (
                    <CompanyFields value={company} onChange={setCompany} />
                  ) : (
                    <PersonFields
                      value={person}
                      onChange={setPerson}
                      company={company}
                      onCompanyChange={setCompany}
                    />
                  )}
                  <Button
                    type="button"
                    disabled={loading}
                    onClick={() => {
                      void (async () => {
                        setLoading(true);
                        setError("");
                        try {
                          if (partyType === "organization") {
                            const created = await registerCompany(company);
                            setOrganizations((current) => [
                              { id: created.id, name: created.name, orgCode: created.code },
                              ...current,
                            ]);
                            setOrganizationId(created.id);
                            setCompany(emptyCompanyDraft("client"));
                          } else {
                            const created = await registerPerson(person, company);
                            setContacts((current) => [
                              {
                                id: created.id,
                                name: created.name,
                                contactCode: created.code ?? "",
                              },
                              ...current,
                            ]);
                            setContactId(created.id);
                            setPerson(emptyPersonDraft());
                          }
                          setRegistering(false);
                        } catch (registerError) {
                          setError(
                            registerError instanceof Error
                              ? registerError.message
                              : "Could not register",
                          );
                        } finally {
                          setLoading(false);
                        }
                      })();
                    }}
                  >
                    {loading ? "Saving…" : "Save and select"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-semibold text-zoom-navy">
                Which Zoom division?
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                The company that owns this work. Use Administration for internal
                jobs that are not a service.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {divisionOptions.map((division) => (
                <button
                  key={division.id}
                  type="button"
                  onClick={() => setDivisionId(division.id)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-left ring-1 ${
                    divisionId === division.id
                      ? "bg-zoom-palest ring-zoom-medium"
                      : "ring-zinc-200 hover:bg-zinc-50"
                  }`}
                >
                  {division.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={division.logo}
                      alt=""
                      className="h-8 w-8 object-contain"
                    />
                  ) : null}
                  <span>
                    <span className="block text-sm font-medium text-zinc-950">
                      {division.name}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {division.acronym}
                      {division.internal ? " · Internal" : ""}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <Field>
            <Label>What is this operation called?</Label>
            <Text className="mt-1 text-sm text-zinc-500">
              A short name. Daily updates go in the thread after you create it.
            </Text>
            <Textarea
              rows={3}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. MIT Technical Seminar, Warehouse enquiry, Staff visa follow-up…"
              className="mt-3"
            />
            <div className="mt-4">
              <p className="text-xs font-medium text-zinc-500">First activity</p>
              <p className="mt-0.5 text-xs text-zinc-400">
                What this file opens as. You can add more on the thread.
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {groupActivityTypes(defaultOperationActivityTypes)
                  .flatMap((group) => group.items)
                  .slice(0, 16)
                  .map((type) => (
                    <button
                      key={type.slug}
                      type="button"
                      onClick={() => setEntryType(type.slug)}
                      className={
                        entryType === type.slug
                          ? "rounded-md bg-zoom-dark px-2 py-1 text-xs font-medium text-white"
                          : "rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 hover:bg-zinc-200"
                      }
                    >
                      {type.label}
                    </button>
                  ))}
              </div>
              <p className="mt-2 text-xs text-zinc-500">
                Opening as {getActivityTypeLabel(entryType)}.
              </p>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {titleExamples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setTitle(example)}
                  className="rounded-full bg-zoom-palest px-2.5 py-1 text-xs text-zoom-dark hover:bg-zoom-pale"
                >
                  {example}
                </button>
              ))}
            </div>
          </Field>
        ) : null}

        {error ? <Text className="mt-4 text-red-600">{error}</Text> : null}
      </div>

      <div className="mt-6 flex justify-between">
        <Button
          type="button"
          outline
          disabled={step === 0 || loading}
          onClick={() => setStep((current) => Math.max(0, current - 1))}
        >
          Back
        </Button>

        {step < wizardSteps.length - 1 ? (
          <Button
            type="button"
            disabled={!canGoNext() || loading}
            onClick={() => setStep((current) => current + 1)}
          >
            Next
          </Button>
        ) : (
          <Button
            type="button"
            disabled={!canGoNext() || loading}
            onClick={() => void handleSubmit()}
          >
            {loading ? "Creating…" : "Create operation"}
          </Button>
        )}
      </div>
    </div>
  );
}
