import type { ReactNode } from "react";

import { SubNav } from "@/components/layout/sub-nav";
import { Topbar } from "@/components/layout/topbar";
import { cn } from "@/lib/utils";

/**
 * Page frame for a board that fits the screen.
 *
 * The previous shell let the whole page scroll, so the state of the shop was
 * spread down a column and you had to scroll to learn whether anything was
 * wrong. A status board should answer that without moving anything: the frame
 * is now the viewport height, and only regions that genuinely hold a list
 * scroll, inside their own card.
 *
 * `fit` is opt-out rather than opt-in: the dashboard pages are boards, and the
 * detail pages that legitimately run long (a full slot-by-slot table, the
 * technical disclosures) pass `fit={false}` and scroll normally.
 */
export function PageShell({
  title,
  subtitle,
  children,
  status,
  fit = true,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** Page-specific status chip, rendered in the top bar. */
  status?: ReactNode;
  /** Constrain to the viewport and suppress page scroll. */
  fit?: boolean;
}) {
  return (
    <div
      className={cn(
        // min-w-0: this is a flex item beside the sidebar, and without it a
        // wide child cannot be shrunk, so the whole column overflows the
        // window to the right instead of the child scrolling.
        "flex min-w-0 flex-1 flex-col",
        fit ? "h-screen overflow-hidden" : "min-h-screen",
      )}
    >
      <Topbar title={title} subtitle={subtitle} status={status} />
      <SubNav />
      <main
        className={cn(
          // pb-20 on small screens clears the fixed bottom navigation.
          "flex-1 p-3 pb-20 sm:p-4 lg:pb-4",
          // A flex column in fit mode, so a page hands one region `flex-1
          // min-h-0` and that region is the only thing that scrolls.
          //
          // It must be `flex-1`, never `h-full`: this element takes its height
          // from flex-basis rather than a specified height, so a percentage
          // height on a child has nothing definite to resolve against, silently
          // falls back to auto, and the page grows past the viewport again with
          // nothing to show for the constraint.
          fit
            ? "flex min-h-0 min-w-0 flex-col gap-3 overflow-hidden"
            : "space-y-4 overflow-y-auto",
        )}
      >
        {children}
      </main>
    </div>
  );
}
