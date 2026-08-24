"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  TrashIcon,
} from "@heroicons/react/16/solid";

import { Button } from "@/components/catalyst/button";
import { Divider } from "@/components/catalyst/divider";
import { Subheading } from "@/components/catalyst/heading";
import { Text, TextLink } from "@/components/catalyst/text";
import { formatDate } from "@/lib/utils";

type DriveFileRow = {
  id: string;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  createdAt: Date;
  uploadedBy: { name: string } | null;
};

type ClientFilesProps = {
  clientId: string;
  driveConnected: boolean;
};

export function ClientFiles({ clientId, driveConnected }: ClientFilesProps) {
  const [files, setFiles] = useState<DriveFileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadFiles() {
    const response = await fetch(`/api/files?clientId=${clientId}`);
    const data = await response.json();
    setFiles(data.files ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadFiles();
  }, [clientId]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed");
      }

      setFiles((current) => [data.file, ...current]);
      form.reset();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(fileId: string) {
    const response = await fetch(`/api/files/${fileId}`, { method: "DELETE" });
    if (response.ok) {
      setFiles((current) => current.filter((file) => file.id !== fileId));
    }
  }

  if (!driveConnected) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5">
        <Text>
          Connect Google Drive in{" "}
          <TextLink href="/settings">Settings</TextLink> to upload client
          documents.
        </Text>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5">
      <Subheading>Documents</Subheading>
      <Text className="mt-2">
        Files upload to your Google Drive under Zoom ERP / Clients.
      </Text>

      <form
        onSubmit={handleUpload}
        className="mt-6 flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="clientId" value={clientId} />
        <input
          type="file"
          name="file"
          required
          className="text-sm text-zinc-950"
        />
        <Button type="submit" disabled={uploading}>
          {uploading ? "Uploading..." : "Upload"}
        </Button>
      </form>

      {error ? (
        <Text className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-red-700">
          {error}
        </Text>
      ) : null}

      <Divider className="my-6" soft />

      {loading ? (
        <Text>Loading files...</Text>
      ) : files.length === 0 ? (
        <Text>No documents yet.</Text>
      ) : (
        <ul className="divide-y divide-zinc-950/5">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-4 py-3"
            >
              <div>
                <Text>{file.name}</Text>
                <Text className="text-zinc-500">
                  {file.uploadedBy?.name ?? "Unknown"} ·{" "}
                  {formatDate(file.createdAt)}
                </Text>
              </div>
              <div className="flex items-center gap-2">
                {file.webViewLink ? (
                  <Button
                    href={file.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    outline
                    aria-label={`Open ${file.name}`}
                  >
                    <ArrowTopRightOnSquareIcon />
                  </Button>
                ) : null}
                <Button
                  type="button"
                  outline
                  onClick={() => handleDelete(file.id)}
                  aria-label={`Delete ${file.name}`}
                >
                  <TrashIcon />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
