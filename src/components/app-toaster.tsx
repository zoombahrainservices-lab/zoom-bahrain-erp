"use client";

import { Toaster } from "sonner";

import { useTheme } from "@/components/theme-provider";

export function AppToaster() {
  const { resolved } = useTheme();

  return (
    <Toaster position="bottom-right" richColors closeButton theme={resolved} />
  );
}
