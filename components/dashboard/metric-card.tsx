"use client";

import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useCountUp } from "@/lib/hooks/use-count-up";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type MetricTone = "neutral" | "success" | "warning" | "critical";

const TONE_RING: Record<MetricTone, string> = {
  neutral: "bg-secondary text-muted-foreground",
  // The all-clear tile carries the brand lime, so a healthy shop is legible at
  // a glance rather than merely "not red".
  success: "bg-brand text-brand-foreground",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/12 text-destructive",
};

/**
 * A stat tile, not a chart: one number, its label, and one line of context.
 * The value uses tabular figures so polling updates don't shift the layout.
 */
export function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  isLoading = false,
  countTo,
  className,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: MetricTone;
  isLoading?: boolean;
  /** Numeric target: when given, the tile counts up to it after a scan. */
  countTo?: number | null;
  className?: string;
}) {
  // Counting draws the eye to what changed after a scan, where a value that
  // simply swaps does not. Non-numeric tiles (currency strings) opt out.
  const counted = useCountUp(countTo);
  const shown = countTo === undefined || countTo === null ? value : Math.round(counted);
  return (
    <Card className={className}>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1.5">
          {/* Sentence case, not SHOUTING CAPS: all-caps is measurably slower to
              read, and these labels are the first thing a new user parses. */}
          <p className="text-label text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="h-9 w-20" />
          ) : (
            <p className="text-figure">{shown}</p>
          )}
          {hint ? <p className="text-xs font-light leading-snug text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              TONE_RING[tone],
            )}
          >
            <Icon className="h-[18px] w-[18px]" aria-hidden />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
