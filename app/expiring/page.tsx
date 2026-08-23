"use client";

import { AlertTriangle, CalendarClock, CheckCircle2, IndianRupee, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { API_V1, request } from "@/lib/api/client";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface Batch {
  batch_code: string;
  sku: string;
  product_name: string | null;
  expiry_date: string | null;
  days_to_expiry: number | null;
  quantity_remaining: number;
  status: "expired" | "use_first" | "use_soon" | "fine" | "undated";
  value_at_risk: number;
}

const HORIZONS = [
  { label: "This week", days: 7 },
  { label: "This month", days: 30 },
  { label: "Next 3 months", days: 90 },
] as const;

const STATUS: Record<Batch["status"], { label: string; tone: string }> = {
  expired: { label: "Already past", tone: "bg-destructive text-destructive-foreground" },
  use_first: { label: "Use first", tone: "bg-destructive/12 text-destructive" },
  use_soon: { label: "Use soon", tone: "bg-warning/15 text-warning" },
  fine: { label: "Plenty of time", tone: "bg-secondary text-muted-foreground" },
  undated: { label: "No date recorded", tone: "bg-warning/15 text-warning" },
};

/**
 * Stock running out of time, read from the inventory system.
 *
 * The other half of the expiry use case. The camera reads a date off a packet
 * one at a time; this reads every date their system already holds. A shop needs
 * both — one finds what was mis-shelved or mis-keyed, the other finds the stock
 * nobody has looked at in three weeks.
 *
 * Nothing here writes. The dates, quantities and prices belong to the inventory
 * system; what this contributes is noticing, ranking by what it costs, and
 * putting it in front of somebody.
 */
export default function ExpiringPage() {
  const [days, setDays] = useState<number>(30);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setBatches(
        await request<Batch[]>(`${API_V1}/inventory/expiring`, {
          query: { within_days: days, limit: 200 },
        }),
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not read the inventory system.");
    } finally {
      setIsLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  const expired = batches.filter((batch) => batch.status === "expired");
  const atRisk = batches.reduce((total, batch) => total + batch.value_at_risk, 0);
  const units = batches.reduce((total, batch) => total + batch.quantity_remaining, 0);

  return (
    <PageShell title="Expiring soon" subtitle="Dates the inventory system already holds">
      <section className="grid shrink-0 gap-3 sm:grid-cols-3">
        <Tile
          label="Already past its date"
          value={formatNumber(expired.length)}
          hint={expired.length ? "Pull these off the shelf" : "Nothing overdue"}
          tone={expired.length ? "critical" : "ok"}
          icon={AlertTriangle}
        />
        <Tile
          label="Units affected"
          value={formatNumber(units)}
          hint={`Across ${batches.length} consignment${batches.length === 1 ? "" : "s"}`}
          icon={CalendarClock}
        />
        <Tile
          label="Value at risk"
          value={formatCurrency(atRisk)}
          hint="What it costs if none of it sells"
          tone={atRisk > 0 ? "warning" : "ok"}
          icon={IndianRupee}
        />
      </section>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-card p-4">
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h2 className="text-label text-muted-foreground">Soonest first</h2>
          <div className="flex items-center gap-1.5">
            {HORIZONS.map((horizon) => (
              <button
                key={horizon.days}
                type="button"
                onClick={() => setDays(horizon.days)}
                aria-pressed={days === horizon.days}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  days === horizon.days
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:bg-accent",
                )}
              >
                {horizon.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
        ) : isLoading ? (
          <Loader2 className="m-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : batches.length === 0 ? (
          <div className="m-auto text-center">
            <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" aria-hidden />
            <p className="text-sm font-semibold">Nothing is close to its date</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Within the next {days} days, by their records.
            </p>
          </div>
        ) : (
          <ul className="scroll-slim min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {batches.map((batch) => {
              const status = STATUS[batch.status];
              return (
                <li
                  key={`${batch.batch_code}-${batch.sku}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">
                      {batch.product_name ?? batch.sku}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-mono">{batch.batch_code}</span>
                      {batch.expiry_date ? (
                        <>
                          {" · "}
                          {new Date(batch.expiry_date).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                          {batch.days_to_expiry !== null
                            ? batch.days_to_expiry < 0
                              ? ` · ${Math.abs(batch.days_to_expiry)} days ago`
                              : ` · in ${batch.days_to_expiry} days`
                            : ""}
                        </>
                      ) : (
                        " · no date on record"
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide",
                        status.tone,
                      )}
                    >
                      {status.label}
                    </span>
                    <span className="tabular w-20 text-right text-sm">
                      <span className="block font-semibold">
                        {formatNumber(batch.quantity_remaining)}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {formatCurrency(batch.value_at_risk)}
                      </span>
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="shrink-0 px-1 text-[11px] text-muted-foreground">
        Read from the inventory system. Nothing on this screen changes it — mark stock away in
        the system that bills for it.
      </p>
    </PageShell>
  );
}

function Tile({
  label,
  value,
  hint,
  tone = "neutral",
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "neutral" | "ok" | "warning" | "critical";
  icon: typeof AlertTriangle;
}) {
  return (
    <div className="rounded-2xl bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label text-muted-foreground">{label}</p>
        <Icon
          className={cn(
            "h-4 w-4",
            tone === "critical"
              ? "text-destructive"
              : tone === "warning"
                ? "text-warning"
                : tone === "ok"
                  ? "text-success"
                  : "text-muted-foreground",
          )}
          aria-hidden
        />
      </div>
      <p className="tabular mt-1.5 text-2xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
