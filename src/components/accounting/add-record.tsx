"use client";

import { useState } from "react";

import { Button } from "@/components/catalyst/button";

export function AddActions({
  title,
  detail,
  count,
  actions,
  initialOpen = null,
  children,
}: {
  title: string;
  detail?: string;
  count?: number;
  actions: Array<{ label: string; form: React.ReactNode }>;
  initialOpen?: number | null;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState<number | null>(initialOpen);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-heading">{title}</h2>
          {detail ? <p className="mt-1 max-w-3xl text-sm text-text-secondary">{detail}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {count !== undefined ? (
            <p className="mr-1 text-sm tabular-nums text-text-secondary">{count}</p>
          ) : null}
          {actions.map((action, index) =>
            open === index ? (
              <Button key={action.label} type="button" outline onClick={() => setOpen(null)}>
                Close
              </Button>
            ) : (
              <Button key={action.label} type="button" onClick={() => setOpen(index)}>
                {action.label}
              </Button>
            ),
          )}
        </div>
      </div>
      {open !== null ? actions[open].form : null}
      {children}
    </section>
  );
}
