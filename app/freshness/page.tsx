"use client";

import { Apple, Gauge, ThermometerSun, Trash2 } from "lucide-react";

import { CapturePanel } from "@/components/dashboard/capture-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FreshnessBadge } from "@/components/ui/status";
import { freshness } from "@/lib/api/endpoints";
import { useAction, useApi } from "@/lib/hooks/use-api";
import { formatLatency, formatNumber, formatPercent, timeAgo } from "@/lib/utils";

export default function FreshnessPage() {
  const summary = useApi(freshness.summary);
  const audits = useApi(() => freshness.audits({ limit: 20 }));
  const classify = useAction((file: File) => freshness.classifyImage(file));

  const data = summary.data;

  return (
    <PageShell
      title="Food Freshness & Spoilage"
      subtitle="Perishable classification — Fresh / Ripening / Spoiled (MobileNetV2 · ResNet50)"
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Assessed"
          value={formatNumber(data?.total_assessed)}
          hint="Crops classified to date"
          icon={Apple}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Spoilage rate"
          value={formatPercent(data?.spoilage_rate, 1)}
          hint={`${formatNumber(data?.spoiled)} spoiled units`}
          icon={Trash2}
          tone={data && data.spoilage_rate > 0.1 ? "critical" : "success"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Ripening"
          value={formatNumber(data?.ripening)}
          hint="Markdown candidates"
          icon={ThermometerSun}
          tone={data && data.ripening > 0 ? "warning" : "neutral"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Mean confidence"
          value={formatPercent(data?.mean_confidence, 1)}
          hint="Top-1 softmax score"
          icon={Gauge}
          isLoading={summary.isLoading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <CapturePanel
            title="Classify a perishable"
            description="Upload a produce crop to score its freshness."
            actionLabel="Classify"
            isPending={classify.isPending}
            error={classify.error}
            onSubmit={async (file) => {
              await classify.execute(file);
              await Promise.all([summary.refresh(), audits.refresh()]);
            }}
          />
        </div>

        <div className="space-y-4 lg:col-span-3">
          {classify.data?.predictions.length ? (
            <Card>
              <CardHeader>
                <CardTitle>Prediction</CardTitle>
                <CardDescription>
                  {formatLatency(classify.data.latency_ms)} ·{" "}
                  {classify.data.predictions[0]?.backbone ?? "model"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {classify.data.predictions.map((prediction, index) => (
                  <div key={index} className="space-y-2 rounded-md border border-border p-3">
                    <div className="flex items-center justify-between">
                      <FreshnessBadge value={prediction.label} />
                      <span className="tabular text-xs text-muted-foreground">
                        {formatPercent(prediction.confidence, 1)}
                      </span>
                    </div>
                    {/* Class probabilities as labelled meters — one hue, value shown as text. */}
                    <div className="space-y-1.5">
                      {Object.entries(prediction.class_probabilities).map(([label, score]) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="w-20 shrink-0 text-[11px] text-muted-foreground">
                            {label}
                          </span>
                          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                            <span
                              className="block h-full rounded-full bg-primary"
                              style={{ width: `${Math.round(score * 100)}%` }}
                            />
                          </span>
                          <span className="tabular w-10 shrink-0 text-right text-[11px]">
                            {formatPercent(score, 0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Recent assessments</CardTitle>
              <CardDescription>Latest 20 freshness audits</CardDescription>
            </CardHeader>
            <CardContent>
              {audits.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !audits.data?.length ? (
                <p className="py-6 text-center text-xs text-muted-foreground">
                  No assessments yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {audits.data.map((audit) => (
                    <li
                      key={audit.id}
                      className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                    >
                      <FreshnessBadge value={audit.label} />
                      <span className="tabular text-xs text-muted-foreground">
                        {formatPercent(audit.confidence, 1)} · {audit.backbone ?? "—"} ·{" "}
                        {timeAgo(audit.created_at)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
