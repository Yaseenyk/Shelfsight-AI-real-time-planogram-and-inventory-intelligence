"use client";

import { ArrowDown, Check } from "lucide-react";

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
  /** Expired stock to pull off. Never part of what to carry out. */
  units_to_remove: number;
  left_in_stock: number;
  batches: PlannedBatch[];
  expired: PlannedBatch[];
  note: string | null;
}

/**
 * A rack, drawn the way it stands.
 *
 * The list this replaced was a table of numbers: shelf code, row count, unit
 * count, days. All correct, and unusable by the person it is for — somebody
 * holding a crate, who needs to know which shelf and which end, not to read a
 * spreadsheet and reconstruct a picture from it.
 *
 * So this draws the thing. Rows stack top to bottom exactly as they do on the
 * rack. Each row is a strip divided into the consignments that go on it, left
 * to right, because left is the front and the front is what a customer reaches
 * first. The width of each block is how much of the row it fills, so the
 * drawing has the shape of the shelf and a full row looks full.
 *
 * Three signals carry the meaning, and none of them is a sentence:
 *
 *   colour   red means take it off, amber means put it in front, grey is fine
 *   size     how much of the row that stock fills
 *   symbol   what the product is, recognised before the name is read
 *
 * The numbers are still there for anyone who wants them. They are just no
 * longer the only way to understand the screen.
 */

const TONE: Record<
  PlannedBatch["status"],
  { block: string; chip: string; label: string }
> = {
  expired: {
    block: "bg-destructive text-destructive-foreground",
    chip: "bg-destructive text-destructive-foreground",
    label: "Past date",
  },
  use_first: {
    block: "bg-warning text-warning-foreground",
    chip: "bg-warning text-warning-foreground",
    label: "Sell first",
  },
  use_soon: {
    block: "bg-warning/35 text-foreground",
    chip: "bg-warning/25 text-warning",
    label: "Soon",
  },
  fine: { block: "bg-brand text-brand-foreground", chip: "bg-secondary", label: "Fine" },
  undated: { block: "bg-secondary text-foreground", chip: "bg-secondary", label: "No date" },
};

export function RackDiagram({ rows }: { rows: RowPlan[] }) {
  return (
    <div className="rounded-2xl bg-card p-4">
      {/* Which end is which, said once at the top and drawn with the rack. */}
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 rounded-full bg-brand px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-brand-foreground">
          <ArrowDown className="h-3 w-3 -rotate-90" aria-hidden />
          Front — customer picks from here
        </span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          Back
        </span>
      </div>

      <div className="space-y-1.5">
        {rows.map((row) => (
          <RackRow key={row.row_id} row={row} />
        ))}
      </div>
    </div>
  );
}

function RackRow({ row }: { row: RowPlan }) {
  const icon = productIcon(row.category, row.product_name);
  const empty = row.batches.length === 0;
  const removing = row.expired ?? [];
  // Blocks are sized against the row's capacity, not against each other, so a
  // half-full row is drawn half full instead of stretching to fill the width.
  const filled = row.batches.reduce((total, batch) => total + batch.quantity, 0);
  const spare = Math.max(0, row.capacity - filled);

  return (
    <div className="rounded-xl bg-secondary p-2.5">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="tabular flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
          {row.position}
        </span>
        <span className="text-2xl leading-none" aria-hidden>
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold">
            {row.product_name ?? "Nothing on this row"}
          </span>
          <span className="tabular block text-[11px] text-muted-foreground">
            {row.capacity > 0 ? `${row.capacity} fit on this shelf` : "not set up yet"}
          </span>
        </span>
        {row.units_planned > 0 ? (
          <span className="tabular shrink-0 rounded-lg bg-card px-2.5 py-1.5 text-center">
            <span className="block text-lg font-bold leading-none">{row.units_planned}</span>
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              to bring
            </span>
          </span>
        ) : null}
      </div>

      {/* Above the shelf, not on it. Expired stock is coming off, and drawing
          it among the blocks somebody is about to put on would say the
          opposite of what it means. */}
      {removing.length > 0 ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-destructive px-3 py-2 text-destructive-foreground">
          <span className="text-lg leading-none" aria-hidden>
            &#9940;
          </span>
          <span className="tabular text-lg font-bold leading-none">{row.units_to_remove}</span>
          <span className="text-xs font-bold uppercase tracking-wide">
            take off &mdash; past the date
          </span>
          <span className="ml-auto truncate font-mono text-[10.5px] opacity-80">
            {removing.map((batch) => batch.batch_code).join(", ")}
          </span>
        </div>
      ) : null}

      {empty ? (
        <p className="rounded-lg bg-card px-3 py-2 text-xs text-muted-foreground">
          {row.note ?? "Nothing to put here."}
        </p>
      ) : (
        <>
          <div className="flex h-14 gap-1 overflow-hidden rounded-lg">
            {row.batches.map((batch) => (
              <div
                key={batch.batch_code}
                // Grow in proportion to how much of the row this stock fills.
                style={{ flexGrow: batch.quantity }}
                className={cn(
                  "flex min-w-[3.5rem] flex-col items-center justify-center rounded-md px-1",
                  TONE[batch.status].block,
                )}
                title={`${batch.batch_code} · ${batch.quantity} units · ${TONE[batch.status].label}`}
              >
                <span className="tabular text-xl font-bold leading-none">{batch.quantity}</span>
                <span className="mt-0.5 text-[9.5px] font-bold uppercase leading-none tracking-wide opacity-90">
                  {TONE[batch.status].label}
                </span>
              </div>
            ))}
            {spare > 0 ? (
              // The gap left over, so a row that cannot be filled looks unfilled
              // rather than looking complete. Labelled, because a bare number
              // inside the shelf reads as more stock rather than as empty space.
              <div
                style={{ flexGrow: spare }}
                className="flex min-w-[3rem] flex-col items-center justify-center rounded-md border-2 border-dashed border-border"
              >
                <span className="tabular text-sm font-bold text-muted-foreground">{spare}</span>
                <span className="text-[9.5px] font-bold uppercase leading-none tracking-wide text-muted-foreground">
                  gap
                </span>
              </div>
            ) : null}
          </div>

          <Instruction row={row} />
        </>
      )}
    </div>
  );
}

/** One sentence, in the imperative, about the block on the far left. */
function Instruction({ row }: { row: RowPlan }) {
  const front = row.batches[0];
  if (!front) return null;

  // Expired stock never reaches this list — it is drawn above the shelf as
  // something to take off — so the instruction here is always the same shape.
  return (
    <p className="mt-1.5 flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1.5 text-xs font-semibold">
      <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Put these {front.quantity} at the front
      {front.expiry_date ? (
        <span className="font-normal text-muted-foreground">
          (sell by{" "}
          {new Date(front.expiry_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
          )
        </span>
      ) : null}
    </p>
  );
}
