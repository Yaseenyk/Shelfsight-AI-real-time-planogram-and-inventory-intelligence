"use client";

import { Bot, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/status";
import { insights } from "@/lib/api/endpoints";
import type { InsightRequest } from "@/lib/types/api";
import { useAction, useApi } from "@/lib/hooks/use-api";
import { formatLatency, timeAgo } from "@/lib/utils";

const AUDIENCES: Array<{ value: NonNullable<InsightRequest["audience"]>; label: string }> = [
  { value: "store_manager", label: "Store manager" },
  { value: "regional_director", label: "Regional director" },
  { value: "analyst", label: "Analyst" },
];

export default function InsightsPage() {
  const status = useApi(insights.status, { pollMs: 60_000 });
  const context = useApi(() => insights.context({ window_hours: 24 }));
  const [audience, setAudience] = useState<NonNullable<InsightRequest["audience"]>>(
    "store_manager",
  );
  const generate = useAction(() => insights.generate({ audience, window_hours: 24 }));

  const briefing = generate.data;

  return (
    <PageShell
      title="Executive AI Insights"
      subtitle="Natural-language discrepancy briefings generated locally via Ollama"
    >
      <section className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Shelf briefing
                </CardTitle>
                <CardDescription>
                  Built from the last 24 h of inventory, compliance, freshness and expiry audits
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={audience}
                  onChange={(event) =>
                    setAudience(event.target.value as NonNullable<InsightRequest["audience"]>)
                  }
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Briefing audience"
                >
                  {AUDIENCES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <Button size="sm" disabled={generate.isPending} onClick={() => void generate.execute()}>
                  {generate.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Bot className="h-3.5 w-3.5" aria-hidden />
                  )}
                  Generate
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {generate.error ? (
                <p className="text-xs text-destructive">{generate.error.message}</p>
              ) : null}

              {!briefing ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No briefing yet — generate one to summarise the current shelf state.
                </p>
              ) : (
                <>
                  {briefing.degraded ? (
                    <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning">
                      Ollama was unreachable — this is the deterministic rule-based fallback, not
                      generated text.
                    </p>
                  ) : null}

                  {briefing.headline ? (
                    <h2 className="text-base font-semibold">{briefing.headline}</h2>
                  ) : null}
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {briefing.summary}
                  </p>

                  {briefing.actions.length ? (
                    <ul className="space-y-2">
                      {briefing.actions.map((action, index) => (
                        <li key={index} className="rounded-md border border-border p-3">
                          <div className="flex items-start justify-between gap-3">
                            <p className="text-sm font-medium">{action.title}</p>
                            <SeverityBadge value={action.severity} />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{action.rationale}</p>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <p className="text-[11px] text-muted-foreground">
                    {briefing.model} · {formatLatency(briefing.latency_ms)} ·{" "}
                    {briefing.completion_tokens ?? "—"} completion tokens ·{" "}
                    {timeAgo(briefing.generated_at)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Ollama</CardTitle>
              <CardDescription>Local inference endpoint</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={status.data?.reachable ? "success" : "destructive"}>
                  {status.data?.reachable ? "reachable" : "offline"}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Endpoint</span>
                <span className="truncate font-mono">{status.data?.base_url ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Default model</span>
                <span className="font-mono">{status.data?.default_model ?? "—"}</span>
              </div>
              {status.data?.available_models?.length ? (
                <div className="pt-1">
                  <p className="mb-1 text-muted-foreground">Available</p>
                  <div className="flex flex-wrap gap-1">
                    {status.data.available_models.map((model) => (
                      <Badge key={model} variant="outline">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {status.data?.error ? (
                <p className="pt-1 text-destructive">{status.data.error}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prompt context</CardTitle>
              <CardDescription>
                The exact telemetry sent to the model — kept visible for reproducibility
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                {context.data ? JSON.stringify(context.data, null, 2) : "—"}
              </pre>
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
