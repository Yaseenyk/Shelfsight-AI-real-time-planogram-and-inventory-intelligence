"use client";

import { Crosshair, LayoutGrid, Ruler, ScanSearch } from "lucide-react";
import { useEffect, useState } from "react";

import { CapturePanel } from "@/components/dashboard/capture-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PlanogramGrid } from "@/components/dashboard/planogram-grid";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComplianceBadge } from "@/components/ui/status";
import { planogram } from "@/lib/api/endpoints";
import { useAction, useApi } from "@/lib/hooks/use-api";
import { formatLatency, formatPercent } from "@/lib/utils";

export default function PlanogramPage() {
  const layouts = useApi(planogram.layouts);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);

  // Default to the first layout once the list arrives.
  useEffect(() => {
    if (!selectedUid && layouts.data?.length) {
      setSelectedUid(layouts.data[0]!.planogram_uid);
    }
  }, [layouts.data, selectedUid]);

  const detail = useApi(
    () => (selectedUid ? planogram.layout(selectedUid) : Promise.resolve(null)),
    { enabled: Boolean(selectedUid), deps: [selectedUid] },
  );

  const check = useAction((file: File) =>
    planogram.verify(file, selectedUid ? { planogram_id: selectedUid } : undefined),
  );

  const audit = check.data;
  const detection = audit?.detection;

  return (
    <PageShell
      title="Planogram Compliance"
      subtitle="Spatial validation against the JSON layout matrix — IoU + Euclidean centre distance"
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Compliance score"
          value={formatPercent(audit?.compliance_score, 1)}
          hint={audit ? `${audit.compliant_slots}/${audit.total_slots} slots` : "Run a check"}
          icon={LayoutGrid}
          tone={audit && audit.compliance_score < 0.85 ? "warning" : "success"}
        />
        <MetricCard
          label="Spatial alignment"
          value={formatPercent(audit?.spatial_alignment_accuracy, 1)}
          hint="Correctly placed, of filled slots"
          icon={Crosshair}
        />
        <MetricCard
          label="Mean IoU"
          value={audit?.mean_iou != null ? audit.mean_iou.toFixed(3) : "—"}
          hint={
            audit?.mean_center_distance != null
              ? `centre distance ${audit.mean_center_distance.toFixed(3)}`
              : "detection ∩ slot overlap"
          }
          icon={Ruler}
        />
        <MetricCard
          label="Detections"
          value={detection ? detection.count : "—"}
          hint={
            detection
              ? `${detection.resolved_skus} mapped to SKUs · ${formatLatency(detection.inference_ms)} inference`
              : "YOLOv8 objects found in the frame"
          }
          icon={ScanSearch}
          tone={detection && detection.unresolved > 0 ? "warning" : "neutral"}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="space-y-4 lg:col-span-3">
          {detail.isLoading ? (
            <Skeleton className="aspect-[3/2] w-full" />
          ) : detail.data ? (
            <PlanogramGrid
              document={detail.data.layout_json}
              slotResults={audit?.slot_results}
              detections={audit?.detections}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>No planogram loaded</CardTitle>
                <CardDescription>
                  Seed one with <code>python -m app.db.init_db --seed</code> or POST a document to{" "}
                  <code>/api/v1/planogram/layouts</code>.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Layout</CardTitle>
              <CardDescription>Active planogram used for the comparison</CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={selectedUid ?? ""}
                onChange={(event) => setSelectedUid(event.target.value || null)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Select planogram layout"
              >
                {(layouts.data ?? []).map((item) => (
                  <option key={item.planogram_uid} value={item.planogram_uid}>
                    {item.name} (v{item.version})
                  </option>
                ))}
                {!layouts.data?.length ? <option value="">No layouts available</option> : null}
              </select>
            </CardContent>
          </Card>

          <CapturePanel
            title="Compliance check"
            description="Detects products, then scores every slot against the layout."
            actionLabel="Validate shelf"
            isPending={check.isPending}
            error={check.error}
            onSubmit={(file) => check.execute(file)}
          />
        </div>
      </section>

      {detection?.count ? (
        <Card>
          <CardHeader>
            <CardTitle>Detector output</CardTitle>
            <CardDescription>
              {detection.model_version} · {detection.image_width}×{detection.image_height} ·{" "}
              {formatLatency(audit?.detection_latency_ms)} detect,{" "}
              {formatLatency(audit?.total_latency_ms)} total
              {detection.suppressed ? ` · ${detection.suppressed} suppressed by NMS` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {Object.entries(detection.class_counts).map(([name, count]) => (
              <span
                key={name}
                className="rounded-md border border-border px-2.5 py-1 text-xs"
              >
                {name} <span className="tabular text-muted-foreground">×{count}</span>
              </span>
            ))}
            {detection.unresolved > 0 ? (
              <span className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs text-warning">
                {detection.unresolved} unmapped → counted as EXTRA
              </span>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {audit?.slot_results?.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Slot verdicts</CardTitle>
            <CardDescription>
              False-positive rate {formatPercent(audit.false_positive_rate, 1)} · latency{" "}
              {formatLatency(audit.latency_ms)}
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Slot</th>
                  <th className="py-2 pr-3 font-medium">Expected</th>
                  <th className="py-2 pr-3 font-medium">Observed</th>
                  <th className="py-2 pr-3 font-medium">Status</th>
                  <th className="py-2 pr-3 text-right font-medium">IoU</th>
                  <th className="py-2 text-right font-medium">Δ centre</th>
                </tr>
              </thead>
              <tbody className="tabular">
                {audit.slot_results.map((slot) => (
                  <tr key={slot.slot_id} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 font-medium">{slot.slot_id}</td>
                    <td className="py-2 pr-3">{slot.expected_sku}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{slot.observed_sku ?? "—"}</td>
                    <td className="py-2 pr-3">
                      <ComplianceBadge value={slot.status} />
                    </td>
                    <td className="py-2 pr-3 text-right">{slot.iou.toFixed(3)}</td>
                    <td className="py-2 text-right">{slot.center_distance.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
