"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  ComplianceStatus,
  Detection,
  PlanogramDocument,
  SlotResult,
} from "@/lib/types/api";
import { cn } from "@/lib/utils";

const STATUS_FILL: Record<ComplianceStatus, string> = {
  compliant: "border-success/50 bg-success/15 text-success",
  misplaced: "border-warning/50 bg-warning/15 text-warning",
  missing: "border-destructive/50 bg-destructive/15 text-destructive",
  extra: "border-primary/50 bg-primary/15 text-primary",
};

/**
 * Renders the planogram as an absolutely-positioned overlay on a 3:2 shelf
 * canvas. Slot geometry is already normalised (0..1), so the layout is just
 * percentage arithmetic — no scaling logic, no camera assumptions.
 */
export function PlanogramGrid({
  document: planogram,
  slotResults,
  detections,
  backgroundUrl,
}: {
  document: PlanogramDocument;
  slotResults?: SlotResult[];
  /** Raw YOLOv8 boxes, drawn beneath the slot rectangles (Phase 1). */
  detections?: Detection[];
  backgroundUrl?: string | null;
}) {
  const verdicts = new Map((slotResults ?? []).map((slot) => [slot.slot_id, slot]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>{planogram.name}</CardTitle>
        <CardDescription>
          {planogram.planogram_id} · v{planogram.version} · {planogram.shelves.length} shelves ·{" "}
          {planogram.shelves.reduce(
            (total, shelf) => total + shelf.rows.reduce((n, row) => n + row.slots.length, 0),
            0,
          )}{" "}
          slots
        </CardDescription>
      </CardHeader>

      <CardContent>
        <div className="relative aspect-[3/2] w-full overflow-hidden rounded-lg border border-border bg-muted/40">
          {backgroundUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={backgroundUrl}
              alt="Analysed shelf frame"
              className="absolute inset-0 h-full w-full object-fill opacity-40"
            />
          ) : null}

          {/* Detector output sits under the slot grid so the planogram stays legible. */}
          {(detections ?? []).map((detection, index) => (
            <div
              key={`det-${index}`}
              title={`${detection.class_name}${
                detection.sku ? ` → ${detection.sku}` : " (unmapped)"
              } · ${(detection.confidence * 100).toFixed(0)}%`}
              className="pointer-events-auto absolute rounded-sm border border-dashed border-foreground/40 bg-foreground/5"
              style={{
                left: `${detection.bbox.x1 * 100}%`,
                top: `${detection.bbox.y1 * 100}%`,
                width: `${(detection.bbox.x2 - detection.bbox.x1) * 100}%`,
                height: `${(detection.bbox.y2 - detection.bbox.y1) * 100}%`,
              }}
            />
          ))}

          {planogram.shelves.map((shelf) => (
            <div
              key={shelf.shelf_id}
              className="absolute inset-x-0 border-y border-dashed border-border/70"
              style={{
                top: `${shelf.y_range[0] * 100}%`,
                height: `${(shelf.y_range[1] - shelf.y_range[0]) * 100}%`,
              }}
            >
              <span className="absolute -top-0.5 left-1 text-[10px] font-medium text-muted-foreground">
                {shelf.shelf_id}
              </span>
            </div>
          ))}

          {planogram.shelves.flatMap((shelf) =>
            shelf.rows.flatMap((row) =>
              row.slots.map((slot) => {
                const verdict = verdicts.get(slot.slot_id);
                const status = verdict?.status;
                return (
                  <div
                    key={slot.slot_id}
                    title={
                      verdict
                        ? `${slot.slot_id} · ${slot.sku} · ${status} · IoU ${verdict.iou.toFixed(2)}`
                        : `${slot.slot_id} · ${slot.sku} · ${slot.expected_facings} facings`
                    }
                    className={cn(
                      "absolute flex flex-col items-center justify-center rounded-md border-2 p-1 text-center transition-colors",
                      status
                        ? STATUS_FILL[status]
                        : "border-border bg-card/70 text-muted-foreground",
                    )}
                    style={{
                      left: `${slot.bbox.x1 * 100}%`,
                      top: `${slot.bbox.y1 * 100}%`,
                      width: `${(slot.bbox.x2 - slot.bbox.x1) * 100}%`,
                      height: `${(slot.bbox.y2 - slot.bbox.y1) * 100}%`,
                    }}
                  >
                    <span className="truncate text-[10px] font-semibold leading-tight">
                      {slot.sku}
                    </span>
                    <span className="text-[10px] opacity-80">
                      {status ?? `×${slot.expected_facings}`}
                    </span>
                  </div>
                );
              }),
            ),
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          {(["compliant", "misplaced", "missing", "extra"] as ComplianceStatus[]).map((status) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={cn("h-2.5 w-2.5 rounded-sm border-2", STATUS_FILL[status])} />
              {status}
            </span>
          ))}
          {detections?.length ? (
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm border border-dashed border-foreground/40 bg-foreground/5" />
              detection ({detections.length})
            </span>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
