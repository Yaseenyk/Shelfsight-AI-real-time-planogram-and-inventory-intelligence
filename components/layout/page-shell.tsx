import type { ReactNode } from "react";

import { Topbar } from "@/components/layout/topbar";

/** Standard page frame: sticky topbar + scrollable content column. */
export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-1 flex-col">
      <Topbar title={title} subtitle={subtitle} />
      <main className="flex-1 space-y-5 p-5">{children}</main>
    </div>
  );
}
