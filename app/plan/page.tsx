"use client";

import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Loader2,
  MapPin,
  PackageOpen,
  Sparkles,
} from "lucide-react";
import { useCallback, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { cn, formatNumber } from "@/lib/utils";

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

interface ShelfSummary {
  shelf_code: string;
  shelf_name: string;
  location: string | null;
  rows_to_fill: number;
  units_to_bring: number;
  expired_rows: number;
  soonest_expiry_days: number | null;
}

interface StorePlan {
  inventory_available: boolean;
  shelves_planned: number;
  rows_to_fill: number;
  units_to_bring: number;
  expired_rows: number;
  shelves: ShelfSummary[];
}

const STATUS: Record<PlannedBatch["status"], { label: string; tone: string }> = {
  expired: { label: "Expired", tone: "bg-destructive text-destructive-foreground" },
  use_first: { label: "Use first", tone: "bg-destructive/12 text-destructive" },
  use_soon: { label: "Use soon", tone: "bg-warning/15 text-warning" },
  fine: { label: "Plenty of time", tone: "bg-secondary text-muted-foreground" },
  undated: { label: "No date", tone: "bg-warning/15 text-warning" },
};

/**
 * The filling plan: press one button, get told what to put where.
 *
 * Two facts meet here and neither is useful alone. The manager's layout says
 * which product each row is sold to and how many fit; the inventory system
 * knows which consignments exist and when each expires. Together they answer
 * the only question the person holding the stock has — which box do I open, and
 * where does it go.
 *
 * The store list is **ordered to be walked**, not sorted by name. Bays holding
 * stock past its date come first because that stock is actively costing money;
 * then whichever bay has the soonest date on it. Two hundred bays in
 * alphabetical order is a list nobody can start.
 */
export default function PlanPage() {
  const [store, setStore] = useState<StorePlan | null>(null);
  const [shelf, setShelf] = useState<ShelfPlan | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = useCallback(async () => {
    setIsPlanning(true);
    setError(null);
    try {
      setStore(await request<StorePlan>(`${API_V1}/shelves/plan/store`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not build the plan.");
    } finally {
      setIsPlanning(false);
    }
  }, []);

  const openShelf = useCallback(async (code: string) => {
    setIsOpening(code);
    setError(null);
    try {
      setShelf(
        await request<ShelfPlan>(`${API_V1}/shelves/${encodeURIComponent(code)}/plan`),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open that bay.");
    } finally {
      setIsOpening(null);
    }
  }, []);

  /* ------------------------------------------------------ one bay, in detail */
  if (shelf) {
    return (
      <PageShell title={shelf.shelf_name} subtitle={`${shelf.shelf_code} · how to fill it`}>
        <button
          type="button"
          onClick={() => setShelf(null)}
          className="-mt-1 flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to the plan
        </button>

        {shelf.rows.some((row) => row.batches.some((b) => b.status === "expired")) ? (
          <p className="flex shrink-0 items-start gap-2 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>
              <strong className="font-semibold">Take the expired stock off first.</strong> It is
              marked below.
            </span>
          </p>
        ) : null}

        <div className="scroll-slim min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
          {shelf.rows.map((row) => (
            <RowPlanCard key={row.row_id} row={row} />
          ))}
        </div>
      </PageShell>
    );
  }

  /* --------------------------------------------------------- the whole store */
  return (
    <PageShell title="Filling plan" subtitle="What to put where, across the shop">
      {error ? (
        <p className="shrink-0 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!store ? (
        <div className="m-auto max-w-lg text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft">
            <PackageOpen className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="text-lg font-bold">Work out what goes where</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Every bay your manager has laid out, checked against the expiry dates in the
            inventory system. You get the order to walk them in and, for each row, which
            consignment goes at the front.
          </p>
          <Button className="mt-5" size="lg" onClick={() => void plan()} disabled={isPlanning}>
            {isPlanning ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden />
            )}
            {isPlanning ? "Working it out…" : "Build my filling plan"}
          </Button>
        </div>
      ) : (
        <>
          <section className="grid shrink-0 gap-3 sm:grid-cols-4">
            <Tile label="Bays to visit" value={formatNumber(store.shelves_planned)} />
            <Tile label="Rows to fill" value={formatNumber(store.rows_to_fill)} />
            <Tile label="Units to bring" value={formatNumber(store.units_to_bring)} />
            <Tile
              label="Rows past date"
              value={formatNumber(store.expired_rows)}
              tone={store.expired_rows > 0 ? "critical" : "ok"}
            />
          </section>

          {!store.inventory_available ? (
            <p className="flex shrink-0 items-start gap-2 rounded-xl bg-warning/12 p-4 text-sm text-warning">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              The inventory system could not be read, so this is the layout without any dates.
              Fill each row oldest stock first until it is back.
            </p>
          ) : null}

          <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-card p-4">
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <h2 className="text-label text-muted-foreground">
                In this order — most urgent first
              </h2>
              <Button size="sm" variant="outline" onClick={() => void plan()} disabled={isPlanning}>
                {isPlanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                Work it out again
              </Button>
            </div>

            {store.shelves.length === 0 ? (
              <div className="m-auto text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" aria-hidden />
                <p className="text-sm font-semibold">Nothing to fill</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  No bay has stock waiting for it.
                </p>
              </div>
            ) : (
              <ol className="scroll-slim min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {store.shelves.map((summary, index) => (
                  <li key={summary.shelf_code}>
                    <button
                      type="button"
                      onClick={() => void openShelf(summary.shelf_code)}
                      className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-3 text-left transition-colors hover:bg-accent"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-card text-xs font-bold text-muted-foreground">
                          {index + 1}
                        </span>
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">
                              {summary.shelf_name}
                            </span>
                            {summary.expired_rows > 0 ? (
                              <span className="rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground">
                                {summary.expired_rows} past date
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                            {summary.location ?? summary.shelf_code}
                          </span>
                        </span>
                      </div>

                      <div className="tabular flex shrink-0 items-center gap-4 text-right text-xs">
                        <span className="w-16">
                          <span className="block font-semibold">{summary.rows_to_fill}</span>
                          <span className="block text-muted-foreground">rows</span>
                        </span>
                        <span className="w-16">
                          <span className="block font-semibold">{summary.units_to_bring}</span>
                          <span className="block text-muted-foreground">units</span>
                        </span>
                        <span className="w-20">
                          <span
                            className={cn(
                              "block font-semibold",
                              summary.soonest_expiry_days !== null &&
                                summary.soonest_expiry_days < 0 &&
                                "text-destructive",
                            )}
                          >
                            {summary.soonest_expiry_days === null
                              ? "—"
                              : summary.soonest_expiry_days < 0
                                ? `${Math.abs(summary.soonest_expiry_days)}d ago`
                                : `${summary.soonest_expiry_days}d`}
                          </span>
                          <span className="block text-muted-foreground">soonest</span>
                        </span>
                        {isOpening === summary.shelf_code ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        ) : (
                          <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}

function Tile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "ok" | "critical";
}) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <p className="text-label text-muted-foreground">{label}</p>
      <p
        className={cn(
          "tabular mt-1 text-2xl font-bold",
          tone === "critical" ? "text-destructive" : undefined,
        )}
      >
        {value}
      </p>
    </div>
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
