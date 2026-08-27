"use client";

import type { ContactKind } from "@/db/schema";
import { contactKindOptions } from "@/lib/contact-fields";
import { cn } from "@/lib/utils";

export function ContactKindPills({
  value,
  onChange,
}: {
  value: ContactKind[];
  onChange: (value: ContactKind[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {contactKindOptions.map((option) => {
        const selected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => {
              onChange(
                selected
                  ? value.filter((item) => item !== option.value)
                  : [...value, option.value],
              );
            }}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium",
              selected
                ? "bg-zoom-dark text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
