import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type MetricTone = "neutral" | "success" | "warning" | "critical";

const TONE_RING: Record<MetricTone, string> = {
  neutral: "bg-secondary text-secondary-foreground",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  critical: "bg-destructive/10 text-destructive",
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
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: LucideIcon;
  tone?: MetricTone;
  isLoading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0 space-y-1">
          {/* Sentence case, not SHOUTING CAPS: all-caps is measurably slower to
              read, and these labels are the first thing a new user parses. */}
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {isLoading ? (
            <Skeleton className="h-10 w-24" />
          ) : (
            <p className="tabular text-3xl font-semibold leading-tight">{value}</p>
          )}
          {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
        {Icon ? (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-md",
              TONE_RING[tone],
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}
