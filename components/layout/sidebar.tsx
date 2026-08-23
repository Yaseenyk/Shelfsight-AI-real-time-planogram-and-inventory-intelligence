"use client";

import { ChevronDown, LayoutGrid, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { activeHref, groupFor, visibleExtras, visibleGroups } from "@/components/layout/nav-items";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

/**
 * The sidebar shows the four use cases, and only the four.
 *
 * A group opens to reveal its screens; the group containing the current page is
 * open by default, and the chevron overrides that either way. The number beside
 * each group is the number the paper uses, so a screen can be pointed at
 * on-stage and named without anybody having to remember the mapping.
 */
export function Sidebar() {
  const pathname = usePathname();
  const { user, signOut, can } = useAuth();
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  // Only the screens this role can use. A group whose every screen is hidden
  // disappears rather than becoming a heading that opens onto nothing.
  const groups = visibleGroups(can);
  const extras = visibleExtras(can);

  const currentGroup = groupFor(pathname, groups);
  const allHrefs = [
    ...groups.flatMap((group) => group.children.map((child) => child.href)),
    ...extras.map((item) => item.href),
  ];
  const current = activeHref(pathname, allHrefs);

  return (
    <aside className="hidden w-64 shrink-0 bg-card lg:flex lg:flex-col">
      <div className="flex h-16 items-center gap-2.5 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutGrid className="h-4 w-4" aria-hidden />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">ShelfSight AI</p>
          <p className="text-[11px] text-muted-foreground">Retail vision intelligence</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3" aria-label="Primary">
        <p className="text-label mb-2 px-2 text-muted-foreground">
          {groups.length === 4 ? "The four use cases" : "What you can do"}
        </p>

        <ul className="space-y-1">
          {groups.map((group) => {
            const Icon = group.icon;
            const isCurrent = currentGroup?.href === group.href;
            const hasSubmenu = group.children.length > 1;
            const isOpen = hasSubmenu && (toggled[group.href] ?? isCurrent);

            return (
              <li key={group.href}>
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-xl transition-colors",
                    isCurrent ? "bg-primary text-primary-foreground" : "hover:bg-accent",
                  )}
                >
                  <Link
                    href={group.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl py-2.5 pl-3"
                  >
                    <span
                      className={cn(
                        "tabular flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-[11px] font-bold",
                        isCurrent
                          ? "bg-primary-foreground/15 text-primary-foreground"
                          : "bg-secondary text-muted-foreground",
                      )}
                      aria-hidden
                    >
                      {group.useCase}
                    </span>
                    <Icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{group.label}</span>
                      <span
                        className={cn(
                          "block truncate text-[11px]",
                          isCurrent ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {group.technicalName}
                      </span>
                    </span>
                  </Link>

                  {hasSubmenu ? (
                    <button
                      type="button"
                      onClick={() => setToggled((state) => ({ ...state, [group.href]: !isOpen }))}
                      aria-expanded={isOpen}
                      aria-label={`${isOpen ? "Hide" : "Show"} the screens in ${group.label}`}
                      className="mr-1.5 shrink-0 rounded-lg p-1.5 opacity-70 transition-opacity hover:opacity-100"
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")}
                        aria-hidden
                      />
                    </button>
                  ) : (
                    <span className="w-3" aria-hidden />
                  )}
                </div>

                {isOpen ? (
                  // Indented behind a rail, so a submenu never reads as another
                  // top-level section.
                  <ul className="ml-6 mt-1 space-y-0.5 border-l border-border pl-2.5">
                    {group.children.map((child) => {
                      const ChildIcon = child.icon;
                      const isActive = current === child.href;
                      return (
                        <li key={child.href}>
                          <Link
                            href={child.href}
                            aria-current={isActive ? "page" : undefined}
                            className={cn(
                              "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors",
                              isActive
                                ? "bg-brand-soft font-semibold text-foreground"
                                : "text-muted-foreground hover:bg-accent",
                            )}
                          >
                            <ChildIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            <span className="truncate">{child.label}</span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>

        {extras.length > 0 ? <div className="my-3 border-t border-border" /> : null}

        <ul className="space-y-1">
          {extras.map((item) => {
            const Icon = item.icon;
            const isActive = current === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  <span className="w-5 shrink-0" aria-hidden />
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
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
