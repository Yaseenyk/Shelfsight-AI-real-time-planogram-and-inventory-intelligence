"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Narrates the analysis while it runs.
 *
 * A spinner says "wait" and nothing else. These stages say what the system is
 * doing, which does two jobs at once: the wait stops feeling like a hang, and
 * the reader learns that one photograph drives several checks — the thing that
 * actually distinguishes this product from a stock-count spreadsheet.
 *
 * The stages are *indicative*, not instrumented: the API returns once, at the
 * end, so there is no per-stage signal to report. They advance on a timer
 * calibrated to observed latency and stop at the final stage until the real
 * result arrives, so the display never claims completion the API has not
 * confirmed.
 */
const STAGES = [
  { label: "Reading your photo", ms: 400 },
  { label: "Finding the products", ms: 1400 },
  { label: "Checking your stock list", ms: 700 },
  { label: "Working out what to do", ms: 500 },
] as const;

export function AnalysisProgress({ className }: { className?: string }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;
    // Stop one short of the end: the last stage stays active until the caller
    // swaps this component for the result.
    STAGES.slice(0, -1).forEach((item, index) => {
      elapsed += item.ms;
      timers.push(
        setTimeout(() => {
          if (!cancelled) setStage(index + 1);
        }, elapsed),
      );
    });

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div
      className={cn("rounded-xl border border-border bg-card p-6", className)}
      role="status"
      aria-live="polite"
      aria-label="Analysing your photo"
    >
      <ol className="space-y-3">
        {STAGES.map((item, index) => {
          const done = index < stage;
          const active = index === stage;
          return (
            <li
              key={item.label}
              className={cn(
                "flex items-center gap-3 text-base transition-opacity duration-300",
                done && "text-muted-foreground",
                active && "font-medium",
                !done && !active && "opacity-40",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                  done && "border-success bg-success text-white",
                  active && "border-primary text-primary",
                  !done && !active && "border-border",
                )}
              >
                {done ? (
                  <Check className="h-4 w-4" aria-hidden />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
              </span>
              {item.label}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
