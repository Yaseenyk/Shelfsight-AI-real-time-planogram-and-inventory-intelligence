"use client";

import { LayoutGrid, PackageX, ArrowLeftRight } from "lucide-react";
import { useEffect, useState } from "react";

import { CapturePanel } from "@/components/dashboard/capture-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PlanogramGrid } from "@/components/dashboard/planogram-grid";
import { Verdict } from "@/components/dashboard/verdict";
import { PageShell } from "@/components/layout/page-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ComplianceBadge } from "@/components/ui/status";
import { planogram } from "@/lib/api/endpoints";
import { useAction, useApi } from "@/lib/hooks/use-api";
import { COMPLIANCE_PHRASE, layoutVerdict } from "@/lib/plain-language";
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
  const slots = audit?.slot_results ?? [];

  const counts = slots.reduce(
    (acc, slot) => {
      acc[slot.status] = (acc[slot.status] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );
  const problems = slots.length - (counts.compliant ?? 0);
  // Wrong spaces first — the whole point of the screen is to find them.
  const ordered = [...slots].sort((a, b) => {
    const rank = { missing: 0, misplaced: 1, extra: 2, compliant: 3 } as const;
    return rank[a.status] - rank[b.status];
  });

  return (
    <PageShell
      fit={false}
      title="Shelf layout"
      subtitle="Check that every product is in its right place"
    >
      {audit ? <Verdict phrase={layoutVerdict(problems, slots.length)} /> : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Empty spaces"
          value={audit ? (counts.missing ?? 0) : "—"}
          hint="Nothing on the shelf — refill these"
          icon={PackageX}
          tone={counts.missing ? "critical" : "success"}
        />
        <MetricCard
          label="Wrong product"
          value={audit ? (counts.misplaced ?? 0) + (counts.extra ?? 0) : "—"}
          hint="In the wrong space — move these"
          icon={ArrowLeftRight}
          tone={(counts.misplaced ?? 0) + (counts.extra ?? 0) > 0 ? "warning" : "neutral"}
        />
        <MetricCard
          label="Correct"
          value={audit ? (counts.compliant ?? 0) : "—"}
          hint="Nothing to do for these"
          icon={LayoutGrid}
          tone="success"
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
                <CardTitle className="text-lg">No shelf plan yet</CardTitle>
                <CardDescription className="text-sm">
                  A shelf plan says which product belongs in which space. Ask whoever set this
                  system up to add one.
                </CardDescription>
              </CardHeader>
            </Card>
          )}
        </div>

        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Which shelf?</CardTitle>
              <CardDescription className="text-sm">
                Pick the shelf plan to compare against
              </CardDescription>
            </CardHeader>
            <CardContent>
              <select
                value={selectedUid ?? ""}
                onChange={(event) => setSelectedUid(event.target.value || null)}
                className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Select shelf plan"
              >
                {(layouts.data ?? []).map((item) => (
                  <option key={item.planogram_uid} value={item.planogram_uid}>
                    {item.name}
                  </option>
                ))}
                {!layouts.data?.length ? <option value="">No shelf plans available</option> : null}
              </select>
            </CardContent>
          </Card>

          <CapturePanel
            title="Check this shelf"
            description="Take a photo of the whole shelf, straight on."
            actionLabel="Check the layout"
            isPending={check.isPending}
            error={check.error}
            onSubmit={(file) => check.execute(file)}
          />
        </div>
      </section>

      {ordered.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Space by space</CardTitle>
            <CardDescription className="text-sm">
              Problems first. Green spaces need nothing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {ordered.map((slot) => {
                const phrase = COMPLIANCE_PHRASE[slot.status];
                return (
                  <li
                    key={slot.slot_id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                  >
                    <div className="min-w-0">
                      <p className="text-base font-medium">Space {slot.slot_id}</p>
                      <p className="text-sm text-muted-foreground">
                        Should hold {slot.expected_sku}
                        {slot.observed_sku && slot.observed_sku !== slot.expected_sku
                          ? ` · found ${slot.observed_sku}`
                          : ""}
                      </p>
                      {phrase.action ? (
                        <p className="mt-1 text-sm font-medium">→ {phrase.action}</p>
                      ) : null}
                    </div>
                    <ComplianceBadge value={slot.status} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Measurements the shop floor has no use for, kept for the maintainer
          and because they are what the compliance claim rests on. */}
      {audit ? (
        <details className="rounded-xl border border-border bg-card">
          <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-muted-foreground">
            Technical detail (for whoever maintains this system)
          </summary>
          <div className="space-y-4 border-t border-border p-5 text-sm">
            <div className="grid gap-2 sm:grid-cols-2">
              <p>
                Compliance score:{" "}
                <span className="tabular font-medium">
                  {formatPercent(audit.compliance_score, 1)}
                </span>{" "}
                ({audit.compliant_slots}/{audit.total_slots} slots)
              </p>
              <p>
                Spatial alignment:{" "}
                <span className="tabular font-medium">
                  {formatPercent(audit.spatial_alignment_accuracy, 1)}
                </span>
              </p>
              <p>
                Mean IoU:{" "}
                <span className="tabular font-medium">
                  {audit.mean_iou != null ? audit.mean_iou.toFixed(3) : "—"}
                </span>
              </p>
              <p>
                Mean centre distance:{" "}
                <span className="tabular font-medium">
                  {audit.mean_center_distance != null
                    ? audit.mean_center_distance.toFixed(3)
                    : "—"}
                </span>
              </p>
              <p>
                False-positive rate:{" "}
                <span className="tabular font-medium">
                  {formatPercent(audit.false_positive_rate, 1)}
                </span>
              </p>
              <p>
                Latency:{" "}
                <span className="tabular font-medium">
                  {formatLatency(audit.detection_latency_ms)} detect,{" "}
                  {formatLatency(audit.total_latency_ms)} total
                </span>
              </p>
            </div>

            {detection?.count ? (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  {detection.model_version} · {detection.image_width}×{detection.image_height} ·{" "}
                  {detection.count} detections, {detection.resolved_skus} resolved to SKUs
                  {detection.suppressed ? ` · ${detection.suppressed} suppressed by NMS` : ""}
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(detection.class_counts).map(([name, count]) => (
                    <span key={name} className="rounded-md border border-border px-2.5 py-1 text-xs">
                      {name} <span className="tabular text-muted-foreground">×{count}</span>
                    </span>
                  ))}
                  {detection.unresolved > 0 ? (
                    <span className="rounded-md border border-warning/30 bg-warning/10 px-2.5 py-1 text-xs text-warning">
                      {detection.unresolved} unmapped → counted as EXTRA
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Slot</th>
                    <th className="py-2 pr-3 font-medium">Expected</th>
                    <th className="py-2 pr-3 font-medium">Observed</th>
                    <th className="py-2 pr-3 text-right font-medium">IoU</th>
                    <th className="py-2 text-right font-medium">Δ centre</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {slots.map((slot) => (
                    <tr key={slot.slot_id} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-medium">{slot.slot_id}</td>
                      <td className="py-2 pr-3">{slot.expected_sku}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {slot.observed_sku ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-right">{slot.iou.toFixed(3)}</td>
                      <td className="py-2 text-right">{slot.center_distance.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </details>
      ) : null}
    </PageShell>
  );
}
