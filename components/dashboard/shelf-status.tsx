"use client";

import { CheckCircle2, XCircle } from "lucide-react";

import { StatusChip } from "@/components/ui/status";
import { Skeleton } from "@/components/ui/skeleton";
import { TONE_STYLES, shelfVerdict } from "@/lib/plain-language";
import { cn } from "@/lib/utils";

/**
 * The one thing a shop-floor user should see first: is this shelf OK or not.
 *
 * A row of four metric tiles asks the reader to do the arithmetic themselves —
 * "0.0% accuracy, 3 phantom SKUs, ₹52 at risk" needs interpreting before it
 * means anything. This states the conclusion in a sentence, at a size readable
 * from arm's length, and leaves the numbers for the detail cards below.
 */
export function ShelfStatus({
  problemCount,
  isLoading = false,
}: {
  problemCount: number;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <Skeleton className="h-32 w-full rounded-xl" />;
  }

  const verdict = shelfVerdict(problemCount);
  const Icon = verdict.tone === "good" ? CheckCircle2 : XCircle;

  return (
    <section
      className={cn(
        "flex items-center gap-5 rounded-xl border p-6",
        TONE_STYLES[verdict.tone].panel,
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-full",
          verdict.tone === "good" ? "bg-success/20" : "bg-destructive/15",
        )}
      >
        <Icon
          className={cn(
            "h-9 w-9",
            verdict.tone === "good" ? "text-success" : "text-destructive",
          )}
          aria-hidden
        />
      </span>

      <div className="min-w-0">
        <h2 className="text-2xl font-semibold leading-tight">{verdict.label}</h2>
        {verdict.action ? (
          <p className="mt-1 text-base text-muted-foreground">{verdict.action}</p>
        ) : null}
      </div>

      <div className="ml-auto hidden sm:block">
        <StatusChip phrase={verdict} size="large" />
      </div>
    </section>
  );
}
