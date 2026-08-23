"use client";

import { productIcon } from "@/lib/product-icons";
import { cn } from "@/lib/utils";

export interface PlannedBatch {
  position: number;
  batch_code: string;
  expiry_date: string | null;
  days_to_expiry: number | null;
  quantity: number;
  quantity_available: number;
  status: "expired" | "use_first" | "use_soon" | "fine" | "undated";
}

export interface RowPlan {
  row_id: number;
  position: number;
  sku: string | null;
  product_name: string | null;
  category: string | null;
  capacity: number;
  last_counted: number | null;
  units_planned: number;
  units_to_remove: number;
  left_in_stock: number;
  batches: PlannedBatch[];
  expired: PlannedBatch[];
  note: string | null;
}

/**
 * The rack, drawn as the object it is.
 *
 * Coloured bars were accurate and abstract. The person reading this is standing
 * in front of the real thing, so every step the drawing takes towards the
 * object is a step they do not have to take in their head — which for somebody
 * who reads slowly is the difference between a screen that works and one that
 * has to be explained.
 *
 * So it is a gondola: steel frame, slotted uprights, boards with a front lip,
 * and a price rail along each one carrying the product name. Stock stands on
 * the boards as individual packets rather than as a filled bar, because a
 * shelf holding twelve packets and a gap is what a person sees when they look
 * up, and a bar seven-tenths across is not.
 *
 * Left is the front of the shelf. Colour says what to do with each packet:
 * amber sells first, green has time. Expired stock is not drawn on the shelf at
 * all — it is coming off, and putting it there would say the opposite.
 */

/** Above this, packets get too thin to read, so one packet stands for several. */
const MAX_DRAWN = 44;

const PACKET: Record<PlannedBatch["status"], string> = {
  expired: "bg-destructive",
  use_first: "bg-warning",
  use_soon: "bg-warning/60",
  fine: "bg-brand",
  undated: "bg-muted-foreground/40",
};

const WHAT_TO_DO: Record<PlannedBatch["status"], string> = {
  expired: "Past date",
  use_first: "Sell first",
  use_soon: "Sell soon",
  fine: "Has time",
  undated: "No date",
};

export function ShelfUnit({
  rows,
  name,
  location,
}: {
  rows: RowPlan[];
  name: string;
  location?: string | null;
}) {
  return (
    <div className="rack-frame p-3">
      {/* The header board a shop screws to the top of the bay. */}
      <div className="rack-header mb-3 flex items-center justify-between gap-3 px-4 py-2.5">
        <span className="truncate text-sm font-bold uppercase tracking-wide text-white">
          {name}
        </span>
        {location ? (
          <span className="shrink-0 text-[11px] font-semibold text-white/70">{location}</span>
        ) : null}
      </div>

      <div className="flex gap-2">
        <div className="rack-upright w-2.5 shrink-0 rounded-sm" aria-hidden />

        <div className="min-w-0 flex-1 space-y-3">
          {rows.map((row) => (
            <Shelf key={row.row_id} row={row} />
          ))}
        </div>

        <div className="rack-upright w-2.5 shrink-0 rounded-sm" aria-hidden />
      </div>

      {/* The base plate the unit stands on. */}
      <div className="shelf-lip mt-2 h-2.5 rounded-sm" aria-hidden />

      <p className="mt-2.5 flex items-center justify-between px-1 text-[10px] font-bold uppercase tracking-wider text-foreground/45">
        <span>← front · customer reaches here</span>
        <span>back →</span>
      </p>
    </div>
  );
}

function Shelf({ row }: { row: RowPlan }) {
  const filled = row.batches.reduce((total, batch) => total + batch.quantity, 0);
  const gaps = Math.max(0, row.capacity - filled);
  const total = filled + gaps;

  // One packet per unit while they stay wide enough to see; past that each
  // packet stands for several, and the shelf says so rather than silently
  // drawing the wrong number of things.
  const step = total > MAX_DRAWN ? Math.ceil(total / MAX_DRAWN) : 1;

  const packets: { key: string; status: PlannedBatch["status"] | null }[] = [];
  for (const batch of row.batches) {
    const count = Math.max(1, Math.round(batch.quantity / step));
    for (let index = 0; index < count; index += 1) {
      packets.push({ key: `${batch.batch_code}-${index}`, status: batch.status });
    }
  }
  for (let index = 0; index < Math.round(gaps / step); index += 1) {
    packets.push({ key: `gap-${index}`, status: null });
  }

  return (
    <div>
      {/* The deck: what stock stands on. */}
      <div className="shelf-deck flex h-[86px] items-end gap-[2px] rounded-t-sm px-2 pb-1 pt-2">
        {row.batches.length === 0 ? (
          <p className="w-full self-center text-center text-[11px] font-medium text-foreground/45">
            {row.note ?? "Nothing to put here"}
          </p>
        ) : (
          packets.map((packet) =>
            packet.status ? (
              <span
                key={packet.key}
                className={cn("packet relative h-full min-w-[6px] flex-1", PACKET[packet.status])}
                aria-hidden
              />
            ) : (
              <span
                key={packet.key}
                className="packet-gap h-2/3 min-w-[6px] flex-1 self-end"
                aria-hidden
              />
            ),
          )
        )}
      </div>

      {/* The front lip, then the price rail clipped to it. */}
      <div className="shelf-lip h-2 rounded-b-sm" />

      <div className="shelf-rail -mt-px flex items-center gap-2 rounded-sm px-2 py-1">
        <span className="text-base leading-none" aria-hidden>
          {productIcon(row.category, row.product_name)}
        </span>
        <span className="min-w-0 flex-1 truncate text-[11px] font-bold text-foreground">
          {row.product_name ?? "Not assigned"}
        </span>

        {row.units_to_remove > 0 ? (
          <span className="shrink-0 rounded-sm bg-destructive px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-destructive-foreground">
            take off {row.units_to_remove}
          </span>
        ) : null}

        {row.units_planned > 0 ? (
          <span className="tabular shrink-0 rounded-sm bg-primary px-1.5 py-0.5 text-[9.5px] font-bold uppercase tracking-wide text-primary-foreground">
            put {row.units_planned}
          </span>
        ) : null}

        <span className="tabular hidden shrink-0 text-[10px] font-semibold text-muted-foreground sm:block">
          {row.capacity} fit
        </span>
      </div>

      {/* What the colours on this shelf mean, said only where they appear. */}
      {row.batches.length > 0 ? (
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          {row.batches.map((batch) => (
            <span
              key={batch.batch_code}
              className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground"
            >
              <span
                className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", PACKET[batch.status])}
                aria-hidden
              />
              <span className="tabular font-bold text-foreground">{batch.quantity}</span>
              {WHAT_TO_DO[batch.status].toLowerCase()}
              {batch.expiry_date ? (
                <span className="opacity-70">
                  ·{" "}
                  {new Date(batch.expiry_date).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              ) : null}
            </span>
          ))}
          {step > 1 ? (
            <span className="text-[10.5px] italic text-muted-foreground">
              (one block shown per {step})
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
