"use client";

import { MoonIcon, SunIcon } from "@heroicons/react/20/solid";

import { NavbarItem } from "@/components/catalyst/navbar";
import { useTheme } from "@/components/theme-provider";
import { themePreferences, type ThemePreference } from "@/lib/theme";
import { cn } from "@/lib/utils";

const labels: Record<ThemePreference, string> = {
  light: "Light",
  dark: "Dark",
  system: "System",
};

export function ThemeToggle({ className }: { className?: string }) {
  const { resolved, toggleLightDark } = useTheme();

  return (
    <NavbarItem
      className={className}
      onClick={toggleLightDark}
      aria-label={
        resolved === "dark" ? "Switch to light mode" : "Switch to dark mode"
      }
    >
      <SunIcon data-slot="icon" className="hidden dark:block" />
      <MoonIcon data-slot="icon" className="dark:hidden" />
    </NavbarItem>
  );
}

export function ThemePreferencePicker() {
  const { preference, setPreference } = useTheme();

  return (
    <div className="flex flex-wrap gap-1">
      {themePreferences.map((option) => {
        const selected = option === preference;
        return (
          <button
            key={option}
            type="button"
            onClick={() => setPreference(option)}
            className={cn(
              "rounded-md px-2 py-1 text-xs font-medium",
              selected
                ? "bg-zoom-dark text-white"
                : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200",
            )}
          >
            {labels[option]}
          </button>
        );
      })}
    </div>
  );
}
