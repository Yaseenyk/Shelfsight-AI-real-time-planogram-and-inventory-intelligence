"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeHref, groupFor, visibleGroups } from "@/components/layout/nav-items";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

/**
 * The submenu, for screens too narrow to show the sidebar.
 *
 * The bottom bar gets you into a use case; this gets you around inside one. It
 * also names the use case, which is the part that was previously only in
 * somebody's head: on a phone the title bar said "Stockroom" and nothing on
 * screen connected that to expiry.
 *
 * Hidden on desktop, where the sidebar already shows the same children and a
 * second copy would just be two things to keep in agreement.
 */
export function SubNav() {
  const pathname = usePathname();
  const { can } = useAuth();
  const group = groupFor(pathname, visibleGroups(can));
  if (!group || group.children.length < 2) return null;

  const current = activeHref(
    pathname,
    group.children.map((child) => child.href),
  );

  return (
    <div className="shrink-0 px-3 pb-1 sm:px-4 lg:hidden">
      <p className="text-label mb-1.5 text-muted-foreground">
        Use case {group.useCase} · {group.label}
      </p>
      <nav aria-label={group.label}>
        <ul className="flex gap-1.5 overflow-x-auto pb-0.5">
          {group.children.map((child) => {
            const Icon = child.icon;
            const isActive = current === child.href;
            return (
              <li key={child.href} className="shrink-0">
                <Link
                  href={child.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground active:bg-accent",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden />
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
