"use client";

import { useEffect, useState } from "react";

import { NavbarItem } from "@/components/catalyst/navbar";
import {
  getLastOperation,
  type RememberedOperation,
} from "@/lib/workspace-memory";

export function NavbarRecents() {
  const [last, setLast] = useState<RememberedOperation | null>(null);

  useEffect(() => {
    setLast(getLastOperation());
  }, []);

  if (!last) return null;

  return (
    <NavbarItem href={`/operations/${last.id}`} className="max-w-48">
      <span className="truncate text-xs font-medium text-zinc-600">
        {last.operationCode}
      </span>
    </NavbarItem>
  );
}
