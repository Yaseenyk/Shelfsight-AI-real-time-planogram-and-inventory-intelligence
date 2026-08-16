"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Count a number up to its target when it changes.
 *
 * Used on the dashboard tiles because a figure that climbs draws the eye to
 * what changed after a scan, where a number that simply swaps does not. It is
 * decoration with one job, so it stays short (~600 ms) and eases out — a slow
 * count is a slow dashboard.
 *
 * Honours `prefers-reduced-motion` by jumping straight to the value, and skips
 * the animation entirely on first mount so a page load does not roll every
 * tile up from zero.
 */
export function useCountUp(target: number | null | undefined, durationMs = 600): number {
  const [value, setValue] = useState(target ?? 0);
  const frameRef = useRef<number | null>(null);
  const previousRef = useRef(target ?? 0);
  const mountedRef = useRef(false);

  useEffect(() => {
    const next = target ?? 0;

    if (!mountedRef.current) {
      mountedRef.current = true;
      previousRef.current = next;
      setValue(next);
      return;
    }

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduceMotion || next === previousRef.current) {
      previousRef.current = next;
      setValue(next);
      return;
    }

    const from = previousRef.current;
    const delta = next - from;
    const start = performance.now();

    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      // easeOutCubic: fast start, gentle settle — reads as "landing" on a value.
      const eased = 1 - (1 - progress) ** 3;
      setValue(from + delta * eased);
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        previousRef.current = next;
      }
    };
    frameRef.current = requestAnimationFrame(step);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [target, durationMs]);

  return value;
}
