"use client";

import { Lock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { permissionFor, visibleGroups } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/context";

/**
 * What happens when somebody opens a screen their role does not have.
 *
 * Hiding the menu item is not enough: the URL survives a bookmark, a shared
 * link, or a shift change on the same tablet. Without this the page would
 * mount, fire its requests, collect a row of 403s and render as though the
 * system were broken.
 *
 * So it says plainly that the screen belongs to another role, and offers the
 * first screen this one does have. Refusing is fine; refusing without saying
 * why, or leaving somebody on a dead page, is not.
 */
export function RouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, can } = useAuth();

  const permission = permissionFor(pathname);
  // An unrecognised route is left alone — that is Next's 404 to answer, not
  // ours, and claiming it is forbidden would be a worse answer than "no such
  // page".
  if (!user || permission === null || can(permission)) {
    return <>{children}</>;
  }

  const home = visibleGroups(can)[0]?.href ?? "/";

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
          <Lock className="h-6 w-6 text-muted-foreground" aria-hidden />
        </div>
        <h1 className="text-lg font-bold">This screen is for another role</h1>
        <p className="mx-auto mt-2 text-sm text-muted-foreground">
          You are signed in as <strong className="font-semibold text-foreground">{user.name}</strong>
          , a {user.role}. This part of the system belongs to someone else&rsquo;s job — ask a
          manager if you need it.
        </p>
        <Button className="mt-5" onClick={() => router.push(home)}>
          Take me back
        </Button>
      </div>
    </div>
  );
}
