import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function matchesQuery(
  haystack: Array<string | null | undefined>,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  return haystack
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" ")
    .toLowerCase()
    .includes(needle);
}

export function formatActivityDate(date: Date | string | null | undefined) {
  if (!date) return "-";

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function todayInputDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function yesterdayInputDate() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseInputDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

export function parseDecimal(value: string) {
  const cleaned = value.replace(/,/g, "").trim();
  if (!cleaned) return null;

  const amount = Number(cleaned);
  if (!Number.isFinite(amount) || amount < 0) return null;

  return Math.round(amount * 1000) / 1000;
}

export function parseMoneyAmount(value: string) {
  const amount = parseDecimal(value);
  if (amount === null || amount <= 0) return null;
  return amount;
}

export function formatBhd(amount: number | string | null | undefined) {
  if (amount === null || amount === undefined || amount === "") return "";

  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return "";

  return `BHD ${value.toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })}`;
}

export function formatRelativeTime(date: Date | string | null | undefined) {
  if (!date) return "";

  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";

  const seconds = Math.floor((Date.now() - parsed.getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return formatDate(parsed);
}
