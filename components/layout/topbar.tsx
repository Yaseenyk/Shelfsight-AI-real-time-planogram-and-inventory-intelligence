"use client";

import { Activity, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { meta } from "@/lib/api/endpoints";
import { useApi } from "@/lib/hooks/use-api";
import { cn } from "@/lib/utils";

/**
 * Backend reachability indicator. Polled slowly (30 s) — it answers "is the
 * pipeline up", not "what changed", so a faster cadence buys nothing.
 */
export function Topbar({
  title,
  subtitle,
  status,
}: {
  title: string;
  subtitle?: string;
  /** Page-specific status, shown before the system indicators. */
  status?: ReactNode;
}) {
  const { data, error, isLoading, isRefreshing, refresh } = useApi(meta.health, {
    pollMs: 30_000,
  });

  const online = !error && data?.status === "ok";

  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-3 px-4 sm:px-5">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold">{title}</h1>
        {subtitle ? (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>

      {/* Status badges are shrink-0 so the title truncates instead of them, and
          the secondary ones hide on a phone where the bar has ~120px to spare.
          The critical "wrong model" warning is never hidden. */}
      <div className="flex shrink-0 items-center gap-2">
        {status}
        {/* Status is for the shop floor, so it answers "can I use this?" rather
            than naming the model. The technical detail moves to the tooltip,
            where a maintainer can still find it. "YOLOv8 · 1 classes" told a
            shopkeeper nothing and was ungrammatical besides. */}
        {isLoading ? (
          <Badge variant="outline">Connecting…</Badge>
        ) : online ? (
          <>
            <Badge
              variant={data?.detector_loaded ? "success" : "warning"}
              title={data?.detector_model ?? data?.detector_error ?? undefined}
            >
              <Activity className="h-3 w-3" aria-hidden />
              <span className="hidden sm:inline">
                {data?.detector_loaded ? "Ready to check shelves" : "Starting up…"}
              </span>
              <span className="sm:hidden">{data?.detector_loaded ? "Ready" : "Starting"}</span>
            </Badge>
            {data?.detector_is_generic_baseline ? (
              <Badge
                variant="destructive"
                title="The configured detector file is the generic COCO model, which recognises people and cars rather than shelf products."
              >
                Wrong model loaded
              </Badge>
            ) : null}
            {!data?.ollama_reachable ? (
              <Badge
                className="hidden sm:inline-flex"
                variant="outline"
                title="Ollama is not running, so the daily summary is written by the system instead of the AI assistant."
              >
                Summaries: basic
              </Badge>
            ) : null}
          </>
        ) : (
          <Badge variant="destructive" title={error?.message}>
            Cannot reach the system
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
