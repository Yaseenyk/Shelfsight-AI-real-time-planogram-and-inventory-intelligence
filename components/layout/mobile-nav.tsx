"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { cn } from "@/lib/utils";

/**
 * Navigation for phones and tablets.
 *
 * The sidebar is `hidden lg:flex`, so below 1024px there was no navigation at
 * all: a phone user landed on the shelf check and could not reach freshness,
 * expiry or the summary. Since this is meant to be used one-handed while
 * standing in an aisle, that made it unusable on the device it is most likely
 * to be used on.
 *
 * A bottom bar rather than a hamburger: it sits in the thumb's natural arc, it
 * is always visible so the other sections are discoverable rather than hidden
 * behind a menu, and it costs no extra tap. Targets are 56px tall, comfortably
 * above the 44px minimum, because the user may be holding a basket.
 */
export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card lg:hidden",
        // Keep clear of the iOS home indicator.
        "pb-[env(safe-area-inset-bottom)]",
      )}
      aria-label="Main sections"
    >
      <ul className="flex">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground active:bg-accent",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                {/* The short label only — a phone tab bar has no room for the
                    descriptions the sidebar carries. */}
                <span className="text-[10.5px] font-medium leading-tight">
                  {item.shortLabel}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
