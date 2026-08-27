"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/catalyst/button";
import {
  Dialog,
  DialogActions,
  DialogBody,
  DialogDescription,
  DialogTitle,
} from "@/components/catalyst/dialog";
import { Text } from "@/components/catalyst/text";
import { type ContactOrganizationSummary } from "@/lib/contact-fields";

type ContactOrganizationModalProps = {
  contactId: string;
  currentOrganization: ContactOrganizationSummary | null | undefined;
  open: boolean;
  onClose: () => void;
  onSaved: (organization: ContactOrganizationSummary | null) => void;
};

type OrganizationOption = {
  id: string;
  name: string;
  orgCode: string | null;
};

export function ContactOrganizationModal({
  contactId,
  currentOrganization,
  open,
  onClose,
  onSaved,
}: ContactOrganizationModalProps) {
  const [organizations, setOrganizations] = useState<OrganizationOption[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setSelectedId(currentOrganization?.id ?? "");
    setError("");
    setLoadingOrgs(true);

    fetch("/api/organizations")
      .then((response) => response.json())
      .then((data: { organizations?: OrganizationOption[] }) => {
        setOrganizations(
          (data.organizations ?? []).filter((org) => org.orgCode),
        );
      })
      .finally(() => setLoadingOrgs(false));
  }, [open, currentOrganization?.id]);

  async function handleSave() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/contacts/${contactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: selectedId || null,
        }),
      });
      const data = (await response.json()) as {
        contact?: { organization?: ContactOrganizationSummary | null };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update organization link");
      }

      onSaved(data.contact?.organization ?? null);
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update organization link",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogTitle>Linked organization</DialogTitle>
      <DialogDescription>
        Choose which organization this contact belongs to, or leave them
        unlinked.
      </DialogDescription>
      <DialogBody>
        {loadingOrgs ? (
          <Text>Loading organizations...</Text>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Organization
            </label>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
            >
              <option value="">No organization</option>
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                  {organization.orgCode ? ` (${organization.orgCode})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}
        {error ? <Text className="mt-4 text-red-600">{error}</Text> : null}
      </DialogBody>
      <DialogActions>
        <Button outline onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading || loadingOrgs}>
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
