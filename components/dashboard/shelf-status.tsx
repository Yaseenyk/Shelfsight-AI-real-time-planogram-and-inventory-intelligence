"use client";

import { CheckCircle2, XCircle } from "lucide-react";

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
    return <Skeleton className="h-24 w-full rounded-lg" />;
  }

  const verdict = shelfVerdict(problemCount);
  const Icon = verdict.tone === "good" ? CheckCircle2 : XCircle;

  return (
    <section
      className={cn(
        "flex items-center gap-4 rounded-2xl p-5 animate-verdict-in sm:gap-5 sm:p-6",
        TONE_STYLES[verdict.tone].panel,
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full sm:h-14 sm:w-14",
          // On the lime panel the badge must be a darker tint of the same family,
          // not a wash, or it disappears.
          verdict.tone === "good" ? "bg-brand-foreground/10" : "bg-background/60",
        )}
      >
        <Icon
          className={cn(
            "h-7 w-7 sm:h-8 sm:w-8",
            verdict.tone === "good" ? "text-brand-foreground" : "text-destructive",
          )}
          aria-hidden
        />
      </span>

      {/* The chip that used to sit on the right repeated this heading verbatim
          -- "Everything looks good" printed twice in one banner. The icon and
          the panel colour already carry the status; the words only need saying
          once. */}
      <div className="min-w-0">
        <h2 className="text-verdict">{verdict.label}</h2>
        {verdict.action ? (
          <p className="mt-1 text-sm font-medium opacity-70">{verdict.action}</p>
        ) : null}
      </div>
    </section>
  );
}
