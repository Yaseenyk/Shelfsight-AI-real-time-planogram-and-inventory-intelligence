import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Tailwind-aware class merge (the shadcn `cn` helper). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `${(value * 100).toFixed(digits)}%`;
}

/**
 * Locale and currency for the whole dashboard.
 *
 * Deployment-configurable rather than hardcoded: this system is being deployed
 * in India, and a store manager reading "$41.40" of stock at risk when the shelf
 * is priced in rupees will misjudge the number by ~85x. `en-IN` also renders the
 * lakh/crore grouping (₹1,20,000 rather than ₹120,000), which is what an Indian
 * operator expects to see.
 */
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "en-IN";
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "INR";

export function formatCurrency(
  value: number | null | undefined,
  currency: string = CURRENCY,
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat(LOCALE).format(value);
}

export function formatLatency(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || Number.isNaN(ms)) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms.toFixed(0)} ms`;
}

/** Compact relative time ("4m ago"), no dependency on a date library. */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "never";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
