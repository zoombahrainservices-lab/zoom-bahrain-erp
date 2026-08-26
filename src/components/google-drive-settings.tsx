"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/catalyst/badge";
import { Button } from "@/components/catalyst/button";
import { Divider } from "@/components/catalyst/divider";
import { Subheading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";

type GoogleStatus = {
  configured: boolean;
  connected: boolean;
  googleEmail: string | null;
  connectedAt: string | null;
};

type FlashMessage =
  | { type: "success"; text: string }
  | { type: "error"; text: string };

const errorMessages: Record<string, string> = {
  access_denied: "Google sign-in was cancelled or blocked. Use a test-user email.",
  login_required: "Your Zoom ERP session expired. Sign in again, then retry.",
  missing_code: "Google did not return an authorization code. Try Connect again.",
  state_mismatch: "Security check failed. Sign out, sign in again, then retry.",
  connect_failed:
    "Google authorized but saving the connection failed. Check Drive API is enabled.",
};

function readFlashFromParams(
  connected: string | null,
  error: string | null,
  errorDetail: string | null,
): FlashMessage | null {
  if (connected === "1") {
    return {
      type: "success",
      text: "Google Drive connected successfully.",
    };
  }

  if (error) {
    const detail = errorDetail ? `: ${errorDetail}` : "";
    return {
      type: "error",
      text: (errorMessages[error] ?? `Connection failed (${error}).`) + detail,
    };
  }

  return null;
}

export function GoogleDriveSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
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
      return data as GoogleStatus;
    } catch {
      setStatus({
        configured: false,
        connected: false,
        googleEmail: null,
        connectedAt: null,
      });
      setFlash({
        type: "error",
        text: "Could not load Google Drive status. Sign in again and retry.",
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

    loadStatus().then((data) => {
      if (connected === "1" && data?.connected && data.googleEmail) {
        setFlash({
          type: "success",
          text: `Google Drive connected as ${data.googleEmail}.`,
        });
      }
    });

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
    return <Text>Checking Google Drive...</Text>;
  }

  return (
    <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      <div className="space-y-1">
        <Subheading>Google Drive</Subheading>
        <Text>
          Store files in your Google Drive under a{" "}
          <strong>Zoom ERP</strong> folder (internal workspace). Each employee
          connects their own Google account.
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
            Server is missing Google credentials. Add{" "}
            <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="text-xs">GOOGLE_CLIENT_SECRET</code> to your
            environment variables.
          </Text>
        ) : (
          <div className="rounded-lg bg-zinc-50 px-4 py-3 ring-1 ring-zinc-950/5">
            <Text className="font-medium">Connection status</Text>
            <ul className="mt-2 space-y-1 text-sm text-zinc-600">
              <li>Google OAuth configured: yes</li>
              <li>
                Drive linked:{" "}
                {status.connected
                  ? `yes (${status.googleEmail ?? "unknown email"})`
                  : "no"}
              </li>
              {status.connectedAt ? (
                <li>
                  Connected at:{" "}
                  {new Date(status.connectedAt).toLocaleString()}
                </li>
              ) : null}
            </ul>
          </div>
        )}

        <Divider soft />

        <div className="flex flex-wrap items-center gap-3">
          {status?.connected ? (
            <>
              <Badge color="green">
                Connected{status.googleEmail ? `: ${status.googleEmail}` : ""}
              </Badge>
              <Button
                type="button"
                outline
                onClick={handleDisconnect}
                disabled={disconnecting}
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              onClick={() => {
                window.location.assign("/api/integrations/google/connect");
              }}
            >
              Connect Google Drive
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
