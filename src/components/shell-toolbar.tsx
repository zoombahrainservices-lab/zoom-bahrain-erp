"use client";

import type { ReactNode } from "react";
import { Cog6ToothIcon, PlusIcon } from "@heroicons/react/16/solid";
import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";

import {
  Dropdown,
  DropdownButton,
  DropdownDivider,
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from "@/components/catalyst/dropdown";
import { Link } from "@/components/catalyst/link";
import { NavbarItem, NavbarSection } from "@/components/catalyst/navbar";
import { NavbarRecents } from "@/components/navbar-recents";
import { ThemeToggle } from "@/components/theme-toggle";
import { openCommandPalette } from "@/components/command-palette";
import { visibleQuickCreates } from "@/lib/app-capabilities";

type ShellToolbarProps = {
  admin: boolean;
  menu: ReactNode;
};

const saleClass =
  "hidden h-8 items-center rounded-full bg-[#e4546b] px-3 text-xs font-semibold text-white hover:bg-[#d4475e] md:inline-flex";
const purchaseClass =
  "hidden h-8 items-center rounded-full bg-[#d7f0fb] px-3 text-xs font-semibold text-[#0b6f9a] hover:bg-[#c5e8f8] md:inline-flex";

export function ShellToolbar({ admin, menu }: ShellToolbarProps) {
  const creates = visibleQuickCreates({ admin });

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <button
        type="button"
        onClick={openCommandPalette}
        className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full bg-zinc-100 px-3 text-left text-xs text-zinc-500 hover:bg-zinc-200/80 sm:max-w-md dark:bg-surface-elevated dark:text-text-secondary dark:hover:bg-surface"
      >
        <MagnifyingGlassIcon className="size-4 shrink-0 fill-zinc-400" aria-hidden="true" />
        <span className="truncate">Open anything</span>
        <kbd className="ml-auto hidden rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400 sm:inline dark:border-border">
          Ctrl+K
        </kbd>
      </button>

      <NavbarRecents />

      <div className="ml-auto flex items-center gap-1.5">
        <Link href="/accounting/start/sale-invoice" className={saleClass} title="New sale invoice">
          + Add Sale
        </Link>
        <Link href="/accounting/purchases?new=bill" className={purchaseClass} title="New supplier bill">
          + Add Purchase
        </Link>

        <Dropdown>
          <DropdownButton as={NavbarItem} aria-label="Create">
            <PlusIcon data-slot="icon" />
          </DropdownButton>
          <DropdownMenu className="min-w-64" anchor="bottom end">
            <DropdownItem href="/accounting/start/sale-invoice">
              <DropdownLabel>Sale invoice</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/accounting/start/quotation">
              <DropdownLabel>Estimate / quotation</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/accounting/start/sale-order">
              <DropdownLabel>Sale order</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/accounting/receipts?new=1">
              <DropdownLabel>Payment in</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem href="/accounting/purchases?new=bill">
              <DropdownLabel>Purchase bill</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/accounting/payouts?new=1">
              <DropdownLabel>Payment out</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/accounting/expenses?new=1">
              <DropdownLabel>Expense</DropdownLabel>
            </DropdownItem>
            <DropdownItem href="/accounting/journals/new">
              <DropdownLabel>New journal</DropdownLabel>
            </DropdownItem>
            <DropdownDivider />
            {creates.map((action) => (
              <DropdownItem key={action.id} href={action.href}>
                <DropdownLabel>{action.label}</DropdownLabel>
              </DropdownItem>
            ))}
          </DropdownMenu>
        </Dropdown>

        <NavbarSection>
          <NavbarItem href="/settings" aria-label="Settings">
            <Cog6ToothIcon data-slot="icon" />
          </NavbarItem>
          <ThemeToggle />
          <Dropdown>
            <DropdownButton as={NavbarItem} aria-label="Account menu">
              <span className="flex size-6 items-center justify-center rounded-md bg-zoom-dark text-[11px] font-semibold text-white">
                Z
              </span>
            </DropdownButton>
            <DropdownMenu className="min-w-64" anchor="bottom end">
              {menu}
            </DropdownMenu>
          </Dropdown>
        </NavbarSection>
      </div>
    </div>
  );
}
