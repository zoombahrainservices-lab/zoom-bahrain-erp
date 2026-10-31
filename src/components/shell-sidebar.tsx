"use client";

import { forwardRef, useEffect, useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import * as Headless from "@headlessui/react";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/16/solid";
import clsx from "clsx";
import { usePathname } from "next/navigation";

import { Avatar } from "@/components/catalyst/avatar";
import {
  Dropdown,
  DropdownButton,
  DropdownMenu,
} from "@/components/catalyst/dropdown";
import { Link } from "@/components/catalyst/link";
import {
  activeShellModuleId,
  collectShellItems,
  isShellItemCurrent,
  shellPins,
  visibleFinancialModules,
  visibleZoomItems,
  type ShellItem,
} from "@/lib/shell-nav";

type ShellSidebarProps = {
  admin: boolean;
  user: { name: string; username: string; role: string };
  menu: ReactNode;
};

function ItemRow({
  item,
  current,
}: {
  item: ShellItem;
  current: boolean;
}) {
  const Icon = item.icon;
  return (
    <div className="flex items-center gap-0.5">
      <Headless.CloseButton
        as={Link}
        href={item.href}
        aria-current={current ? "page" : undefined}
        className={clsx(
          "flex min-w-0 flex-1 items-center gap-2 rounded-md py-1.5 pr-1 text-[13px] leading-5",
          Icon ? "pl-2" : "pl-8",
          current
            ? "bg-[#46527f] font-medium text-white"
            : "text-white/80 hover:bg-white/10 hover:text-white",
        )}
      >
        {Icon ? <Icon className="size-4 shrink-0 fill-white/70" aria-hidden="true" /> : null}
        <span className="truncate">{item.label}</span>
      </Headless.CloseButton>
      {item.createHref ? (
        <Headless.CloseButton
          as={Link}
          href={item.createHref}
          aria-label={item.createLabel ?? `Add ${item.label}`}
          className="flex size-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white/75 hover:bg-white/10 hover:text-white"
        >
          +
        </Headless.CloseButton>
      ) : (
        <span className="size-7 shrink-0" aria-hidden="true" />
      )}
    </div>
  );
}

export function ShellSidebar({ admin, user, menu }: ShellSidebarProps) {
  const pathname = usePathname();
  const modules = visibleFinancialModules({ admin });
  const zoom = visibleZoomItems({ admin });
  const items = collectShellItems({ admin });
  const activeModule = activeShellModuleId(pathname, { admin });
  const [openIds, setOpenIds] = useState<string[] | null>(null);

  useEffect(() => {
    if (!activeModule) return;
    setOpenIds((previous) => {
      const base = previous ?? [];
      if (base.includes(activeModule)) return previous ?? base;
      return [...base, activeModule];
    });
  }, [activeModule]);

  const open = new Set(openIds ?? (activeModule ? [activeModule] : []));

  function toggle(id: string) {
    setOpenIds((previous) => {
      const base = previous ?? (activeModule ? [activeModule] : []);
      return base.includes(id) ? base.filter((entry) => entry !== id) : [...base, id];
    });
  }

  return (
    <nav className="flex min-h-0 flex-1 flex-col bg-[#1b2336] text-white">
      <div className="px-3 py-3">
        <Headless.CloseButton
          as={Link}
          href="/dashboard"
          className="block truncate text-sm font-semibold tracking-tight text-white"
        >
          Zoom ERP
        </Headless.CloseButton>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <div className="space-y-0.5">
          {shellPins.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              current={isShellItemCurrent(pathname, item, items)}
            />
          ))}
        </div>

        <div className="mt-2 space-y-0.5">
          {modules.map((module) => {
            const expanded = open.has(module.id);
            const Icon = module.icon;
            return (
              <div key={module.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-white hover:bg-white/10"
                  aria-expanded={expanded}
                  aria-controls={`nav-${module.id}`}
                  onClick={() => toggle(module.id)}
                >
                  <ChevronDownIcon
                    className={clsx("size-3.5 fill-white/60", expanded ? "" : "-rotate-90")}
                    aria-hidden="true"
                  />
                  <Icon className="size-4 shrink-0 fill-white/75" aria-hidden="true" />
                  <span className="min-w-0 flex-1 truncate">{module.label}</span>
                </button>
                {expanded ? (
                  <div id={`nav-${module.id}`} className="mt-0.5 space-y-0.5">
                    {module.items.map((item) => (
                      <ItemRow
                        key={item.id}
                        item={item}
                        current={isShellItemCurrent(pathname, item, items)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <p className="mb-1 mt-4 px-2 text-[11px] font-semibold uppercase tracking-wide text-white/45">
          Zoom
        </p>
        <div className="space-y-0.5">
          {zoom.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              current={isShellItemCurrent(pathname, item, items)}
            />
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 p-2">
        <Dropdown>
          <DropdownButton
            as={UserButton}
            aria-label="Account menu"
          >
            <Avatar
              initials={user.name.slice(0, 1).toUpperCase()}
              className="size-8"
              square
            />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-white">{user.name}</span>
              <span className="block truncate text-xs text-white/55">
                @{user.username} · {user.role}
              </span>
            </span>
            <ChevronUpIcon className="size-4 fill-white/60" />
          </DropdownButton>
          <DropdownMenu className="min-w-64" anchor="top start">
            {menu}
          </DropdownMenu>
        </Dropdown>
      </div>
    </nav>
  );
}

const UserButton = forwardRef<HTMLButtonElement, ComponentPropsWithoutRef<"button">>(
  function UserButton({ className, ...props }, ref) {
    return (
      <button
        ref={ref}
        {...props}
        type="button"
        className={clsx(
          className,
          "flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-white/10",
        )}
      />
    );
  },
);
