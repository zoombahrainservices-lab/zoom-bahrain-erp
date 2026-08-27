"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import {
  ArrowUpTrayIcon,
  PaperClipIcon,
  PhotoIcon,
} from "@heroicons/react/20/solid";

import { Text } from "@/components/catalyst/text";
import type { OperationEntryFileRecord } from "@/lib/operation-fields";

type OperationEntryAttachmentsProps = {
  operationId: string;
  entryId: string;
  driveConnected: boolean;
  initialFiles?: OperationEntryFileRecord[];
  onFilesChange?: (files: OperationEntryFileRecord[]) => void;
  compact?: boolean;
  hideIdleTrigger?: boolean;
};

function isImageMimeType(mimeType: string | null) {
  return mimeType?.startsWith("image/") ?? false;
}

export function OperationEntryAttachments({
  operationId,
  entryId,
  driveConnected,
  initialFiles = [],
  onFilesChange,
  compact = false,
  hideIdleTrigger = false,
}: OperationEntryAttachmentsProps) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [attachOpen, setAttachOpen] = useState(
    !compact || initialFiles.length > 0 || hideIdleTrigger,
  );

  const updateFiles = useCallback(
    (next: OperationEntryFileRecord[]) => {
      setFiles(next);
      onFilesChange?.(next);
    },
    [onFilesChange],
  );

  const uploadFiles = useCallback(
    async (accepted: File[]) => {
      if (!driveConnected) {
        setError("Connect Google Drive in Settings to upload files.");
        return;
      }

      if (accepted.length === 0) return;

      setUploading(true);
      setError("");

      try {
        const uploaded: OperationEntryFileRecord[] = [];

        for (const file of accepted) {
          const formData = new FormData();
          formData.append("file", file);

          const response = await fetch(
            `/api/operations/${operationId}/entries/${entryId}/files`,
            { method: "POST", body: formData },
          );
          const data = (await response.json()) as {
            file?: OperationEntryFileRecord;
            error?: string;
          };

          if (!response.ok) {
            throw new Error(data.error ?? "Upload failed");
          }

          if (data.file) {
            uploaded.push(data.file);
          }
        }

        if (uploaded.length > 0) {
          updateFiles([...uploaded, ...files]);
          setAttachOpen(true);
        }
      } catch (uploadError) {
        setError(
          uploadError instanceof Error
            ? uploadError.message
            : "Failed to upload file",
        );
      } finally {
        setUploading(false);
      }
    },
    [driveConnected, entryId, files, operationId, updateFiles],
  );

  const onDrop = useCallback(
    (accepted: File[]) => {
      void uploadFiles(accepted);
    },
    [uploadFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: uploading || !driveConnected,
  });

  function handlePaste(event: React.ClipboardEvent) {
    if (!driveConnected || uploading || !attachOpen) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    const pastedFiles: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      event.preventDefault();
      void uploadFiles(pastedFiles);
    }
  }

  return (
    <div className={hideIdleTrigger ? "mt-1" : "mt-1"} onPaste={handlePaste}>
      {compact && !attachOpen && !hideIdleTrigger ? (
        <button
          type="button"
          onClick={() => setAttachOpen(true)}
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zoom-dark"
        >
          <PaperClipIcon className="size-3.5" />
          Attach
          {files.length > 0 ? ` (${files.length})` : ""}
        </button>
      ) : null}

      {attachOpen ? (
        <div className="space-y-2">
          <div
            {...getRootProps()}
            className={`rounded-md px-2 py-1 transition-colors ${
              isDragActive ? "bg-zoom-palest/80" : "bg-zinc-100/70"
            }`}
          >
            <input {...getInputProps()} />
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
              <PhotoIcon className="size-4 text-zoom-medium" />
              {driveConnected ? (
                <>
                  <span>Paste, drop, or</span>
                  <button
                    type="button"
                    className="font-medium text-zoom-light hover:underline"
                    onClick={open}
                    disabled={uploading}
                  >
                    browse
                  </button>
                  {uploading ? <span className="text-zinc-400">· Uploading…</span> : null}
                </>
              ) : (
                <span>Connect Google Drive in Settings to attach files.</span>
              )}
            </div>
          </div>

          {error ? <Text className="text-xs text-red-600">{error}</Text> : null}

          {files.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <a
                  key={file.id}
                  href={
                    file.webViewLink ??
                    `/api/operations/${operationId}/entries/${entryId}/files/${file.id}/content`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="group block overflow-hidden rounded-md transition hover:opacity-90"
                >
                  {isImageMimeType(file.mimeType) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/operations/${operationId}/entries/${entryId}/files/${file.id}/content`}
                      alt={file.name}
                      className="size-20 object-cover sm:size-24"
                    />
                  ) : (
                    <div className="flex size-20 items-center justify-center bg-white px-2 text-center text-[10px] text-zinc-600 sm:size-24">
                      {file.name}
                    </div>
                  )}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

type PendingAttachmentsProps = {
  pendingFiles: File[];
  driveConnected: boolean;
  loading: boolean;
  onPendingFilesChange: (files: File[]) => void;
};

export function PendingAttachments({
  pendingFiles,
  driveConnected,
  loading,
  onPendingFilesChange,
}: PendingAttachmentsProps) {
  const onDrop = useCallback(
    (accepted: File[]) => {
      if (accepted.length === 0) return;
      onPendingFilesChange([...pendingFiles, ...accepted]);
    },
    [onPendingFilesChange, pendingFiles],
  );

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    disabled: loading || !driveConnected,
  });

  function handlePaste(event: React.ClipboardEvent) {
    if (!driveConnected || loading) return;

    const items = event.clipboardData?.items;
    if (!items) return;

    const pasted: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) pasted.push(file);
      }
    }

    if (pasted.length > 0) {
      event.preventDefault();
      onPendingFilesChange([...pendingFiles, ...pasted]);
    }
  }

  return (
    <div onPaste={handlePaste}>
      <div
        {...getRootProps()}
        className={`rounded-lg border border-dashed px-3 py-2.5 ${
          isDragActive
            ? "border-zoom-light bg-zoom-palest"
            : "border-zinc-200/80 bg-white/60"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600">
          <ArrowUpTrayIcon className="size-4 text-zoom-medium" />
          {driveConnected ? (
            <>
              <span>Attach files — paste, drop, or</span>
              <button
                type="button"
                className="font-medium text-zoom-light hover:underline"
                onClick={open}
                disabled={loading}
              >
                browse
              </button>
              {pendingFiles.length > 0 ? (
                <span className="rounded-full bg-zoom-pale px-2 py-0.5 text-zoom-dark">
                  {pendingFiles.length} ready
                </span>
              ) : null}
            </>
          ) : (
            <span>Connect Google Drive in Settings to attach files.</span>
          )}
        </div>
      </div>

      {pendingFiles.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {pendingFiles.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs ring-1 ring-zinc-200"
            >
              {file.name}
              <button
                type="button"
                className="text-zinc-400 hover:text-red-500"
                onClick={() =>
                  onPendingFilesChange(
                    pendingFiles.filter((_, fileIndex) => fileIndex !== index),
                  )
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
