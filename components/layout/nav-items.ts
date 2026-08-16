import {
  Apple,
  Boxes,
  ClipboardList,
  PackagePlus,
  ScanBarcode,
  CalendarClock,
  LayoutGrid,
  PackageSearch,
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

/**
 * The navigation, defined once.
 *
 * The sidebar and the mobile bottom bar previously would have carried separate
 * copies of this list, which is how two navigations drift into disagreeing
 * about what the app contains. Labels are written for shop-floor staff: they
 * name the job the person is doing, not the technique — "Shelf layout", not
 * "Planogram compliance".
 */
export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Shelf check",
    shortLabel: "Shelf",
    description: "What is missing right now",
    icon: PackageSearch,
  },
  {
    href: "/shelves",
    label: "Shelves",
    shortLabel: "Shelves",
    description: "Set up rows and products",
    icon: Boxes,
  },
  {
    href: "/receiving",
    label: "Stockroom",
    shortLabel: "Stock",
    description: "Book in deliveries",
    icon: PackagePlus,
  },
  {
    href: "/restock",
    label: "Refill jobs",
    shortLabel: "Refill",
    description: "Shelves that need filling",
    icon: ClipboardList,
  },
  {
    href: "/till",
    label: "Till",
    shortLabel: "Till",
    description: "Scan a sale",
    icon: ScanBarcode,
  },
  {
    href: "/planogram",
    label: "Shelf layout",
    shortLabel: "Layout",
    description: "Is everything in the right place",
    icon: LayoutGrid,
  },
  {
    href: "/freshness",
    label: "Fruit & vegetables",
    shortLabel: "Fruit",
    description: "Fresh, ripe or spoiled",
    icon: Apple,
  },
  {
    href: "/expiry",
    label: "Expiry dates",
    shortLabel: "Dates",
    description: "Read dates from packets",
    icon: CalendarClock,
  },
  {
    href: "/insights",
    label: "Daily summary",
    shortLabel: "Summary",
    description: "A short report for you",
    icon: Sparkles,
  },
];
