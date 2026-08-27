"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/catalyst/badge";
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
import { Text } from "@/components/catalyst/text";
import { CopyableFieldValue } from "@/components/copyable-field-value";
import { divisionOptions } from "@/lib/operation-fields";
import {
  type InquiryRecord,
  getInquiryDisplayName,
} from "@/lib/inquiry-fields";
import { formatDate } from "@/lib/utils";

type InquiryDetailModalProps = {
  inquiry: InquiryRecord | null;
  open: boolean;
  canConvert: boolean;
  canConvertToOrganization: boolean;
  onClose: () => void;
  onUpdated: (inquiry: InquiryRecord) => void;
};

function statusBadgeColor(status: string) {
  if (status === "open") return "blue" as const;
  if (status === "converted") return "green" as const;
  return "zinc" as const;
}

export function InquiryDetailModal({
  inquiry,
  open,
  canConvert,
  canConvertToOrganization,
  onClose,
  onUpdated,
}: InquiryDetailModalProps) {
  const router = useRouter();
  const [status, setStatus] = useState("open");
  const [divisionId, setDivisionId] = useState("group");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && inquiry) {
      setStatus(inquiry.status);
      setDivisionId("group");
      setError("");
    }
  }, [open, inquiry]);

  if (!inquiry) return null;

  const isConverted = inquiry.status === "converted";
  const displayName = getInquiryDisplayName(inquiry);

  async function updateStatus(nextStatus: "open" | "closed") {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/sales/inquiries/${inquiry!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = (await response.json()) as {
        inquiry?: InquiryRecord;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to update inquiry");
      }

      if (data.inquiry) {
        setStatus(data.inquiry.status);
        onUpdated(data.inquiry);
      }
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Failed to update inquiry",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleConvertToOrganization() {
    router.push(`/organizations/new?inquiryId=${inquiry!.id}`);
    onClose();
  }

  async function handleOpenAsOperation() {
    if (inquiry!.convertedOperationId) {
      router.push(`/operations/${inquiry!.convertedOperationId}`);
      onClose();
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/sales/inquiries/${inquiry!.id}/convert`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: "operation", divisionId }),
        },
      );
      const data = (await response.json()) as {
        inquiry?: InquiryRecord;
        operation?: { id: string };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to open operation");
      }

      const operationId =
        data.operation?.id ?? data.inquiry?.convertedOperationId;
      if (data.inquiry) {
        onUpdated(data.inquiry);
      }
      if (operationId) {
        router.push(`/operations/${operationId}`);
        onClose();
        return;
      }
      throw new Error("Operation was not created");
    } catch (convertError) {
      setError(
        convertError instanceof Error
          ? convertError.message
          : "Failed to open operation",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} size="lg">
      <DialogTitle>{displayName}</DialogTitle>
      <DialogDescription>
        <span className="font-mono">{inquiry.inquiryCode}</span>
        {" · "}
        Logged {formatDate(inquiry.createdAt)}
      </DialogDescription>
      <div className="mt-3">
        <Badge color={statusBadgeColor(inquiry.status)}>{inquiry.status}</Badge>
      </div>
      <DialogBody>
        <DescriptionList>
          <DescriptionTerm>Phone</DescriptionTerm>
          <DescriptionDetails>
            {inquiry.phone ? (
              <CopyableFieldValue value={inquiry.phone} variant="phone" />
            ) : (
              "—"
            )}
          </DescriptionDetails>

          <DescriptionTerm>Email</DescriptionTerm>
          <DescriptionDetails>
            {inquiry.email ? (
              <CopyableFieldValue value={inquiry.email} />
            ) : (
              "—"
            )}
          </DescriptionDetails>

          <DescriptionTerm>What they need</DescriptionTerm>
          <DescriptionDetails>
            {inquiry.subject?.trim() || "—"}
          </DescriptionDetails>
        </DescriptionList>

        {!inquiry.convertedOperationId ? (
          <div className="mt-6 space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Company for the operation
            </label>
            <select
              value={divisionId}
              onChange={(event) => setDivisionId(event.target.value)}
              disabled={loading}
              className="block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
            >
              {divisionOptions.map((division) => (
                <option key={division.id} value={division.id}>
                  {division.acronym} — {division.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {!isConverted ? (
          <div className="mt-6 space-y-2">
            <label className="block text-sm font-medium text-zinc-700">
              Status
            </label>
            <select
              value={status === "converted" ? "open" : status}
              onChange={(event) => {
                const nextStatus = event.target.value as "open" | "closed";
                setStatus(nextStatus);
                void updateStatus(nextStatus);
              }}
              disabled={loading || isConverted}
              className="block w-full rounded-md bg-white px-3 py-2 text-sm text-zinc-900 outline-1 -outline-offset-1 outline-zinc-200 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        ) : null}

        {error ? <Text className="mt-4 text-red-600">{error}</Text> : null}
      </DialogBody>
      <DialogActions>
        <Button outline onClick={onClose} disabled={loading}>
          Close
        </Button>

        {inquiry.convertedOperationId ? (
          <Button href={`/operations/${inquiry.convertedOperationId}`}>
            Open operation
          </Button>
        ) : canConvert ? (
          <Button onClick={() => void handleOpenAsOperation()} disabled={loading}>
            {loading ? "Opening…" : "Open as operation"}
          </Button>
        ) : null}

        {inquiry.convertedContactId ? (
          <Button outline href={`/contacts/${inquiry.convertedContactId}`}>
            Contact
          </Button>
        ) : null}

        {inquiry.convertedOrganizationId ? (
          <Button
            outline
            href={`/organizations/${inquiry.convertedOrganizationId}`}
          >
            Organization
          </Button>
        ) : null}

        {!isConverted && canConvertToOrganization ? (
          <Button
            outline
            onClick={handleConvertToOrganization}
            disabled={loading}
          >
            File as organization
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}
