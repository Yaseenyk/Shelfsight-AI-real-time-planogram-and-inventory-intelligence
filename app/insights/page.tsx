"use client";

import {
  AlertTriangle,
  Bot,
  CircleAlert,
  Code2,
  Loader2,
  Sparkles,
  Terminal,
} from "lucide-react";
import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/ui/status";
import { insights } from "@/lib/api/endpoints";
import { useAction, useApi } from "@/lib/hooks/use-api";
import type { InsightRequest, Severity } from "@/lib/types/api";
import { cn, formatLatency, timeAgo } from "@/lib/utils";

const AUDIENCES: Array<{ value: NonNullable<InsightRequest["audience"]>; label: string }> = [
  { value: "store_manager", label: "Store manager" },
  { value: "regional_director", label: "Regional director" },
  { value: "analyst", label: "Analyst" },
];

const WINDOWS = [
  { value: 1, label: "Last hour" },
  { value: 24, label: "Last 24 hours" },
  { value: 168, label: "Last 7 days" },
];

/** Plain-English explanation of each backend degradation reason. */
const DEGRADED_HELP: Record<string, string> = {
  ollama_unreachable:
    "Ollama isn't running. Start it with `ollama serve`, then generate again.",
  model_not_found:
    "Ollama is running but the configured model isn't installed. Pull it with `ollama pull <model>`.",
  timeout:
    "The model didn't finish in time. A smaller model (llama3.2) or a longer OLLAMA_TIMEOUT_S will help.",
  invalid_json: "The model replied with text that wasn't valid JSON.",
  schema_validation_failed:
    "The model returned JSON in the wrong shape, so it was rejected rather than shown.",
  http_error: "Ollama returned an unexpected HTTP error.",
};

function degradedHelp(reason?: string | null): string {
  if (!reason) return "The local LLM was unavailable.";
  const key = reason.split(":")[0]!.trim();
  return DEGRADED_HELP[key] ?? reason;
}

const PRIORITY_RING: Record<Severity, string> = {
  critical: "bg-destructive/10 text-destructive",
  warning: "bg-warning/10 text-warning",
  info: "bg-primary/10 text-primary",
};

export default function InsightsPage() {
  const [audience, setAudience] =
    useState<NonNullable<InsightRequest["audience"]>>("store_manager");
  const [windowHours, setWindowHours] = useState(24);
  const [showPrompt, setShowPrompt] = useState(false);

  const status = useApi(insights.status, { pollMs: 60_000 });
  const context = useApi(() => insights.context({ window_hours: windowHours }), {
    deps: [windowHours],
  });
  const prompt = useApi(
    () => insights.prompt({ window_hours: windowHours, audience }),
    { enabled: showPrompt, deps: [showPrompt, windowHours, audience] },
  );
  const generate = useAction(() =>
    insights.generate({ audience, window_hours: windowHours }),
  );

  const briefing = generate.data;
  const offline = status.data && !status.data.reachable;
  const modelMissing = status.data?.reachable && !status.data.model_available;

  return (
    <PageShell
      title="Executive AI Insights"
      subtitle="Natural-language shelf briefings generated locally via Ollama — no data leaves the machine"
    >
      {/* Environment problems are stated before the user presses Generate,
          rather than after a 60-second wait ending in a fallback. */}
      {offline || modelMissing ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="space-y-1 text-sm">
            <p className="font-medium">
              {offline ? "Ollama is not reachable" : "Configured model is not installed"}
            </p>
            <p className="text-xs opacity-90">
              {status.data?.hint ??
                "Briefings will fall back to a deterministic rule-based summary."}
            </p>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Shelf briefing
                </CardTitle>
                <CardDescription>
                  Compiled from inventory, compliance, freshness and expiry audits
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={windowHours}
                  onChange={(event) => setWindowHours(Number(event.target.value))}
                  className="rounded-md border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Time window"
                >
                  {WINDOWS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
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
              {generate.isPending ? (
                <div className="space-y-3">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <p className="text-xs text-muted-foreground">
                    Generating locally on CPU — a 3B model typically takes 10–60 s.
                  </p>
                </div>
              ) : generate.error ? (
                <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  {generate.error.message}
                </p>
              ) : !briefing ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No briefing yet — generate one to summarise the current shelf state.
                </p>
              ) : (
                <>
                  {briefing.degraded ? (
                    <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/10 p-3 text-warning">
                      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                      <div className="space-y-1">
                        <p className="text-xs font-medium">
                          Rule-based fallback — this text was not written by the LLM
                        </p>
                        <p className="text-xs opacity-90">{degradedHelp(briefing.degraded_reason)}</p>
                      </div>
                    </div>
                  ) : null}

                  {briefing.model_substituted ? (
                    <p className="text-xs text-muted-foreground">
                      Ran on <span className="font-mono">{briefing.model}</span> because{" "}
                      <span className="font-mono">{briefing.model_requested}</span> is not installed.
                    </p>
                  ) : null}

                  {briefing.headline ? (
                    <h2 className="text-base font-semibold">{briefing.headline}</h2>
                  ) : null}
                  <p className="text-sm leading-relaxed text-muted-foreground">{briefing.summary}</p>

                  {briefing.actions.length ? (
                    <ol className="space-y-2">
                      {briefing.actions.map((action) => (
                        <li
                          key={action.priority}
                          className="flex items-start gap-3 rounded-md border border-border p-3"
                        >
                          <span
                            className={cn(
                              "tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                              PRIORITY_RING[action.severity],
                            )}
                          >
                            {action.priority}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start justify-between gap-3">
                              <p className="text-sm font-medium">{action.title}</p>
                              <SeverityBadge value={action.severity} />
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{action.rationale}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      No actions required for this scope.
                    </p>
                  )}

                  <p className="border-t border-border pt-3 text-[11px] text-muted-foreground">
                    <span className="font-mono">{briefing.model}</span> ·{" "}
                    {formatLatency(briefing.latency_ms)} · {briefing.completion_tokens ?? "—"}{" "}
                    completion tokens · {briefing.scope} scope · {timeAgo(briefing.generated_at)}
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-muted-foreground" aria-hidden />
                  Compiled prompt
                </CardTitle>
                <CardDescription>
                  Exactly what the model is sent — quotable in the paper
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowPrompt((v) => !v)}>
                {showPrompt ? "Hide" : "Show"}
              </Button>
            </CardHeader>
            {showPrompt ? (
              <CardContent className="space-y-3">
                {prompt.isLoading ? (
                  <Skeleton className="h-40 w-full" />
                ) : prompt.data ? (
                  <>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">System</p>
                      <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                        {prompt.data.system}
                      </pre>
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-medium text-muted-foreground">User</p>
                      <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                        {prompt.data.user}
                      </pre>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-destructive">{prompt.error?.message}</p>
                )}
              </CardContent>
            ) : null}
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-muted-foreground" aria-hidden />
                Ollama
              </CardTitle>
              <CardDescription>Local inference endpoint</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                {status.isLoading ? (
                  <Skeleton className="h-5 w-16" />
                ) : (
                  <Badge variant={status.data?.reachable ? "success" : "destructive"}>
                    {status.data?.reachable ? "reachable" : "offline"}
                  </Badge>
                )}
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Version</span>
                <span className="font-mono">{status.data?.version ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Endpoint</span>
                <span className="truncate font-mono">{status.data?.base_url ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Configured model</span>
                <span className="flex items-center gap-1.5 font-mono">
                  {status.data?.default_model ?? "—"}
                  {status.data?.reachable ? (
                    <Badge variant={status.data.model_available ? "success" : "warning"}>
                      {status.data.model_available ? "installed" : "missing"}
                    </Badge>
                  ) : null}
                </span>
              </div>
              {status.data?.available_models?.length ? (
                <div className="pt-1">
                  <p className="mb-1 text-muted-foreground">Installed</p>
                  <div className="flex flex-wrap gap-1">
                    {status.data.available_models.map((model) => (
                      <Badge key={model} variant="outline">
                        {model}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
              {status.data?.hint ? (
                <p className="rounded-md border border-warning/30 bg-warning/10 px-2 py-1.5 text-warning">
                  {status.data.hint}
                </p>
              ) : null}
              {status.data?.error ? (
                <p className="text-destructive">{status.data.error}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Telemetry</CardTitle>
              <CardDescription>
                The compiled context behind the briefing — reproducible after the fact
              </CardDescription>
            </CardHeader>
            <CardContent>
              {context.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                  {context.data ? JSON.stringify(context.data, null, 2) : "—"}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
