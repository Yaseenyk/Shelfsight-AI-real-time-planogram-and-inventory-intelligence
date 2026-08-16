"use client";

import { AlertTriangle, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";

import { TONE_STYLES, shelfVerdict, type Tone } from "@/lib/plain-language";
import { cn } from "@/lib/utils";

const TONE_ICON: Record<Tone, LucideIcon> = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
  neutral: AlertTriangle,
};

/**
 * The shelf verdict, compressed to a chip for the top bar.
 *
 * It used to be a full-width banner with 40px type, which spent roughly a
 * seventh of the screen restating a number the task list beneath it already
 * enumerated item by item. Status belongs with the other status indicators, and
 * the detail belongs in the list — so the banner became this, and the space it
 * held went to the working area.
 *
 * Colour and wording still come from the shared vocabulary, so the chip cannot
 * drift from what the rest of the app calls the same state.
 */
export function StatusPill({
  problemCount,
  isLoading = false,
}: {
  problemCount: number;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return <span className="h-7 w-32 animate-pulse rounded-full bg-secondary" aria-hidden />;
  }

  const verdict = shelfVerdict(problemCount);
  const Icon = TONE_ICON[verdict.tone];
  // The chip is short by necessity; the banner's full sentence stays available
  // to a screen reader and on hover.
  const short =
    problemCount === 0 ? "All clear" : `${problemCount} need${problemCount === 1 ? "s" : ""} attention`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
        TONE_STYLES[verdict.tone].chip,
      )}
      title={verdict.action ? `${verdict.label} — ${verdict.action}` : verdict.label}
      aria-live="polite"
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{verdict.label}. </span>
      <span aria-hidden>{short}</span>
    </span>
  );
}
