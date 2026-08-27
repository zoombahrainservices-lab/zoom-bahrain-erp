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

type OrganizationLinkContactModalProps = {
  organizationId: string;
  organizationName: string;
  open: boolean;
  onClose: () => void;
  onLinked: () => void;
};

type ContactOption = {
  id: string;
  contactCode: string;
  name: string | null;
  position: string | null;
  organizationId: string | null;
};

export function OrganizationLinkContactModal({
  organizationId,
  organizationName,
  open,
  onClose,
  onLinked,
}: OrganizationLinkContactModalProps) {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    setSelectedId("");
    setError("");
    setLoadingContacts(true);

    fetch("/api/contacts")
      .then((response) => response.json())
      .then((data: { contacts?: ContactOption[] }) => {
        setContacts(
          (data.contacts ?? []).filter((contact) => !contact.organizationId),
        );
      })
      .finally(() => setLoadingContacts(false));
  }, [open]);

  async function handleSave() {
    if (!selectedId) {
      setError("Select a contact to link");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/contacts/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organizationId }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to link contact");
      }

      onLinked();
      onClose();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to link contact",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogTitle>Link existing contact</DialogTitle>
      <DialogDescription>
        Choose an unlinked contact to associate with {organizationName}.
      </DialogDescription>
      <DialogBody>
        {loadingContacts ? (
          <Text>Loading contacts...</Text>
        ) : contacts.length === 0 ? (
          <Text>No unlinked contacts are available. Create a contact first.</Text>
        ) : (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Contact
            </label>
            <select
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
              className="block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
            >
              <option value="">Select a contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {(contact.name?.trim() || "Unnamed contact") +
                    (contact.position?.trim()
                      ? ` · ${contact.position.trim()}`
                      : "") +
                    ` (${contact.contactCode})`}
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
        <Button
          onClick={handleSave}
          disabled={loading || loadingContacts || contacts.length === 0}
        >
          {loading ? "Linking..." : "Link contact"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
