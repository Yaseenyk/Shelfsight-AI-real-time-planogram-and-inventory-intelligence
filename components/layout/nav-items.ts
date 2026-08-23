import {
  Apple,
  Boxes,
  CalendarClock,
  ClipboardList,
  LayoutGrid,
  PackageOpen,
  PackagePlus,
  PackageSearch,
  ScanLine,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

import type { Permission } from "@/lib/auth/context";

export interface NavItem {
  href: string;
  /** Sidebar label. */
  label: string;
  /** Bottom-bar label — a phone tab is ~70px wide, so this must be one short word. */
  shortLabel: string;
  description: string;
  icon: LucideIcon;
  /**
   * What the signed-in role must be allowed to do for this screen to appear.
   *
   * The same permission the server checks on the data behind it, so a hidden
   * link and a refused request cannot disagree. Hiding a link is not access
   * control on its own — the URL is a keystroke away — which is why the
   * endpoint is guarded too; this only keeps the menu to what the person can
   * actually use.
   */
  permission: Permission;
}

export interface NavGroup extends NavItem {
  /** The use case this group is, numbered as the paper numbers them. */
  useCase: number;
  /** The technical name, so a screen can be traced back to the paper. */
  technicalName: string;
  /** Screens inside this use case. Never empty; the first is the group's home. */
  children: NavItem[];
}

/**
 * The navigation, grouped by use case and filtered by role.
 *
 * Two things are going on. The top level is the four use cases and nothing
 * else, because that is what this system is — four capabilities, not ten
 * screens, and anybody being shown it had to be told the mapping out loud.
 *
 * And each entry names the permission it needs, so a role only sees the
 * screens its job involves. Somebody filling shelves gets the five screens
 * they use standing in an aisle; a coordinator adds the ones about deciding;
 * only a manager designs a shelf, because re-allocating a row changes what
 * every future scan of it is judged against.
 *
 * Labels are written for shop-floor staff: they name the job the person is
 * doing, not the technique — "Shelf layout", not "Planogram compliance".
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    useCase: 1,
    technicalName: "Phantom inventory detection",
    href: "/",
    label: "Stock accuracy",
    shortLabel: "Stock",
    description: "What the camera sees vs what the record says",
    icon: PackageSearch,
    permission: "scan:run",
    children: [
      {
        href: "/",
        label: "Shelf check",
        shortLabel: "Check",
        description: "Pick a shelf, photograph it, count each row",
        icon: ScanLine,
        permission: "scan:run",
      },
      {
        href: "/inventory",
        label: "Inventory",
        shortLabel: "Items",
        description: "Read from the inventory system",
        icon: Boxes,
        permission: "catalogue:view",
      },
      {
        href: "/restock",
        label: "Refill jobs",
        shortLabel: "Refill",
        description: "Shelves the camera found empty",
        icon: ClipboardList,
        permission: "restock:complete",
      },
    ],
  },
  {
    useCase: 2,
    technicalName: "Planogram compliance",
    href: "/plan",
    label: "Shelf layout",
    shortLabel: "Layout",
    description: "Is every product in the place it was sold",
    icon: LayoutGrid,
    // The group appears for anyone who can see the filling plan, which is
    // everyone: it is the screen the whole product is for.
    permission: "plan:view",
    children: [
      {
        href: "/plan",
        label: "Filling plan",
        shortLabel: "Plan",
        description: "What goes at the front of each row",
        icon: PackageOpen,
        permission: "plan:view",
      },
      {
        href: "/planogram",
        label: "Layout check",
        shortLabel: "Check",
        description: "Compare a shelf against its plan",
        icon: LayoutGrid,
        permission: "planogram:view",
      },
      {
        href: "/shelves",
        label: "Shelves & rows",
        shortLabel: "Shelves",
        description: "Build a shelf and say what goes on each row",
        icon: Boxes,
        permission: "shelf:create",
      },
    ],
  },
  {
    useCase: 3,
    technicalName: "Freshness classification",
    href: "/freshness",
    label: "Freshness",
    shortLabel: "Fresh",
    description: "Fresh, ripe or spoiled produce",
    icon: Apple,
    permission: "freshness:view",
    children: [
      {
        href: "/freshness",
        label: "Fruit & vegetables",
        shortLabel: "Fruit",
        description: "Fresh, ripe or spoiled",
        icon: Apple,
        permission: "freshness:view",
      },
    ],
  },
  {
    useCase: 4,
    technicalName: "Expiry-date OCR",
    href: "/expiry",
    label: "Expiry dates",
    shortLabel: "Expiry",
    description: "Read dates off packets and use stock in order",
    icon: CalendarClock,
    permission: "expiry:read",
    children: [
      {
        href: "/expiry",
        label: "Read a date",
        shortLabel: "Read",
        description: "Photograph a packet and read the printed date",
        icon: CalendarClock,
        permission: "expiry:read",
      },
      {
        href: "/expiring",
        label: "Expiring soon",
        shortLabel: "Soon",
        description: "Dates already recorded, soonest first",
        icon: PackagePlus,
        permission: "expiry:watch",
      },
    ],
  },
];

/**
 * Sits below the four, deliberately outside them: the summary reads across all
 * four use cases, so filing it under any one of them would be a lie.
 */
export const EXTRA_ITEMS: NavItem[] = [
  {
    href: "/insights",
    label: "Daily summary",
    shortLabel: "Summary",
    description: "One short report covering all four",
    icon: Sparkles,
    permission: "insights:view",
  },
];

/** Every destination, flattened — for lookups that do not care about grouping. */
export const NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.children),
  ...EXTRA_ITEMS,
];

/**
 * The menu this role actually gets.
 *
 * A group whose every screen is hidden is dropped entirely rather than left as
 * a heading that opens onto nothing — and its landing page becomes the first
 * screen the role can reach, so tapping a group never lands on a refusal.
 */
export function visibleGroups(
  can: (permission: Permission) => boolean,
): NavGroup[] {
  return NAV_GROUPS.map((group) => {
    const children = group.children.filter((child) => can(child.permission));
    return { ...group, children, href: children[0]?.href ?? group.href };
  }).filter((group) => group.children.length > 0);
}

export function visibleExtras(can: (permission: Permission) => boolean): NavItem[] {
  return EXTRA_ITEMS.filter((item) => can(item.permission));
}

/** The permission a route needs, or null when nothing here claims it. */
export function permissionFor(pathname: string): Permission | null {
  const match = activeHref(
    pathname,
    NAV_ITEMS.map((item) => item.href),
  );
  return NAV_ITEMS.find((item) => item.href === match)?.permission ?? null;
}

/**
 * Longest-prefix match, not first match.
 *
 * `/` is a member of group 1, so a plain `startsWith` would claim every route
 * for it and the menu would highlight the wrong section everywhere.
 */
export function activeHref(pathname: string, candidates: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of candidates) {
    const hit =
      href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    if (hit && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

/** The group the current route lives in, or null for the summary. */
export function groupFor(pathname: string, groups: NavGroup[] = NAV_GROUPS): NavGroup | null {
  const hrefs = groups.flatMap((group) => group.children.map((child) => child.href));
  const match = activeHref(pathname, hrefs);
  if (!match) return null;
  return groups.find((group) => group.children.some((child) => child.href === match)) ?? null;
}
