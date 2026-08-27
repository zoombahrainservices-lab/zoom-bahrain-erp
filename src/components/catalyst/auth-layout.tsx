import type React from "react";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      {children}
    </main>
  );
}
