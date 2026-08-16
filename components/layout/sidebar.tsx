"use client";

import { LayoutGrid, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/layout/nav-items";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  return (
    <aside className="hidden w-60 shrink-0 bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
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
                // Bigger targets and type: this gets used on a phone, standing
                // in an aisle, often one-handed.
                "flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                isActive
                  // Active nav is solid ink, matching the reference's
                  // treatment of the current section.
                  ? "bg-primary font-semibold text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
              <span className="min-w-0">
                <span className="block font-medium">{item.label}</span>
                <span className="block truncate text-xs opacity-80">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Who is signed in, and the way out. Shift changes are frequent and the
          person leaving must be able to hand the device over without hunting
          for a menu. */}
      <div className="mt-auto p-3">
        <div className="rounded-xl bg-secondary p-3">
          <p className="truncate text-sm font-semibold">{user?.name}</p>
          <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
          <button
            type="button"
            onClick={() => void signOut()}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-card px-3 py-2 text-xs font-semibold transition-colors hover:bg-accent"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden />
            Sign out
          </button>
        </div>
        <p className="mt-3 px-1 text-[10.5px] leading-relaxed text-muted-foreground">
          Runs entirely on this computer · nothing uploaded
        </p>
      </div>
    </aside>
  );
}
