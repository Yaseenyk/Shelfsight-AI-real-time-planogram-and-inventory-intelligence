"use client";

import { Boxes, IndianRupee, PackageX } from "lucide-react";

import { ActionList } from "@/components/dashboard/action-list";
import { CapturePanel } from "@/components/dashboard/capture-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { ShelfStatus } from "@/components/dashboard/shelf-status";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ui/status";
import { inventory } from "@/lib/api/endpoints";
import { POLL_INTERVAL_MS, useAction, useApi } from "@/lib/hooks/use-api";
import { DISCREPANCY_PHRASE, countSentence } from "@/lib/plain-language";
import { formatCurrency, formatNumber } from "@/lib/utils";

export default function HomePage() {
  const summary = useApi(inventory.summary, { pollMs: POLL_INTERVAL_MS });
  const scan = useAction((file: File) => inventory.scanImage(file));

  const data = summary.data;
  // One number for "is anything wrong": every SKU that is not counted correctly.
  const problems =
    (data?.phantom_skus ?? 0) + (data?.undercount_skus ?? 0) + (data?.overcount_skus ?? 0);

  return (
    <PageShell
      title="Shelf check"
      subtitle="See what is missing from your shelves"
    >
      <ShelfStatus problemCount={problems} isLoading={summary.isLoading} />

      {/* Three numbers, not five. Accuracy percentage removed: "0.0%" before the
          first scan reads as a broken system rather than an empty one. */}
      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Empty on shelf"
          value={formatNumber(data?.phantom_skus)}
          hint="Stock says yes, shelf says no"
          icon={PackageX}
          tone={data && data.phantom_skus > 0 ? "critical" : "success"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Money at risk"
          value={formatCurrency(data?.value_at_risk)}
          hint="Value of stock that is not where it should be"
          icon={IndianRupee}
          tone={data && data.value_at_risk > 0 ? "warning" : "neutral"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Products tracked"
          value={formatNumber(data?.total_products)}
          hint="Items in your shop list"
          icon={Boxes}
          isLoading={summary.isLoading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <CapturePanel
            title="Check a shelf"
            description="Take a photo of the shelf. We will tell you what is missing."
            actionLabel="Check this shelf"
            isPending={scan.isPending}
            error={scan.error}
            onSubmit={async (file) => {
              await scan.execute(file);
              await summary.refresh();
            }}
          />

          {scan.data ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What we found</CardTitle>
                <CardDescription className="text-sm">
                  {scan.data.discrepancies.length === 0
                    ? "This shelf is correct."
                    : `${scan.data.discrepancies.length} product(s) need attention.`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scan.data.discrepancies.length === 0 ? (
                  <p className="text-base text-muted-foreground">
                    Everything on this shelf matches your stock list.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {scan.data.discrepancies.map((item) => {
                      const phrase = DISCREPANCY_PHRASE[item.discrepancy_type];
                      return (
                        <li
                          key={item.sku}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                        >
                          <div className="min-w-0">
                            <p className="text-base font-medium">{item.product_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {countSentence(item.detected_count, item.system_count)}
                            </p>
                            {phrase.action ? (
                              <p className="mt-1 text-sm font-medium">→ {phrase.action}</p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-3">
                            <StatusChip phrase={phrase} />
                            <span className="tabular text-sm text-muted-foreground">
                              {formatCurrency(item.estimated_value_impact)}
                            </span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <ActionList />
        </div>
      </section>
    </PageShell>
  );
}
