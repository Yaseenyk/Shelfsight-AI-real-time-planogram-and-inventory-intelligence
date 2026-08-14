"use client";

import { Boxes, PackageX, Percent, TriangleAlert } from "lucide-react";

import { CapturePanel } from "@/components/dashboard/capture-panel";
import { DiscrepancyAlerts } from "@/components/dashboard/discrepancy-alerts";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DiscrepancyBadge } from "@/components/ui/status";
import { inventory } from "@/lib/api/endpoints";
import { POLL_INTERVAL_MS, useAction, useApi } from "@/lib/hooks/use-api";
import { formatCurrency, formatLatency, formatNumber, formatPercent, timeAgo } from "@/lib/utils";

export default function OverviewPage() {
  const summary = useApi(inventory.summary, { pollMs: POLL_INTERVAL_MS });
  const scan = useAction((file: File) => inventory.scanImage(file));

  const data = summary.data;

  return (
    <PageShell
      title="Inventory Overview"
      subtitle="Phantom-inventory detection — physical shelf count vs. system stock"
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Phantom SKUs"
          value={formatNumber(data?.phantom_skus)}
          hint="System stock > 0, nothing detected on shelf"
          icon={PackageX}
          tone={data && data.phantom_skus > 0 ? "critical" : "success"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Count accuracy"
          value={formatPercent(data?.accuracy_rate, 1)}
          hint={`${formatNumber(data?.total_detected_stock)} detected / ${formatNumber(data?.total_system_stock)} system`}
          icon={Percent}
          tone={data && data.accuracy_rate < 0.85 ? "warning" : "success"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Value at risk"
          value={formatCurrency(data?.value_at_risk)}
          hint="Unit price × absolute discrepancy"
          icon={TriangleAlert}
          tone={data && data.value_at_risk > 0 ? "warning" : "neutral"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Catalogue"
          value={formatNumber(data?.total_products)}
          hint={`Last scan ${timeAgo(data?.last_scan_at)}`}
          icon={Boxes}
          isLoading={summary.isLoading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          <CapturePanel
            title="Live shelf capture"
            description="Runs YOLOv8 detection, then reconciles facings against SQLite stock."
            actionLabel="Scan shelf"
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
                <CardTitle>Scan {scan.data.session_uid.slice(0, 8)}</CardTitle>
                <CardDescription>
                  {scan.data.matched_skus} matched · {scan.data.phantom_count} phantom ·{" "}
                  {formatLatency(scan.data.latency_ms)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {scan.data.discrepancies.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No discrepancies — the shelf matches system stock.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="py-2 pr-3 font-medium">SKU</th>
                          <th className="py-2 pr-3 font-medium">Status</th>
                          <th className="py-2 pr-3 text-right font-medium">Detected</th>
                          <th className="py-2 pr-3 text-right font-medium">System</th>
                          <th className="py-2 text-right font-medium">Impact</th>
                        </tr>
                      </thead>
                      <tbody className="tabular">
                        {scan.data.discrepancies.map((item) => (
                          <tr key={item.sku} className="border-b border-border/60 last:border-0">
                            <td className="py-2 pr-3">
                              <span className="font-medium">{item.sku}</span>
                              <span className="block text-[11px] text-muted-foreground">
                                {item.product_name}
                              </span>
                            </td>
                            <td className="py-2 pr-3">
                              <DiscrepancyBadge value={item.discrepancy_type} />
                            </td>
                            <td className="py-2 pr-3 text-right">{item.detected_count}</td>
                            <td className="py-2 pr-3 text-right">{item.system_count}</td>
                            <td className="py-2 text-right">
                              {formatCurrency(item.estimated_value_impact)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="lg:col-span-2">
          <DiscrepancyAlerts />
        </div>
      </section>
    </PageShell>
  );
}
