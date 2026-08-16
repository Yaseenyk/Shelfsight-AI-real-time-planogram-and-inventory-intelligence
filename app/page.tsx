"use client";

import { Boxes, IndianRupee, PackageX, ScanLine } from "lucide-react";
import { useState } from "react";

import { ActionList } from "@/components/dashboard/action-list";
import { AnalysisProgress } from "@/components/dashboard/analysis-progress";
import { CapturePanel } from "@/components/dashboard/capture-panel";
import { DetectionOverlay } from "@/components/dashboard/detection-overlay";
import { MetricCard } from "@/components/dashboard/metric-card";
import { StatusPill } from "@/components/dashboard/status-pill";
import { PageShell } from "@/components/layout/page-shell";
import { StatusChip } from "@/components/ui/status";
import { inventory } from "@/lib/api/endpoints";
import { POLL_INTERVAL_MS, useAction, useApi } from "@/lib/hooks/use-api";
import { DISCREPANCY_PHRASE, countSentence } from "@/lib/plain-language";
import { formatCurrency, formatNumber } from "@/lib/utils";

/**
 * The board.
 *
 * Laid out as a fixed grid inside the viewport rather than a scrolling column:
 * the verdict, the three numbers, the capture surface and the task list are all
 * visible together, because the question "is anything wrong in my shop?" should
 * be answered without touching the mouse. The task list is the only region that
 * scrolls, and it does so inside its own panel.
 */
export default function HomePage() {
  const summary = useApi(inventory.summary, { pollMs: POLL_INTERVAL_MS });
  const scan = useAction((file: File) => inventory.scanImage(file));
  const [scannedImage, setScannedImage] = useState<string | null>(null);

  const data = summary.data;
  const problems =
    (data?.phantom_skus ?? 0) + (data?.undercount_skus ?? 0) + (data?.overcount_skus ?? 0);
  const detections = scan.data?.detections ?? [];

  return (
    <PageShell
      title="Shelf check"
      subtitle="See what is missing from your shelves"
      status={<StatusPill problemCount={problems} isLoading={summary.isLoading} />}
    >
      {/* Two rows now, not three: the verdict moved to the top bar and the
          working area took the height it was using. */}
      <div className="grid h-full min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
        <section className="grid gap-3 sm:grid-cols-3">
          <MetricCard
            label="Empty on shelf"
            value={formatNumber(data?.phantom_skus)}
            countTo={data?.phantom_skus}
            hint="Stock says yes, shelf says no"
            icon={PackageX}
            tone={data && data.phantom_skus > 0 ? "critical" : "success"}
            isLoading={summary.isLoading}
            className="animate-rise-in stagger-1"
          />
          <MetricCard
            label="Money at risk"
            value={formatCurrency(data?.value_at_risk)}
            hint="Value of stock in the wrong place"
            icon={IndianRupee}
            tone={data && data.value_at_risk > 0 ? "warning" : "neutral"}
            isLoading={summary.isLoading}
            className="animate-rise-in stagger-2"
          />
          <MetricCard
            label="Products tracked"
            value={formatNumber(data?.total_products)}
            countTo={data?.total_products}
            hint="Items in your shop list"
            icon={Boxes}
            isLoading={summary.isLoading}
            className="animate-rise-in stagger-3"
          />
        </section>

        {/* Both columns own their scrolling, so the frame never moves. */}
        <section className="grid min-h-0 gap-3 lg:grid-cols-5">
          <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:col-span-3">
            {scan.isPending ? (
              <AnalysisProgress />
            ) : scannedImage && detections.length > 0 ? (
              <DetectionOverlay
                imageUrl={scannedImage}
                detections={detections}
                className="animate-rise-in shrink-0"
              />
            ) : null}

            <CapturePanel
              title="Check a shelf"
              description="Take a photo. We will tell you what is missing."
              actionLabel="Check this shelf"
              isPending={scan.isPending}
              error={scan.error}
              compact={Boolean(scannedImage)}
              onSubmit={async (file) => {
                setScannedImage((current) => {
                  if (current) URL.revokeObjectURL(current);
                  return URL.createObjectURL(file);
                });
                await scan.execute(file);
                await summary.refresh();
              }}
            />

            {scan.data && scan.data.discrepancies.length > 0 ? (
              <div className="shrink-0 rounded-2xl bg-card p-5 animate-rise-in">
                <h2 className="mb-3 text-label text-muted-foreground">What we found</h2>
                <ul className="space-y-2">
                  {scan.data.discrepancies.map((item, index) => {
                    const phrase = DISCREPANCY_PHRASE[item.discrepancy_type];
                    return (
                      <li
                        key={item.sku}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-3 animate-rise-in"
                        style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{item.product_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {countSentence(item.detected_count, item.system_count)}
                          </p>
                        </div>
                        <StatusChip phrase={phrase} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {!scan.data && !scan.isPending ? <WhatThisDoes /> : null}
          </div>

          <div className="min-h-0 lg:col-span-2">
            <ActionList />
          </div>
        </section>
      </div>
    </PageShell>
  );
}

/**
 * The commercial difference, where a new user will read it: one photograph
 * drives four checks, and it all happens on this machine for nothing.
 */
function WhatThisDoes() {
  const checks = [
    "Which products have run out",
    "Whether things are in the right place",
    "If fruit and vegetables are still good",
    "What the expiry dates say",
  ];

  return (
    <div className="shrink-0 rounded-2xl bg-card p-5 animate-rise-in stagger-4">
      <h2 className="mb-3 flex items-center gap-2 text-label">
        <ScanLine className="h-3.5 w-3.5" aria-hidden />
        One photo checks four things
      </h2>
      <ul className="mb-3 grid gap-2 sm:grid-cols-2">
        {checks.map((check) => (
          <li key={check} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
            {check}
          </li>
        ))}
      </ul>
      <p className="rounded-xl bg-brand-soft px-3.5 py-2.5 text-xs">
        <strong className="font-semibold text-foreground">All of it on this computer.</strong>{" "}
        <span className="text-muted-foreground">
          Nothing uploaded, no internet needed, nothing to pay each month.
        </span>
      </p>
    </div>
  );
}
