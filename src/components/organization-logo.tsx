"use client";

import { useState } from "react";

type OrganizationLogoProps = {
  organizationId: string;
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "header";
  hasLogo?: boolean;
};

const squareSizeClasses = {
  sm: "size-8",
  md: "size-10",
  lg: "size-16",
};

const headerImageClassName = "h-20 w-auto object-contain object-left";

const headerFallbackClassName =
  "inline-flex h-20 min-w-20 items-center justify-center rounded-lg bg-zinc-100 text-lg font-semibold text-zinc-600";

export function OrganizationLogo({
  organizationId,
  name,
  className = "",
  size = "md",
  hasLogo = true,
}: OrganizationLogoProps) {
  const [failed, setFailed] = useState(false);
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  if (!hasLogo || failed) {
    if (size === "header") {
      return (
        <span className={`shrink-0 ${headerFallbackClassName} ${className}`} aria-hidden>
          {initials || "?"}
        </span>
      );
    }

    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-xs font-semibold text-zinc-600 ${squareSizeClasses[size]} ${className}`}
        aria-hidden
      >
        {initials || "?"}
      </span>
    );
  }

  if (size === "header") {
    return (
      <img
        src={`/api/organizations/${organizationId}/logo`}
        alt={`${name} logo`}
        className={`shrink-0 ${headerImageClassName} ${className}`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={`/api/organizations/${organizationId}/logo`}
      alt={`${name} logo`}
      className={`shrink-0 rounded-lg bg-white object-contain ring-1 ring-zinc-950/5 ${squareSizeClasses[size]} ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
