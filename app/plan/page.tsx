"use client";

import { AlertTriangle, ArrowLeft, CheckCircle2, Loader2, PackageOpen } from "lucide-react";
import { useCallback, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { ShelfUnit, type RowPlan } from "@/components/plan/shelf-unit";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { productIcon, sectionIcon } from "@/lib/product-icons";
import { cn, formatNumber } from "@/lib/utils";

interface ShelfPlan {
  shelf_code: string;
  shelf_name: string;
  location: string | null;
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

/** How many racks to show before asking. Nobody walks 200 in one go. */
const FIRST_BATCH = 12;

/**
 * The filling plan, drawn rather than tabulated.
 *
 * The version this replaces was a table: shelf code, row count, unit count,
 * days remaining. Every number correct, and unusable by the person it is for.
 * Somebody holding a crate needs to know which rack, which shelf, and which
 * end — not to read eight columns and build a picture from them.
 *
 * So the list is a queue of jobs with a symbol, a place and one big number, and
 * opening one draws the rack itself. The order is the order to walk: whatever
 * is past its date first, because that is the only thing on the list actively
 * costing money.
 */
export default function PlanPage() {
  const [store, setStore] = useState<StorePlan | null>(null);
  const [shelf, setShelf] = useState<ShelfPlan | null>(null);
  const [shown, setShown] = useState(FIRST_BATCH);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isOpening, setIsOpening] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = useCallback(async () => {
    setIsPlanning(true);
    setError(null);
    try {
      setStore(await request<StorePlan>(`${API_V1}/shelves/plan/store`));
      setShown(FIRST_BATCH);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not work out the plan.");
    } finally {
      setIsPlanning(false);
    }
  }, []);

  const openRack = useCallback(async (code: string) => {
    setIsOpening(code);
    setError(null);
    try {
      setShelf(await request<ShelfPlan>(`${API_V1}/shelves/${encodeURIComponent(code)}/plan`));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not open that rack.");
    } finally {
      setIsOpening(null);
    }
  }, []);

  /* ------------------------------------------------------ one rack, drawn -- */
  if (shelf) {
    const toRemove = shelf.rows.reduce((total, row) => total + row.units_to_remove, 0);
    const toBring = shelf.rows.reduce((total, row) => total + row.units_planned, 0);

    return (
      <PageShell title={shelf.shelf_name} subtitle={`Rack ${shelf.shelf_code.replace(/^R/, "")}`}>
        <button
          type="button"
          onClick={() => setShelf(null)}
          className="-mt-1 flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Back to the list
        </button>

        <div className="flex shrink-0 flex-wrap gap-2">
          <Fact icon="📦" value={formatNumber(toBring)} label="things to carry" />
          <Fact icon="🗄️" value={`${shelf.rows.length}`} label="shelves on this rack" />
          {toRemove > 0 ? (
            <Fact
              icon="⛔"
              value={formatNumber(toRemove)}
              label="take off first"
              tone="critical"
            />
          ) : (
            <Fact icon="✅" value="0" label="nothing past date" tone="ok" />
          )}
        </div>

        {toRemove > 0 ? (
          <p className="flex shrink-0 items-center gap-2 rounded-xl bg-destructive/10 p-3.5 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
            Take the {toRemove} red ones off first. Do not put them back.
          </p>
        ) : null}

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto pr-1">
          <ShelfUnit
            rows={shelf.rows}
            name={shelf.shelf_name}
            location={shelf.location}
          />
        </div>
      </PageShell>
    );
  }

  /* ---------------------------------------------------------- the queue --- */
  return (
    <PageShell title="Filling plan" subtitle="Which rack to fill, and what goes where">
      {error ? (
        <p className="shrink-0 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {!store ? (
        <div className="m-auto max-w-md text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-soft text-3xl">
            🗄️
          </div>
          <h2 className="text-lg font-bold">Tell me what to fill</h2>
          <p className="mx-auto mt-2 text-sm text-muted-foreground">
            I will check every rack against the dates in the stock system, and show you which one
            to do first and exactly what goes on each shelf.
          </p>
          <Button className="mt-5" size="lg" onClick={() => void plan()} disabled={isPlanning}>
            {isPlanning ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <PackageOpen className="h-4 w-4" aria-hidden />
            )}
            {isPlanning ? "Checking every rack…" : "Show me what to fill"}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Fact icon="🗄️" value={formatNumber(store.shelves_planned)} label="racks to do" />
            <Fact icon="📦" value={formatNumber(store.units_to_bring)} label="things to carry" />
            {store.expired_rows > 0 ? (
              <Fact
                icon="⛔"
                value={formatNumber(store.expired_rows)}
                label="shelves past date"
                tone="critical"
              />
            ) : (
              <Fact icon="✅" value="0" label="nothing past date" tone="ok" />
            )}
          </div>

          {!store.inventory_available ? (
            <p className="flex shrink-0 items-center gap-2 rounded-xl bg-warning/12 p-3.5 text-sm text-warning">
              <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
              The stock system is not answering, so there are no dates. Fill each shelf with the
              oldest stock first.
            </p>
          ) : null}

          <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-card p-4">
            <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
              <h2 className="text-label text-muted-foreground">Do them in this order</h2>
              <Button size="sm" variant="outline" onClick={() => void plan()} disabled={isPlanning}>
                {isPlanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
                Check again
              </Button>
            </div>

            {store.shelves.length === 0 ? (
              <div className="m-auto text-center">
                <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-success" aria-hidden />
                <p className="text-base font-bold">Nothing to fill right now</p>
              </div>
            ) : (
              <ol className="scroll-slim min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {store.shelves.slice(0, shown).map((summary, index) => (
                  <li key={summary.shelf_code}>
                    <RackCard
                      order={index + 1}
                      summary={summary}
                      busy={isOpening === summary.shelf_code}
                      onOpen={() => void openRack(summary.shelf_code)}
                    />
                  </li>
                ))}

                {shown < store.shelves.length ? (
                  <li className="pt-1">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShown((current) => current + FIRST_BATCH)}
                    >
                      Show {Math.min(FIRST_BATCH, store.shelves.length - shown)} more racks
                    </Button>
                  </li>
                ) : null}
              </ol>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}

/** One rack in the queue: a symbol, where it is, and how much to carry. */
function RackCard({
  order,
  summary,
  busy,
  onOpen,
}: {
  order: number;
  summary: ShelfSummary;
  busy: boolean;
  onOpen: () => void;
}) {
  // The rack is named "<category> rack <n>", so the category is the first part.
  const category = summary.shelf_name.replace(/ rack \d+$/i, "");
  const urgent = summary.expired_rows > 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors",
        urgent ? "bg-destructive/10 hover:bg-destructive/15" : "bg-secondary hover:bg-accent",
      )}
    >
      <span
        className={cn(
          "tabular flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold",
          urgent ? "bg-destructive text-destructive-foreground" : "bg-card text-muted-foreground",
        )}
      >
        {order}
      </span>

      <span className="text-3xl leading-none" aria-hidden>
        {productIcon(category, summary.shelf_name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold">{summary.shelf_name}</span>
        <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
          <span aria-hidden>{sectionIcon(summary.location)}</span>
          {summary.location ?? "in the shop"}
        </span>
        {urgent ? (
          <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-destructive-foreground">
            ⛔ {summary.expired_rows} shelf{summary.expired_rows === 1 ? "" : "s"} past date
          </span>
        ) : null}
      </span>

      <span className="tabular shrink-0 rounded-lg bg-card px-3 py-2 text-center">
        <span className="block text-xl font-bold leading-none">{summary.units_to_bring}</span>
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
          to carry
        </span>
      </span>

      {busy ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-muted-foreground" aria-hidden />
      ) : null}
    </button>
  );
}

/** A number with a picture on it. Reads before it is read. */
function Fact({
  icon,
  value,
  label,
  tone = "neutral",
}: {
  icon: string;
  value: string;
  label: string;
  tone?: "neutral" | "ok" | "critical";
}) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center gap-3 rounded-2xl px-4 py-3",
        tone === "critical" ? "bg-destructive/10" : "bg-card",
      )}
    >
      <span className="text-2xl leading-none" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0">
        <span
          className={cn(
            "tabular block text-2xl font-bold leading-none",
            tone === "critical" ? "text-destructive" : undefined,
          )}
        >
          {value}
        </span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground">{label}</span>
      </span>
    </div>
  );
}
