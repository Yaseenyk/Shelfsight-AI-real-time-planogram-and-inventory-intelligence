"use client";

import { BellRing } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusChip } from "@/components/ui/status";
import { inventory } from "@/lib/api/endpoints";
import { POLL_INTERVAL_MS, useApi } from "@/lib/hooks/use-api";
import { DISCREPANCY_PHRASE, TONE_STYLES, countSentence } from "@/lib/plain-language";
import type { InventoryLog, Product } from "@/lib/types/api";
import { cn, timeAgo } from "@/lib/utils";

/**
 * The to-do list, ordered so the top item is the one to do first.
 *
 * Replaces a feed that read `detected 0 · system 18 · Δ -18 · shelf S1`. Nobody
 * on a shop floor decodes a delta symbol; they need the product name, what is
 * wrong in words, and what to do about it.
 */
export function ActionList({ limit = 8 }: { limit?: number }) {
  const alerts = useApi(() => inventory.alerts(limit), { pollMs: POLL_INTERVAL_MS });
  // Alerts carry product_id only, so the catalogue supplies the human name.
  const products = useApi(() => inventory.products({ limit: 200 }));

  const nameById = new Map<number, Product>(
    (products.data ?? []).map((product) => [product.id, product]),
  );

  const ordered = [...(alerts.data ?? [])].sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 } as const;
    return rank[a.severity] - rank[b.severity];
  });

  return (
    <Card className="flex h-full min-h-0 flex-col">
      <CardHeader className="shrink-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BellRing className="h-4 w-4 text-muted-foreground" aria-hidden />
          What to do now
        </CardTitle>
        <CardDescription className="text-xs font-light">
          Most important first. Updates on its own.
        </CardDescription>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 space-y-2 overflow-y-auto">
        {alerts.isLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : alerts.error ? (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Cannot reach the system right now. Try again in a moment.
          </p>
        ) : ordered.length === 0 ? (
          <p className="py-8 text-center text-sm font-light text-muted-foreground">
            Nothing to do. Take a photo of a shelf to check it.
          </p>
        ) : (
          <ol className="space-y-3">
            {ordered.map((alert, index) => (
              <ActionRow
                key={alert.id}
                alert={alert}
                position={index + 1}
                product={nameById.get(alert.product_id)}
              />
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

function ActionRow({
  alert,
  position,
  product,
}: {
  alert: InventoryLog;
  position: number;
  product?: Product;
}) {
  const phrase = DISCREPANCY_PHRASE[alert.discrepancy_type];
  const tone = TONE_STYLES[phrase.tone];

  return (
    <li className="flex items-start gap-3 rounded-xl bg-secondary p-3">
      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold text-white",
          tone.dot,
        )}
        aria-hidden
      >
        {position}
      </span>

      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-semibold">
            {product?.name ?? `Product #${alert.product_id}`}
          </span>
          <StatusChip phrase={phrase} />
        </div>

        <p className="text-xs font-light text-muted-foreground">
          {countSentence(alert.detected_count, alert.system_count)}
        </p>

        {phrase.action ? (
          <p className="text-xs font-medium text-foreground/90">→ {phrase.action}</p>
        ) : null}
      </div>

      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(alert.created_at)}</span>
    </li>
  );
}
