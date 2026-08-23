"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Grid3x3,
  Loader2,
  PackageOpen,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { cn, formatNumber } from "@/lib/utils";

interface Shelf {
  id: number;
  code: string;
  name: string;
  location: string | null;
  rows: { id: number; allocation: { sku: string } | null }[];
}

interface PlannedBatch {
  position: number;
  batch_code: string;
  expiry_date: string | null;
  days_to_expiry: number | null;
  quantity: number;
  quantity_available: number;
  status: "expired" | "use_first" | "use_soon" | "fine" | "undated";
}

interface RowPlan {
  row_id: number;
  position: number;
  sku: string | null;
  product_name: string | null;
  capacity: number;
  last_counted: number | null;
  units_planned: number;
  left_in_stock: number;
  batches: PlannedBatch[];
  note: string | null;
}

interface ShelfPlan {
  shelf_code: string;
  shelf_name: string;
  inventory_available: boolean;
  rows: RowPlan[];
}

const STATUS: Record<PlannedBatch["status"], { label: string; tone: string }> = {
  expired: { label: "Expired", tone: "bg-destructive text-destructive-foreground" },
  use_first: { label: "Use first", tone: "bg-destructive/12 text-destructive" },
  use_soon: { label: "Use soon", tone: "bg-warning/15 text-warning" },
  fine: { label: "Plenty of time", tone: "bg-secondary text-muted-foreground" },
  undated: { label: "No date", tone: "bg-warning/15 text-warning" },
};

/**
 * How to fill a shelf, written for the person holding the stock.
 *
 * Two facts meet here and neither is useful alone. The manager's layout says
 * row 3 holds Maggi 70 g and fits fifty. The inventory system knows the shop
 * holds three consignments of it with three different dates. Put together they
 * answer the only question a staff member actually has: which box do I open
 * first, and where does it go on the shelf.
 *
 * Front is left, because that is the order stock is reached in and drawing it
 * as a table would lose the one thing worth showing. The soonest-expiring
 * consignment goes at the front — not because it is tidy, but because the
 * alternative is fresh stock sitting in front of older stock until the older
 * stock is thrown away, and nothing looks wrong until it is a bin.
 */
export default function PlanPage() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [chosen, setChosen] = useState<Shelf | null>(null);
  const [plan, setPlan] = useState<ShelfPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    request<Shelf[]>(`${API_V1}/shelves`)
      .then(setShelves)
      .catch((caught: unknown) =>
        setError(caught instanceof Error ? caught.message : "Could not load your shelves."),
      )
      .finally(() => setIsLoading(false));
  }, []);

  const open = useCallback(async (shelf: Shelf) => {
    setChosen(shelf);
    setPlan(null);
    setIsBuilding(true);
    setError(null);
    try {
      setPlan(
        await request<ShelfPlan>(`${API_V1}/shelves/${encodeURIComponent(shelf.code)}/plan`),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not build the plan.");
    } finally {
      setIsBuilding(false);
    }
  }, []);

  if (!chosen) {
    return (
      <PageShell title="Filling plan" subtitle="Pick the shelf you are filling">
        {error ? (
          <p className="shrink-0 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <p className="shrink-0 rounded-2xl bg-brand-soft p-4 text-sm">
          <strong className="font-semibold">What goes at the front.</strong>{" "}
          <span className="text-muted-foreground">
            For each row, the consignment that expires soonest goes where a customer reaches
            first. Dates come from the inventory system; the layout is the one your manager set.
          </span>
        </p>

        {isLoading ? (
          <Loader2 className="m-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : shelves.length === 0 ? (
          <div className="m-auto rounded-2xl bg-card p-10 text-center">
            <Grid3x3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="text-base font-semibold">No shelves set up yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              A manager lays out a shelf before it can be filled to a plan.
            </p>
          </div>
        ) : (
          <ul className="scroll-slim grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {shelves.map((shelf) => {
              const assigned = shelf.rows.filter((row) => row.allocation).length;
              return (
                <li key={shelf.id}>
                  <button
                    type="button"
                    onClick={() => void open(shelf)}
                    disabled={assigned === 0}
                    className={cn(
                      "w-full rounded-2xl bg-card p-4 text-left transition-colors",
                      assigned === 0 ? "cursor-not-allowed opacity-60" : "hover:bg-accent",
                    )}
                  >
                    <p className="truncate text-sm font-bold">{shelf.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {shelf.code}
                      {shelf.location ? ` · ${shelf.location}` : ""}
                    </p>
                    <p className="mt-2.5 text-xs text-muted-foreground">
                      {assigned === 0
                        ? "No products assigned yet"
                        : `${assigned} of ${shelf.rows.length} rows assigned`}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </PageShell>
    );
  }

  const expiredRows = plan?.rows.filter((row) =>
    row.batches.some((batch) => batch.status === "expired"),
  );

  return (
    <PageShell title={chosen.name} subtitle={`${chosen.code} · how to fill it`}>
      <button
        type="button"
        onClick={() => {
          setChosen(null);
          setPlan(null);
        }}
        className="-mt-1 flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Choose a different shelf
      </button>

      {error ? (
        <p className="shrink-0 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {plan && !plan.inventory_available ? (
        <p className="flex shrink-0 items-start gap-2 rounded-xl bg-warning/12 p-4 text-sm text-warning">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          The inventory system could not be read, so this shows the layout without any dates.
          Fill the rows oldest stock first until it is back.
        </p>
      ) : null}

      {expiredRows && expiredRows.length > 0 ? (
        <p className="flex shrink-0 items-start gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span>
            <strong className="font-semibold">
              {expiredRows.length} row{expiredRows.length === 1 ? " has" : "s have"} stock past its
              date.
            </strong>{" "}
            Take those off before filling — they are marked below.
          </span>
        </p>
      ) : null}

      {isBuilding ? (
        <Loader2 className="m-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : plan ? (
        <div className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {plan.rows.map((row) => (
            <RowPlanCard key={row.row_id} row={row} />
          ))}
        </div>
      ) : null}
    </PageShell>
  );
}

function RowPlanCard({ row }: { row: RowPlan }) {
  return (
    <section className="rounded-2xl bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
            {row.position}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">
              {row.product_name ?? row.sku ?? "Not assigned"}
            </p>
            <p className="tabular text-xs text-muted-foreground">
              {row.capacity > 0 ? `fits ${row.capacity}` : "no capacity set"}
              {row.units_planned > 0 ? ` · bring ${row.units_planned}` : ""}
              {row.last_counted !== null ? ` · ${row.last_counted} on it now` : ""}
            </p>
          </div>
        </div>
        {row.left_in_stock > 0 ? (
          <span className="tabular shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[10.5px] font-semibold text-muted-foreground">
            {formatNumber(row.left_in_stock)} stay in the stockroom
          </span>
        ) : null}
      </div>

      {row.note ? (
        <p className="rounded-xl bg-secondary px-3.5 py-2.5 text-xs text-muted-foreground">
          {row.note}
        </p>
      ) : (
        <>
          {/* Front on the left, because that is the order a customer reaches
              them in. A table would lose the only thing worth showing. */}
          <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground">
            <span className="flex items-center gap-1">
              <ArrowRight className="h-3 w-3" aria-hidden />
              Front — sells first
            </span>
            <span>Back</span>
          </div>

          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {row.batches.map((batch) => {
              const status = STATUS[batch.status];
              return (
                <div
                  key={batch.batch_code}
                  className={cn(
                    "flex min-w-[9.5rem] flex-1 flex-col rounded-xl p-3",
                    batch.status === "expired"
                      ? "bg-destructive/10 ring-1 ring-destructive/30"
                      : batch.position === 1
                        ? "bg-brand-soft"
                        : "bg-secondary",
                  )}
                  // Width in proportion to how much of the row it fills, so the
                  // shape of the card matches the shape of the shelf.
                  style={{ flexGrow: Math.max(1, batch.quantity) }}
                >
                  <span
                    className={cn(
                      "mb-1.5 w-fit rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      status.tone,
                    )}
                  >
                    {status.label}
                  </span>
                  <p className="tabular text-lg font-bold leading-none">{batch.quantity}</p>
                  <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                    {batch.batch_code}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {batch.expiry_date
                      ? new Date(batch.expiry_date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })
                      : "no date"}
                    {batch.days_to_expiry !== null
                      ? batch.days_to_expiry < 0
                        ? ` · ${Math.abs(batch.days_to_expiry)}d ago`
                        : ` · ${batch.days_to_expiry}d`
                      : ""}
                  </p>
                  {batch.quantity < batch.quantity_available ? (
                    <p className="mt-0.5 text-[10.5px] text-muted-foreground">
                      of {batch.quantity_available} held
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            {row.batches[0]?.status === "expired" ? (
              <>
                <AlertTriangle className="h-3 w-3 shrink-0 text-destructive" aria-hidden />
                Remove {row.batches[0].batch_code} — it is past its date.
              </>
            ) : (
              <>
                <PackageOpen className="h-3 w-3 shrink-0" aria-hidden />
                Open {row.batches[0]?.batch_code} first and put it at the front.
              </>
            )}
          </p>
        </>
      )}
    </section>
  );
}
