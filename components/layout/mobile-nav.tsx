"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { activeHref, groupFor, visibleExtras, visibleGroups } from "@/components/layout/nav-items";
import { useAuth } from "@/lib/auth/context";
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
 * behind a menu, and it costs no extra tap.
 *
 * One tab per use case, not one per screen. Nine tabs left each about 40px wide
 * on a phone -- below the 44px minimum, and unlabelled in practice. Five is
 * roomy, and the screens inside a use case are reached from the row of pills
 * that {@link SubNav} puts at the top of the page.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { can } = useAuth();
  const groups = visibleGroups(can);
  const extras = visibleExtras(can);
  const currentGroup = groupFor(pathname, groups);
  const summaryActive = activeHref(pathname, extras.map((item) => item.href)) !== null;

  const tabs = [
    ...groups.map((group) => ({
      href: group.href,
      shortLabel: group.shortLabel,
      icon: group.icon,
      isActive: currentGroup?.href === group.href,
    })),
    ...extras.map((item) => ({
      href: item.href,
      shortLabel: item.shortLabel,
      icon: item.icon,
      isActive: summaryActive,
    })),
  ];

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
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={tab.isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 transition-colors",
                  tab.isActive ? "text-primary" : "text-muted-foreground active:bg-accent",
                )}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden />
                {/* The short label only -- a phone tab bar has no room for the
                    descriptions the sidebar carries. */}
                <span className="text-[10.5px] font-medium leading-tight">{tab.shortLabel}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
