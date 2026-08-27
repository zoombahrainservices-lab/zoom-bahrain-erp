"use client";

import clsx from "clsx";

import {
  Dropdown,
  DropdownButton,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from "@/components/catalyst/dropdown";

type DivisionLogoDownloadProps = {
  name: string;
  acronym: string;
  logoSrc: string;
  logoClassName?: string;
};

const pngPresets = [
  { label: "Download PNG (standard)", suffix: "", scale: 1 },
  { label: "Download PNG (HD, 4×)", suffix: "-hd", scale: 4 },
  { label: "Download PNG (ultra, 8×)", suffix: "-ultra", scale: 8 },
] as const;

function logoApiUrl(acronym: string, format: "svg" | "png", scale?: number) {
  const params = new URLSearchParams({ format });
  if (format === "png" && scale) {
    params.set("scale", String(scale));
  }
  return `/api/divisions/${acronym.toLowerCase()}/logo?${params.toString()}`;
}

async function triggerDownload(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Download failed");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(objectUrl);
}

export function DivisionLogoDownload({
  name,
  acronym,
  logoSrc,
  logoClassName = "h-8 w-auto max-w-40 object-contain",
}: DivisionLogoDownloadProps) {
  const code = acronym.toLowerCase();
  const base = `zoom-${code}-logo`;

  return (
    <Dropdown>
      <DropdownButton
        as="button"
        type="button"
        aria-label={`${name} logo download options`}
        className={clsx(
          "cursor-pointer rounded-lg p-1 transition",
          "hover:bg-zoom-palest data-active:bg-zoom-palest",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-zoom-light focus-visible:ring-offset-2",
        )}
      >
        <img
          src={logoSrc}
          alt={`${name} logo`}
          className={logoClassName}
        />
      </DropdownButton>
      <DropdownMenu anchor="bottom start">
        <DropdownItem
          onClick={() => {
            void triggerDownload(logoApiUrl(code, "svg"), `${base}.svg`);
          }}
        >
          <DropdownLabel>Download SVG</DropdownLabel>
        </DropdownItem>
        {pngPresets.map((preset) => (
          <DropdownItem
            key={preset.scale}
            onClick={() => {
              void triggerDownload(
                logoApiUrl(code, "png", preset.scale),
                `${base}${preset.suffix}.png`,
              );
            }}
          >
            <DropdownLabel>{preset.label}</DropdownLabel>
          </DropdownItem>
        ))}
        <DropdownItem href={logoSrc} target="_blank" rel="noopener noreferrer">
          <DropdownLabel>Open as-is</DropdownLabel>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}
