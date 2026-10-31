"use client";

import { useState } from "react";

import { Button } from "@/components/catalyst/button";
import { Input } from "@/components/catalyst/input";
import { Select } from "@/components/catalyst/select";
import type { AccountingFilter } from "@/lib/accounting/filters";

export function AccountingFilters({
  filter,
  companies,
}: {
  filter: AccountingFilter;
  companies: Array<{ id: string; name: string }>;
}) {
  const [year, setYear] = useState(filter.year);
  const [from, setFrom] = useState(filter.from);
  const [to, setTo] = useState(filter.to);
  const current = new Date().getFullYear();
  const years = [current - 2, current - 1, current, current + 1];

  return (
    <form method="get" className="flex flex-wrap items-end gap-3 print:hidden">
      <label className="block text-sm font-medium text-foreground">
        Company
        <Select name="company" defaultValue={filter.companyId} className="mt-1 min-w-52">
          <option value="all">All companies</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.name}
            </option>
          ))}
        </Select>
      </label>
      <label className="block text-sm font-medium text-foreground">
        Financial year
        <Select
          value={year}
          onChange={(event) => {
            const next = event.target.value;
            setYear(next);
            if (/^\d{4}$/.test(next)) {
              setFrom(`${next}-01-01`);
              setTo(`${next}-12-31`);
            }
          }}
          className="mt-1"
        >
          <option value="">Custom range</option>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </Select>
        <input type="hidden" name="year" value={year} />
      </label>
      <label className="block text-sm font-medium text-foreground">
        From
        <Input
          type="date"
          name="from"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
          className="mt-1"
        />
      </label>
      <label className="block text-sm font-medium text-foreground">
        To
        <Input
          type="date"
          name="to"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="mt-1"
        />
      </label>
      <Button type="submit">Apply</Button>
    </form>
  );
}
