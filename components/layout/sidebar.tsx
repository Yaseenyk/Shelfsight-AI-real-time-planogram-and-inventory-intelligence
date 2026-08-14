"use client";

import {
  Apple,
  CalendarClock,
  LayoutGrid,
  PackageSearch,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Overview",
    description: "Stock discrepancies & live alerts",
    icon: PackageSearch,
  },
  {
    href: "/planogram",
    label: "Planogram",
    description: "Spatial compliance audit",
    icon: LayoutGrid,
  },
  {
    href: "/freshness",
    label: "Freshness",
    description: "Spoilage classification",
    icon: Apple,
  },
  {
    href: "/expiry",
    label: "Expiry",
    description: "Packaging OCR & validity",
    icon: CalendarClock,
  },
  {
    href: "/insights",
    label: "AI Insights",
    description: "Local LLM briefing",
    icon: Sparkles,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutGrid className="h-4 w-4" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">ShelfSight AI</p>
          <p className="text-[11px] text-muted-foreground">Retail vision intelligence</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3" aria-label="Primary">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block font-medium">{item.label}</span>
                <span className="block truncate text-[11px] opacity-80">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Phase 0 · research build
          <br />
          YOLOv8 · MobileNetV2 · EasyOCR · Ollama
        </p>
      </div>
    </aside>
  );
}
