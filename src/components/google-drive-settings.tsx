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
};

export function GoogleDriveSettings() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [disconnecting, setDisconnecting] = useState(false);

  async function loadStatus() {
    const response = await fetch("/api/integrations/google/status");
    const data = await response.json();
    setStatus(data);
    setLoading(false);
  }

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    if (searchParams.get("connected") || searchParams.get("error")) {
      loadStatus();
      router.replace("/settings");
    }
  }, [searchParams, router]);

  async function handleDisconnect() {
    setDisconnecting(true);
    await fetch("/api/integrations/google/disconnect", { method: "POST" });
    await loadStatus();
    setDisconnecting(false);
  }

  if (loading) {
    return <Text>Checking Google Drive...</Text>;
  }

  const error = searchParams.get("error");
  const justConnected = searchParams.get("connected") === "1";

  return (
    <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
      <div className="space-y-1">
        <Subheading>Google Drive</Subheading>
        <Text>
          Store client documents in your Google Drive under a{" "}
          <strong>Zoom ERP</strong> folder. Each user connects their own
          account.
        </Text>
      </div>

      <div className="space-y-4">
        {justConnected ? (
          <Text className="rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3 text-green-700">
            Google Drive connected successfully.
          </Text>
        ) : null}

        {error ? (
          <Text className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-red-700">
            Connection failed: {error}
          </Text>
        ) : null}

        {!status?.configured ? (
          <Text className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-amber-800">
            Server is missing Google credentials. Add{" "}
            <code className="text-xs">GOOGLE_CLIENT_ID</code> and{" "}
            <code className="text-xs">GOOGLE_CLIENT_SECRET</code> to your
            environment variables.
          </Text>
        ) : null}

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
            <Button href="/api/integrations/google/connect">
              Connect Google Drive
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
