"use client";

import { Apple, ThermometerSun, Trash2 } from "lucide-react";

import { CapturePanel } from "@/components/dashboard/capture-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Verdict } from "@/components/dashboard/verdict";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FreshnessBadge } from "@/components/ui/status";
import { freshness } from "@/lib/api/endpoints";
import { useAction, useApi } from "@/lib/hooks/use-api";
import { FRESHNESS_PHRASE } from "@/lib/plain-language";
import { formatNumber, timeAgo } from "@/lib/utils";

export default function FreshnessPage() {
  const summary = useApi(freshness.summary);
  const audits = useApi(() => freshness.audits({ limit: 20 }));
  const classify = useAction((file: File) => freshness.classify(file));

  const data = summary.data;
  const top = classify.data?.predictions[0];

  return (
    <PageShell
      fit={false}
      title="Fruit & vegetables"
      subtitle="Take a photo to check if something is still good to sell"
    >
      {/* The answer first. The old page led with "spoilage rate 12.5% / mean
          confidence 91.2%" and left the reader to decide what that meant. */}
      {top ? <Verdict phrase={FRESHNESS_PHRASE[top.label]} /> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Must be removed"
          value={formatNumber(data?.spoiled)}
          hint="Spoiled — take these off the shelf"
          icon={Trash2}
          tone={data && data.spoiled > 0 ? "critical" : "success"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Sell soon"
          value={formatNumber(data?.ripening)}
          hint="Getting ripe — good for a discount"
          icon={ThermometerSun}
          tone={data && data.ripening > 0 ? "warning" : "neutral"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Checked so far"
          value={formatNumber(data?.total_assessed)}
          hint="Photos looked at in total"
          icon={Apple}
          isLoading={summary.isLoading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <CapturePanel
            title="Check an item"
            description="Take a photo of the fruit or vegetable."
            actionLabel="Check this item"
            isPending={classify.isPending}
            error={classify.error}
            onSubmit={async (file) => {
              await classify.execute(file);
              await Promise.all([summary.refresh(), audits.refresh()]);
            }}
          />
        </div>

        <div className="space-y-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Items checked recently</CardTitle>
              <CardDescription className="text-sm">
                The last 20 photos, newest first
              </CardDescription>
            </CardHeader>
            <CardContent>
              {audits.isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !audits.data?.length ? (
                <p className="py-8 text-center text-base text-muted-foreground">
                  Nothing checked yet. Take a photo to start.
                </p>
              ) : (
                <ul className="space-y-3">
                  {audits.data.map((audit) => {
                    const phrase = FRESHNESS_PHRASE[audit.label];
                    return (
                      <li
                        key={audit.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                      >
                        <div className="min-w-0">
                          <FreshnessBadge value={audit.label} />
                          {phrase.action ? (
                            <p className="mt-1.5 text-sm font-medium">→ {phrase.action}</p>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {timeAgo(audit.created_at)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </PageShell>
  );
}
