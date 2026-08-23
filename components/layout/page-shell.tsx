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
    <div className={cn("flex flex-1 flex-col", fit ? "h-screen overflow-hidden" : "min-h-screen")}>
      <Topbar title={title} subtitle={subtitle} status={status} />
      <SubNav />
      <main
        className={cn(
          // pb-20 on small screens clears the fixed bottom navigation.
          "flex-1 p-3 pb-20 sm:p-4 lg:pb-4",
          // A flex column in fit mode, so a page can hand one region `flex-1
          // min-h-0` and have it be the only thing that scrolls. As a plain
          // block it had no height for a child to grow into, and every fitted
          // page had to wrap its contents in a column of its own to get one.
          fit
            ? "flex min-h-0 flex-col gap-3 overflow-hidden"
            : "space-y-4 overflow-y-auto",
        )}
      >
        {children}
      </main>
    </div>
  );
}
