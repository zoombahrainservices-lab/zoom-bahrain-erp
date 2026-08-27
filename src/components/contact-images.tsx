"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  ArrowTopRightOnSquareIcon,
  TrashIcon,
} from "@heroicons/react/16/solid";

import { Button } from "@/components/catalyst/button";
import { Subheading } from "@/components/catalyst/heading";
import { Text, TextLink } from "@/components/catalyst/text";

type ContactImageRow = {
  id: string;
  name: string;
  mimeType: string | null;
  webViewLink: string | null;
  createdAt: string;
  uploadedBy: { name: string } | null;
};

type ContactImagesProps = {
  contactId: string;
  contactCode: string;
  driveConnected: boolean;
  isAdmin: boolean;
};

export function ContactImages({
  contactId,
  contactCode,
  driveConnected,
  isAdmin,
}: ContactImagesProps) {
  const [files, setFiles] = useState<ContactImageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function loadFiles() {
    const response = await fetch(`/api/contacts/${contactId}/files`);
    const data = await response.json();
    setFiles(data.files ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadFiles();
  }, [contactId]);

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setUploading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const selected = formData.getAll("file");

    try {
      for (const entry of selected) {
        if (!(entry instanceof File) || entry.size === 0) continue;

        const uploadData = new FormData();
        uploadData.append("file", entry);

        const response = await fetch(`/api/contacts/${contactId}/files`, {
          method: "POST",
          body: uploadData,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error ?? "Upload failed");
        }

        if (data.file) {
          setFiles((current) => [data.file, ...current]);
        }
      }

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
          Company Google Drive is not connected yet. Ask an admin to authorize
          file storage in <TextLink href="/settings">Settings</TextLink>.
        </Text>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-xs ring-1 ring-zinc-950/5">
      <Subheading>Images</Subheading>
      <Text className="mt-2">
        Business cards and other images stored under Zoom ERP / Contacts /{" "}
        {contactCode}.
      </Text>

      {isAdmin ? (
        <form
          onSubmit={handleUpload}
          className="mt-6 flex flex-wrap items-center gap-3"
        >
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
            multiple
            required
            className="text-sm text-zinc-950"
          />
          <Button type="submit" disabled={uploading}>
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </form>
      ) : null}

      {error ? (
        <Text className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2 text-red-700">
          {error}
        </Text>
      ) : null}

      {loading ? (
        <Text className="mt-6">Loading images...</Text>
      ) : files.length === 0 ? (
        <Text className="mt-6">No images yet.</Text>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="group overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50"
            >
              <div className="aspect-[4/3] overflow-hidden bg-zinc-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/contacts/${contactId}/files/${file.id}/content`}
                  alt={file.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <Text className="min-w-0 truncate text-xs">{file.name}</Text>
                <div className="flex shrink-0 items-center gap-1">
                  {file.webViewLink ? (
                    <Button
                      href={file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      outline
                      aria-label={`Open ${file.name} in Drive`}
                    >
                      <ArrowTopRightOnSquareIcon />
                    </Button>
                  ) : null}
                  {isAdmin ? (
                    <Button
                      type="button"
                      outline
                      onClick={() => handleDelete(file.id)}
                      aria-label={`Delete ${file.name}`}
                    >
                      <TrashIcon />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
