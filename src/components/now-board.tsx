"use client";

import { useEffect, useState } from "react";

import { Heading } from "@/components/catalyst/heading";
import { Link } from "@/components/catalyst/link";
import { pulseToneClass, type PulseTone } from "@/lib/operation-pulse";
import {
  listPinnedOperations,
  type RememberedOperation,
} from "@/lib/workspace-memory";
import type { NowFeedItem, NowItem } from "@/lib/list-now";

type NowBoardProps = {
  greeting: string;
  clock: string;
  needsYou: NowItem[];
  latest: NowFeedItem[];
  quiet: NowItem[];
};

function ToneChip({ tone, label }: { tone: PulseTone; label: string }) {
  return (
    <span
      className={`inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium ring-1 ${pulseToneClass(tone)}`}
    >
      {label}
    </span>
  );
}

function Section({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<NowItem | NowFeedItem>;
}) {
  return (
    <section className="rounded-xl bg-white ring-1 ring-zinc-200">
      <h2 className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold text-zoom-navy">
        {title}
      </h2>
      {items.length === 0 ? (
        <p className="px-4 py-6 text-sm text-zinc-500">{empty}</p>
      ) : (
        <div className="divide-y divide-zinc-100">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block px-4 py-2 hover:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium text-zoom-dark">{item.title}</p>
                {"tone" in item ? (
                  <ToneChip tone={item.tone} label={item.label} />
                ) : null}
              </div>
              <p className="text-xs text-zinc-500">{item.meta}</p>
              {"body" in item && item.body ? (
                <p className="mt-0.5 text-xs text-zinc-600">{item.body}</p>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function NowBoard({
  greeting,
  clock,
  needsYou,
  latest,
  quiet,
}: NowBoardProps) {
  const [pins, setPins] = useState<RememberedOperation[]>([]);

  useEffect(() => {
    setPins(listPinnedOperations());
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-zinc-500">{clock}</p>
        <Heading className="mt-0.5">{greeting}</Heading>
        <p className="mt-1 text-sm text-zinc-600">
          What needs you. Open a row to work on the operation.
        </p>
      </div>

      {pins.length > 0 ? (
        <section className="rounded-xl bg-white ring-1 ring-zinc-200">
          <h2 className="border-b border-zinc-100 px-4 py-2 text-sm font-semibold text-zoom-navy">
            Pinned
          </h2>
          <div className="flex flex-wrap gap-2 px-4 py-3">
            {pins.map((pin) => (
              <Link
                key={pin.id}
                href={`/operations/${pin.id}`}
                className="rounded-md bg-zoom-palest px-2 py-1 text-xs font-medium text-zoom-dark ring-1 ring-zoom-pale"
              >
                {pin.operationCode} · {pin.title}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Needs you" empty="Nothing waiting. Nice." items={needsYou} />
        <Section title="Latest on threads" empty="No updates yet." items={latest} />
        <Section
          title="Quiet files"
          empty="Every active file has a recent update."
          items={quiet}
        />
      </div>
    </div>
  );
}

export function NowPeek({
  needsYou,
  latest,
}: {
  needsYou: NowItem[];
  latest: NowFeedItem[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Needs you" empty="Nothing waiting." items={needsYou.slice(0, 5)} />
      <Section title="Just now" empty="No updates yet." items={latest.slice(0, 5)} />
    </div>
  );
}
