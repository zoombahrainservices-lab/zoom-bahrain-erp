"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Divider } from "@/components/catalyst/divider";
import { Subheading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";

type StorageStatus = {
  configured: boolean;
  connected: boolean;
  connectedAt: string | null;
  canManage: boolean;
};

type FlashMessage =
  | { type: "success"; text: string }
  | { type: "error"; text: string };

const errorMessages: Record<string, string> = {
  access_denied:
    "Storage authorization was cancelled. While Google Cloud is in testing mode, the Drive owner account must be listed as a test user in GCP.",
  admin_required: "Only admins can authorize file storage.",
  login_required: "Your Zoom ERP session expired. Sign in again, then retry.",
  missing_code: "Google did not return an authorization code. Try again.",
  state_mismatch: "Security check failed. Sign out, sign in again, then retry.",
  connect_failed:
    "Storage authorization failed. Check that the Google Drive API is enabled in GCP.",
};

function readFlashFromParams(
  connected: string | null,
  error: string | null,
  errorDetail: string | null,
): FlashMessage | null {
  if (connected === "1") {
    return {
      type: "success",
      text: "File storage is ready. Your team uploads through Zoom ERP - not through Google login.",
    };
  }

  if (error) {
    const detail = errorDetail ? `: ${errorDetail}` : "";
    return {
      type: "error",
      text: (errorMessages[error] ?? `Storage setup failed (${error}).`) + detail,
    };
  }

  return null;
}

export function GoogleDriveSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);
  const [flash, setFlash] = useState<FlashMessage | null>(null);

  async function loadStatus() {
    try {
      const response = await fetch("/api/integrations/google/status");
      if (!response.ok) {
        throw new Error(`Status request failed (${response.status})`);
      }
      const data = await response.json();
      setStatus(data);
      return data as StorageStatus;
    } catch {
      setStatus({
        configured: false,
        connected: false,
        connectedAt: null,
        canManage: false,
      });
      setFlash({
        type: "error",
        text: "Could not load storage status. Sign in again and retry.",
      });
      return null;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const errorDetail = searchParams.get("error_detail");

    if (!connected && !error) {
      return;
    }

    const message = readFlashFromParams(connected, error, errorDetail);
    if (message) {
      setFlash(message);
    }

    if (connected === "1") {
      loadStatus();
    }

    router.replace("/settings");
  }, [searchParams, router]);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/integrations/google/disconnect", { method: "POST" });
    await loadStatus();
    setFlash(null);
    setDisconnecting(false);
  }

  if (loading) {
    return <Text>Checking file storage...</Text>;
  }

  return (
    <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      <div className="space-y-1">
        <Subheading>File storage</Subheading>
        <Text>
          Google Drive is the storage bucket only - like S3. Zoom ERP handles
          all users and permissions. The admin authorizes which Drive account
          holds files once; employees never sign into Google.
        </Text>
      </div>

      <div className="space-y-4">
        {flash?.type === "success" ? (
          <Text className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-green-700">
            {flash.text}
          </Text>
        ) : null}

        {flash?.type === "error" ? (
          <Text className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-700">
            {flash.text}
          </Text>
        ) : null}

        {!status?.configured ? (
          <Text className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-800">
            Server is missing storage credentials. Add{" "}
            <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="text-xs">GOOGLE_CLIENT_SECRET</code> to your
            environment variables.
          </Text>
        ) : (
          <div className="rounded-lg bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5">
            <Text className="font-medium">Storage status</Text>
            <ul className="mt-2 space-y-1 text-sm text-zinc-600">
              <li>Storage backend configured: yes</li>
              <li>Bucket ready: {status.connected ? "yes" : "no"}</li>
              {status.connectedAt ? (
                <li>
                  Authorized at:{" "}
                  {new Date(status.connectedAt).toLocaleString()}
                </li>
              ) : null}
            </ul>
          </div>
        )}

        {!status?.canManage && status?.configured ? (
          <Text className="text-sm text-zinc-600">
            {status.connected
              ? "File storage is active. Upload through Organizations when you have access."
              : "Ask an admin to authorize file storage."}
          </Text>
        ) : null}

        {status?.canManage ? (
          <>
            <Divider soft />

            <div className="flex flex-wrap items-center gap-3">
              {status.connected ? (
                <>
                  <Badge color="green">Storage active</Badge>
                  <Button
                    type="button"
                    outline
                    onClick={handleDisconnect}
                    disabled={disconnecting}
                  >
                    {disconnecting ? "Removing..." : "Remove storage link"}
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  onClick={() => {
                    window.location.assign("/api/integrations/google/connect");
                  }}
                >
                  Authorize file storage
                </Button>
              )}
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
