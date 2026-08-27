"use client";

import { MagnifyingGlassIcon } from "@heroicons/react/20/solid";
import { debounce, parseAsString, useQueryState } from "nuqs";

import { Input } from "@/components/catalyst/input";
import { cn } from "@/lib/utils";

export function useListQuery(key = "q") {
  return useQueryState(
    key,
    parseAsString.withDefault("").withOptions({
      clearOnDefault: true,
      limitUrlUpdates: debounce(250),
    }),
  );
}

export function ListSearch({
  placeholder,
  className,
}: {
  placeholder: string;
  className?: string;
}) {
  const [search, setSearch] = useListQuery();

  return (
    <div className={cn("relative max-w-md flex-1", className)}>
      <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-zinc-400" />
      <Input
        type="search"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder={placeholder}
        className="!pl-10"
      />
    </div>
  );
}
