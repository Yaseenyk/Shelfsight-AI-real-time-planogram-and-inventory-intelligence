"use client";

import { BellRing } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DiscrepancyBadge, SeverityBadge } from "@/components/ui/status";
import { inventory } from "@/lib/api/endpoints";
import { POLL_INTERVAL_MS, useApi } from "@/lib/hooks/use-api";
import { timeAgo } from "@/lib/utils";

/** Live discrepancy feed — polls `/inventory/alerts` on the configured interval. */
export function DiscrepancyAlerts({ limit = 12 }: { limit?: number }) {
  const { data, error, isLoading } = useApi(() => inventory.alerts(limit), {
    pollMs: POLL_INTERVAL_MS,
  });

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-4 w-4 text-muted-foreground" aria-hidden />
            Real-time discrepancy alerts
          </CardTitle>
          <CardDescription>
            Refreshes every {Math.round(POLL_INTERVAL_MS / 1000)}s
          </CardDescription>
        </div>
        {data?.length ? <Badge variant="outline">{data.length}</Badge> : null}
      </CardHeader>

      <CardContent className="flex-1 space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </>
        ) : error ? (
          <p className="text-xs text-destructive">{error.message}</p>
        ) : !data?.length ? (
          <p className="py-6 text-center text-xs text-muted-foreground">
            No open discrepancies. Run a scan to populate the feed.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.map((alert) => (
              <li
                key={alert.id}
                className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DiscrepancyBadge value={alert.discrepancy_type} />
                    <SeverityBadge value={alert.severity} />
                  </div>
                  <p className="tabular text-xs text-muted-foreground">
                    detected {alert.detected_count} · system {alert.system_count} · Δ{" "}
                    <span className="font-medium text-foreground">{alert.discrepancy}</span>
                    {alert.shelf_id ? ` · shelf ${alert.shelf_id}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {timeAgo(alert.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
