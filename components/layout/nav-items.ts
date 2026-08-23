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

export interface NavItem {
  href: string;
  /** Sidebar label. */
  label: string;
  /** Bottom-bar label — a phone tab is ~70px wide, so this must be one short word. */
  shortLabel: string;
  description: string;
  icon: LucideIcon;
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
 * The navigation, grouped by use case.
 *
 * Nine flat entries hid the thing that matters most about this system: it is
 * four capabilities, not nine screens, and every screen belongs to exactly one
 * of them. Anybody being shown the project had to be told the mapping out loud,
 * and on a phone the nine tabs were 40px wide.
 *
 * So the top level is the four use cases and nothing else. What sits inside one
 * is a submenu, reached by opening it. Each group carries both names: the
 * plain-language one staff use standing in an aisle, and the technical one the
 * paper uses, because those are two different audiences reading the same menu.
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
    children: [
      {
        href: "/",
        label: "Shelf check",
        shortLabel: "Check",
        description: "Pick a shelf, photograph it, count each row",
        icon: ScanLine,
      },
      {
        href: "/inventory",
        label: "Inventory",
        shortLabel: "Items",
        description: "Read from the inventory system",
        icon: Boxes,
      },
      {
        href: "/restock",
        label: "Refill jobs",
        shortLabel: "Refill",
        description: "Shelves the camera found empty",
        icon: ClipboardList,
      },
    ],
  },
  {
    useCase: 2,
    technicalName: "Planogram compliance",
    href: "/planogram",
    label: "Shelf layout",
    shortLabel: "Layout",
    description: "Is every product in the place it was sold",
    icon: LayoutGrid,
    children: [
      {
        href: "/planogram",
        label: "Layout check",
        shortLabel: "Check",
        description: "Compare a shelf against its plan",
        icon: LayoutGrid,
      },
      {
        href: "/shelves",
        label: "Shelves & rows",
        shortLabel: "Shelves",
        description: "Build a shelf and say what goes on each row",
        icon: Boxes,
      },
      {
        href: "/plan",
        label: "Filling plan",
        shortLabel: "Plan",
        description: "What goes at the front of each row",
        icon: PackageOpen,
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
    children: [
      {
        href: "/freshness",
        label: "Fruit & vegetables",
        shortLabel: "Fruit",
        description: "Fresh, ripe or spoiled",
        icon: Apple,
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
    children: [
      {
        href: "/expiry",
        label: "Read a date",
        shortLabel: "Read",
        description: "Photograph a packet and read the printed date",
        icon: CalendarClock,
      },
      {
        href: "/expiring",
        label: "Expiring soon",
        shortLabel: "Soon",
        description: "Dates already recorded, soonest first",
        icon: PackagePlus,
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
  },
];

/** Every destination, flattened — for lookups that do not care about grouping. */
export const NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.children),
  ...EXTRA_ITEMS,
];

/**
 * Longest-prefix match, not first match.
 *
 * `/` is a member of group 1, so a plain `startsWith` would claim every route
 * for it and the menu would highlight the wrong section everywhere.
 */
export function activeHref(pathname: string, candidates: readonly string[]): string | null {
  let best: string | null = null;
  for (const href of candidates) {
    const hit = href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
    if (hit && (best === null || href.length > best.length)) best = href;
  }
  return best;
}

/** The group the current route lives in, or null for the summary. */
export function groupFor(pathname: string): NavGroup | null {
  const hrefs = NAV_GROUPS.flatMap((group) => group.children.map((child) => child.href));
  const match = activeHref(pathname, hrefs);
  if (!match) return null;
  return NAV_GROUPS.find((group) => group.children.some((c) => c.href === match)) ?? null;
}
