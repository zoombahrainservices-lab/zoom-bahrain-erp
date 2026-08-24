import { Suspense } from "react";

import { Divider } from "@/components/catalyst/divider";
import { Heading, Subheading } from "@/components/catalyst/heading";
import { Text } from "@/components/catalyst/text";
import { GoogleDriveSettings } from "@/components/google-drive-settings";
import { getAppUrl } from "@/lib/env";

export default function SettingsPage() {
  const appUrl = getAppUrl();

  return (
    <>
      <Heading>Settings</Heading>
      <Text className="mt-2">Connect integrations for your Zoom ERP workspace.</Text>

      <Divider className="my-10 mt-6" />

      <section className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
        <div className="space-y-1">
          <Subheading>App URL</Subheading>
          <Text>Used for OAuth redirects and external links.</Text>
        </div>
        <Text>{appUrl}</Text>
      </section>

      <Divider className="my-10" soft />

      <Suspense fallback={<Text>Loading...</Text>}>
        <GoogleDriveSettings />
      </Suspense>
    </>
  );
}
