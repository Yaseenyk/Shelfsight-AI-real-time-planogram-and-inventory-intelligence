"use client";

import { AlertTriangle, Bot, CircleAlert, Loader2 } from "lucide-react";
import { useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SeverityBadge } from "@/components/ui/status";
import { insights } from "@/lib/api/endpoints";
import { useAction, useApi } from "@/lib/hooks/use-api";
import { TONE_STYLES, SEVERITY_PHRASE } from "@/lib/plain-language";
import type { InsightRequest } from "@/lib/types/api";
import { cn, formatLatency, timeAgo } from "@/lib/utils";

const AUDIENCES: Array<{ value: NonNullable<InsightRequest["audience"]>; label: string }> = [
  { value: "store_manager", label: "Store manager" },
  { value: "regional_director", label: "Regional director" },
  { value: "analyst", label: "Analyst" },
];

const WINDOWS = [
  { value: 1, label: "The last hour" },
  { value: 24, label: "Today" },
  { value: 168, label: "This week" },
];

/**
 * Why the AI assistant didn't write this, said without jargon.
 *
 * The backend reasons are precise but unreadable to a shop-floor user
 * ("schema_validation_failed"). Each one still needs a *true* explanation —
 * hiding the fallback entirely would leave someone trusting a rule-based
 * summary as if a model had reasoned about their shelves.
 */
const DEGRADED_HELP: Record<string, string> = {
  ollama_unreachable: "The AI assistant is not switched on right now.",
  model_not_found: "The AI assistant is switched on, but its language model is not installed.",
  timeout: "The AI assistant took too long to answer.",
  invalid_json: "The AI assistant gave an answer we could not read.",
  schema_validation_failed: "The AI assistant gave an answer in the wrong format, so we ignored it.",
  http_error: "The AI assistant returned an unexpected error.",
};

function degradedHelp(reason?: string | null): string {
  if (!reason) return "The AI assistant was unavailable.";
  const key = reason.split(":")[0]!.trim();
  return DEGRADED_HELP[key] ?? reason;
}

export default function InsightsPage() {
  const [audience, setAudience] =
    useState<NonNullable<InsightRequest["audience"]>>("store_manager");
  const [windowHours, setWindowHours] = useState(24);
  const [showPrompt, setShowPrompt] = useState(false);

  const status = useApi(insights.status, { pollMs: 60_000 });
  const context = useApi(() => insights.context({ window_hours: windowHours }), {
    deps: [windowHours],
  });
  const prompt = useApi(() => insights.prompt({ window_hours: windowHours, audience }), {
    enabled: showPrompt,
    deps: [showPrompt, windowHours, audience],
  });
  const generate = useAction(() => insights.generate({ audience, window_hours: windowHours }));

  const briefing = generate.data;
  const offline = status.data && !status.data.reachable;
  const modelMissing = status.data?.reachable && !status.data.model_available;

  return (
    <PageShell title="Daily summary" subtitle="A short report about your shop, in plain words">
      {/* Said before the button is pressed, not after a 60-second wait. */}
      {offline || modelMissing ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div className="space-y-1">
            <p className="font-medium">The AI assistant is not available</p>
            <p className="text-sm opacity-90">
              You can still get a summary — it will be written by the system instead, using the
              same numbers.
            </p>
          </div>
        </div>
      ) : null}

      {/* One row of controls, in words rather than parameters. */}
      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-5">
        <div className="min-w-[180px]">
          <label
            htmlFor="window"
            className="mb-1.5 block text-sm font-medium text-muted-foreground"
          >
            Which period?
          </label>
          <select
            id="window"
            value={windowHours}
            onChange={(event) => setWindowHours(Number(event.target.value))}
            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {WINDOWS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <Button
          size="lg"
          disabled={generate.isPending}
          onClick={() => void generate.execute()}
          className="min-h-[46px]"
        >
          {generate.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Bot className="h-4 w-4" aria-hidden />
          )}
          {generate.isPending ? "Writing your summary…" : "Write my summary"}
        </Button>
      </section>

      <Card>
        <CardContent className="space-y-5 p-6">
          {generate.isPending ? (
            <div className="space-y-3">
              <Skeleton className="h-7 w-2/3" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-14 w-full" />
              <p className="text-sm text-muted-foreground">
                This runs on your own computer and usually takes 10–60 seconds.
              </p>
            </div>
          ) : generate.error ? (
            <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              {generate.error.message}
            </p>
          ) : !briefing ? (
            <p className="py-10 text-center text-base text-muted-foreground">
              No summary yet. Press “Write my summary” above.
            </p>
          ) : (
            <>
              {briefing.degraded ? (
                <div className="flex items-start gap-3 rounded-lg border border-warning/30 bg-warning/10 p-4 text-warning">
                  <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      Written by the system, not by the AI assistant
                    </p>
                    <p className="text-sm opacity-90">{degradedHelp(briefing.degraded_reason)}</p>
                    <p className="text-sm opacity-90">
                      The numbers below are still correct.
                    </p>
                  </div>
                </div>
              ) : null}

              {briefing.headline ? (
                <h2 className="text-2xl font-semibold leading-snug">{briefing.headline}</h2>
              ) : null}
              <p className="text-lg leading-relaxed">{briefing.summary}</p>

              {briefing.actions.length ? (
                <div className="space-y-3">
                  <h3 className="text-base font-semibold">What to do, most important first</h3>
                  <ol className="space-y-3">
                    {briefing.actions.map((action) => (
                      <li
                        key={action.priority}
                        className="flex items-start gap-4 rounded-lg border border-border p-4"
                      >
                        <span
                          className={cn(
                            "tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base font-semibold text-white",
                            TONE_STYLES[SEVERITY_PHRASE[action.severity].tone].dot,
                          )}
                          aria-hidden
                        >
                          {action.priority}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <p className="text-base font-semibold">{action.title}</p>
                            <SeverityBadge value={action.severity} />
                          </div>
                          <p className="text-sm text-muted-foreground">{action.rationale}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : (
                <p className="text-base text-muted-foreground">
                  Nothing needs doing for this period.
                </p>
              )}

              <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                Written {timeAgo(briefing.generated_at)}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Everything the shop floor does not need, kept intact for the viva and
          for whoever maintains this. The compiled prompt in particular is what
          makes the LLM stage quotable in the paper. */}
      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-muted-foreground">
          Technical detail (for whoever maintains this system)
        </summary>

        <div className="space-y-6 border-t border-border p-5">
          <div className="space-y-3">
            <p className="text-sm font-medium">Briefing audience</p>
            <select
              value={audience}
              onChange={(event) =>
                setAudience(event.target.value as NonNullable<InsightRequest["audience"]>)
              }
              className="rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Briefing audience"
            >
              {AUDIENCES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {briefing ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-mono">{briefing.model}</span> ·{" "}
              {formatLatency(briefing.latency_ms)} · {briefing.completion_tokens ?? "—"} completion
              tokens · {briefing.scope} scope
              {briefing.model_substituted
                ? ` · substituted for ${briefing.model_requested}`
                : ""}
            </p>
          ) : null}

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ollama status</span>
              {status.isLoading ? (
                <Skeleton className="h-5 w-16" />
              ) : (
                <Badge variant={status.data?.reachable ? "success" : "destructive"}>
                  {status.data?.reachable ? "reachable" : "offline"}
                </Badge>
              )}
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Endpoint</span>
              <span className="truncate font-mono text-xs">{status.data?.base_url ?? "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Configured model</span>
              <span className="flex items-center gap-1.5 font-mono text-xs">
                {status.data?.default_model ?? "—"}
                {status.data?.reachable ? (
                  <Badge variant={status.data.model_available ? "success" : "warning"}>
                    {status.data.model_available ? "installed" : "missing"}
                  </Badge>
                ) : null}
              </span>
            </div>
            {status.data?.hint ? (
              <p className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-warning">
                {status.data.hint}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Compiled prompt</p>
              <Button size="sm" variant="outline" onClick={() => setShowPrompt((v) => !v)}>
                {showPrompt ? "Hide" : "Show"}
              </Button>
            </div>
            {showPrompt ? (
              prompt.isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : prompt.data ? (
                <>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">System</p>
                  <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                    {prompt.data.system}
                  </pre>
                  <p className="mb-1 mt-2 text-xs font-medium text-muted-foreground">User</p>
                  <pre className="max-h-60 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                    {prompt.data.user}
                  </pre>
                </>
              ) : (
                <p className="text-xs text-destructive">{prompt.error?.message}</p>
              )
            ) : null}
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Compiled context</p>
            <CardDescription className="text-xs">
              The exact telemetry the briefing was built from — reproducible after the fact
            </CardDescription>
            {context.isLoading ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-[11px] leading-relaxed">
                {context.data ? JSON.stringify(context.data, null, 2) : "—"}
              </pre>
            )}
          </div>
        </div>
      </details>
    </PageShell>
  );
}
