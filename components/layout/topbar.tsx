"use client";

import { Activity, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { meta } from "@/lib/api/endpoints";
import { useApi } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

/**
 * Backend reachability indicator. Polled slowly (30 s) — it answers "is the
 * pipeline up", not "what changed", so a faster cadence buys nothing.
 */
export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const { data, error, isLoading, isRefreshing, refresh } = useApi(meta.health, {
    pollMs: 30_000,
  });

  const online = !error && data?.status === "ok";

  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border bg-card px-5">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        {isLoading ? (
          <Badge variant="outline">Connecting…</Badge>
        ) : online ? (
          <>
            <Badge variant="success">
              <Activity className="h-3 w-3" aria-hidden />
              API online
            </Badge>
            <Badge
              variant={data?.detector_loaded ? "info" : "outline"}
              title={data?.detector_model ?? data?.detector_error ?? undefined}
            >
              {data?.detector_loaded
                ? `YOLOv8 · ${data.detector_classes ?? "?"} classes`
                : "Detector idle"}
            </Badge>
            <Badge variant={data?.ollama_reachable ? "info" : "outline"}>
              {data?.ollama_reachable ? "Ollama up" : "Ollama offline"}
            </Badge>
          </>
        ) : (
          <Badge variant="destructive" title={error?.message}>
            API unreachable
          </Badge>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refresh()}
          aria-label="Refresh backend status"
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} aria-hidden />
        </Button>
      </div>
    </header>
  );
}
