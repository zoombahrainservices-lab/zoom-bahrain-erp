"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import * as Headless from "@headlessui/react";
import { toast } from "sonner";

import {
  capabilityGroupLabels,
  capabilityGroups,
  searchableCapabilities,
  visibleQuickCreates,
  type AppCapability,
  type QuickCreateAction,
} from "@/lib/app-capabilities";
import { collectShellItems } from "@/lib/shell-nav";
import {
  getOperationPartyLabel,
  type OperationRecord,
} from "@/lib/operation-fields";
import {
  getLastOperation,
  listPinnedOperations,
  type RememberedOperation,
} from "@/lib/workspace-memory";

const OPEN_EVENT = "zoom-open-command-palette";

export function openCommandPalette() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

type CommandPaletteProps = {
  admin?: boolean;
};

const itemClass =
  "flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm text-zoom-dark data-[selected=true]:bg-zoom-palest dark:data-[selected=true]:bg-surface-elevated";

const groupClass =
  "[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-zinc-400";

export function CommandPalette({ admin = false }: CommandPaletteProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modKey, setModKey] = useState("Ctrl");
  const [recent, setRecent] = useState<OperationRecord[]>([]);
  const [last, setLast] = useState<RememberedOperation | null>(null);
  const [pins, setPins] = useState<RememberedOperation[]>([]);
  const items = searchableCapabilities({ admin });
  const creates = visibleQuickCreates({ admin });
  const knownPages = new Set(items.map((item) => `${item.label}|${item.href ?? ""}`));
  const menuPages = collectShellItems({ admin }).filter(
    (item) => !knownPages.has(`${item.label}|${item.href}`),
  );

  useEffect(() => {
    if (navigator.platform.toUpperCase().includes("MAC")) {
      setModKey("⌘");
    }

    function onKey(event: KeyboardEvent) {
      if (event.key?.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }

    function onOpen() {
      setOpen(true);
    }

    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    setLast(getLastOperation());
    setPins(listPinnedOperations());

    let cancelled = false;
    fetch("/api/operations?limit=8")
      .then((response) => response.json())
      .then((data: { operations?: OperationRecord[] }) => {
        if (!cancelled) setRecent(data.operations ?? []);
      })
      .catch(() => {
        if (!cancelled) setRecent([]);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  function chooseCapability(capability: AppCapability) {
    if (capability.status !== "live" || !capability.href) {
      setOpen(false);
      toast.message(`${capability.label} is not live yet`);
      return;
    }
    go(capability.href);
  }

  function chooseCreate(action: QuickCreateAction) {
    go(action.href);
  }

  return (
    <Headless.Dialog open={open} onClose={setOpen} className="relative z-50">
      <Headless.DialogBackdrop className="fixed inset-0 bg-zinc-950/30" />
      <div className="fixed inset-0 overflow-y-auto p-4 pt-[12vh]">
        <Headless.DialogPanel className="mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-xl ring-1 ring-zinc-200 dark:bg-surface dark:ring-border">
          <Command label="Jump or create" className="flex flex-col">
            <div className="relative">
              <Command.Input
                placeholder="Jump, create, or search…"
                className="h-11 w-full border-b border-zinc-200 bg-transparent px-3 pr-16 text-sm text-zoom-dark outline-none placeholder:text-zinc-400 dark:border-border dark:text-foreground"
              />
              <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-400">
                {modKey}K
              </kbd>
            </div>
            <Command.List className="max-h-80 overflow-y-auto p-1">
              <Command.Empty className="px-3 py-6 text-center text-sm text-zinc-500">
                Nothing matches
              </Command.Empty>

              <Command.Group heading="Jump" className={groupClass}>
                <Command.Item
                  value="keyboard shortcuts help keys"
                  onSelect={() => {
                    setOpen(false);
                    toast.message("Keys", {
                      description:
                        "c write · n new file · g n Now · g o Operations · Ctrl+K jump",
                    });
                  }}
                  className={itemClass}
                >
                  <span>Keyboard shortcuts</span>
                  <span className="truncate text-[11px] text-zinc-400">
                    ? anywhere
                  </span>
                </Command.Item>
                <Command.Item
                  value="now today pulse attention what needs you"
                  onSelect={() => go("/now")}
                  className={itemClass}
                >
                  <span>Now</span>
                  <span className="truncate text-[11px] text-zinc-400">
                    What needs you
                  </span>
                </Command.Item>
                <Command.Item
                  value="mine my operations assigned to me"
                  onSelect={() => go("/operations?status=mine")}
                  className={itemClass}
                >
                  <span>My operations</span>
                  <span className="truncate text-[11px] text-zinc-400">
                    Assigned to me
                  </span>
                </Command.Item>
                {last ? (
                  <Command.Item
                    value={`continue last ${last.title} ${last.operationCode}`}
                    onSelect={() => go(`/operations/${last.id}`)}
                    className={itemClass}
                  >
                    <span className="min-w-0 truncate">Continue {last.title}</span>
                    <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                      {last.operationCode}
                    </span>
                  </Command.Item>
                ) : null}
              </Command.Group>

              {pins.length > 0 ? (
                <Command.Group heading="Pinned" className={groupClass}>
                  {pins.map((pin) => (
                    <Command.Item
                      key={pin.id}
                      value={`${pin.title} ${pin.operationCode} pinned`}
                      onSelect={() => go(`/operations/${pin.id}`)}
                      className={itemClass}
                    >
                      <span className="min-w-0 truncate">{pin.title}</span>
                      <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                        {pin.operationCode}
                      </span>
                    </Command.Item>
                  ))}
                </Command.Group>
              ) : null}

              <Command.Group heading="Menu" className={groupClass}>
                {menuPages.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={`${item.label} ${item.keywords?.join(" ") ?? ""}`}
                    keywords={item.keywords}
                    onSelect={() => go(item.href)}
                    className={itemClass}
                  >
                    <span>{item.label}</span>
                    <span className="truncate text-[11px] text-zinc-400">Open</span>
                  </Command.Item>
                ))}
              </Command.Group>

              <Command.Group heading="Create" className={groupClass}>
                {creates.map((action) => (
                  <Command.Item
                    key={action.id}
                    value={`${action.label} ${action.how} ${action.keywords.join(" ")}`}
                    keywords={action.keywords}
                    onSelect={() => chooseCreate(action)}
                    className={itemClass}
                  >
                    <span>{action.label}</span>
                    <span className="truncate text-[11px] text-zinc-400">
                      {action.how}
                    </span>
                  </Command.Item>
                ))}
              </Command.Group>

              {recent.length > 0 ? (
                <Command.Group heading="Recent operations" className={groupClass}>
                  {recent.map((operation) => {
                    const party = getOperationPartyLabel(operation);
                    return (
                      <Command.Item
                        key={operation.id}
                        value={`${operation.title} ${operation.operationCode} ${party} recent operation`}
                        onSelect={() => go(`/operations/${operation.id}`)}
                        className={itemClass}
                      >
                        <span className="min-w-0 truncate">{operation.title}</span>
                        <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                          {operation.operationCode}
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              ) : null}

              {capabilityGroups.map((group) => {
                const groupItems = items.filter((item) => item.group === group);
                if (groupItems.length === 0) return null;
                return (
                  <Command.Group
                    key={group}
                    heading={capabilityGroupLabels[group]}
                    className={groupClass}
                  >
                    {groupItems.map((item) => (
                      <Command.Item
                        key={item.id}
                        value={`${item.label} ${item.how} ${item.keywords.join(" ")}`}
                        keywords={item.keywords}
                        onSelect={() => chooseCapability(item)}
                        className={itemClass}
                      >
                        <span>{item.label}</span>
                        <span className="truncate text-[11px] text-zinc-400">
                          {item.status === "live" ? "Open" : "Later"}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                );
              })}
            </Command.List>
          </Command>
        </Headless.DialogPanel>
      </div>
    </Headless.Dialog>
  );
}
