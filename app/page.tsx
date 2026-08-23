"use client";

import {
  ArrowLeft,
  CheckCircle2,
  Grid3x3,
  Loader2,
  ScanLine,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { AnalysisProgress } from "@/components/dashboard/analysis-progress";
import { CapturePanel } from "@/components/dashboard/capture-panel";
import { DetectionOverlay } from "@/components/dashboard/detection-overlay";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { ApiError, API_BASE_URL, API_V1, getAuthToken, request } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface Allocation {
  product_id: number;
  sku: string;
  product_name: string;
  capacity: number;
  buffer_threshold: number;
}

interface Row {
  id: number;
  position: number;
  on_shelf: number;
  needs_restock: boolean;
  allocation: Allocation | null;
}

interface Shelf {
  id: number;
  code: string;
  name: string;
  location: string | null;
  rows: Row[];
}

interface RowFinding {
  row_id: number;
  position: number;
  sku: string | null;
  product_name: string | null;
  capacity: number;
  buffer_threshold: number;
  system_on_shelf: number;
  detected_facings: number;
  gap: number;
  verdict: "ok" | "low" | "empty" | "overfull" | "unexpected" | "unallocated";
  mean_confidence: number | null;
}

interface ShelfScan {
  session_uid: string;
  shelf_code: string;
  shelf_name: string;
  row_count: number;
  rows: RowFinding[];
  total_detected: number;
  unassigned: number;
  detections: {
    class_name: string;
    confidence: number;
    sku: string | null;
    bbox: { x1: number; y1: number; x2: number; y2: number };
  }[];
  image_width: number;
  image_height: number;
  latency_ms: number;
}

/**
 * Check one shelf.
 *
 * The shelf is chosen before the photo is taken, and that order is the whole
 * point. The detector finds where products are but has no opinion about what
 * any of them is -- so identity has to come from somewhere, and it comes from
 * the plan the manager already wrote: row 3 is Maggi, therefore a box in row
 * 3's band is Maggi. Choosing the shelf first narrows the candidates from the
 * whole catalogue to the handful on this one bay, which is the difference
 * between an answer and a guess.
 *
 * It is worth being clear about what this proves. It counts how many facings
 * are in each row and compares that with what the plan and the stock ledger
 * say. It does not verify that the product in row 3 *is* Maggi -- nothing here
 * can, and claiming otherwise would be the easy lie.
 */
export default function ShelfCheckPage() {
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [chosen, setChosen] = useState<Shelf | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [scan, setScan] = useState<ShelfScan | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<ApiError | null>(null);

  const load = useCallback(async () => {
    try {
      setShelves(await request<Shelf[]>(`${API_V1}/shelves`));
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : "Could not load your shelves.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Revoke the object URL when it is replaced or the page goes away, or every
  // scan leaks a copy of the frame for as long as the tab is open.
  useEffect(() => () => {
    if (photo) URL.revokeObjectURL(photo);
  }, [photo]);

  const runScan = async (file: File) => {
    if (!chosen) return;
    setIsScanning(true);
    setScanError(null);
    setScan(null);
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });

    const form = new FormData();
    form.append("file", file);
    try {
      // Not via the shared endpoint helpers: this one is addressed by shelf
      // code, which is the identifier the person standing at the shelf has.
      const response = await fetch(
        `${API_BASE_URL}${API_V1}/shelves/${encodeURIComponent(chosen.code)}/scan`,
        {
          method: "POST",
          body: form,
          headers: getAuthToken() ? { Authorization: `Bearer ${getAuthToken()}` } : {},
        },
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new ApiError(
          typeof payload?.detail === "string" ? payload.detail : `${response.status}`,
          response.status,
        );
      }
      setScan((await response.json()) as ShelfScan);
      await load();
    } catch (caught) {
      setScanError(
        caught instanceof ApiError
          ? caught
          : new ApiError(caught instanceof Error ? caught.message : "The scan failed.", 0),
      );
    } finally {
      setIsScanning(false);
    }
  };

  const reset = () => {
    setChosen(null);
    setScan(null);
    setScanError(null);
    setPhoto((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  if (!chosen) {
    return (
      <PageShell title="Shelf check" subtitle="Pick the shelf you are standing at">
        {loadError ? (
          <p className="shrink-0 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
            {loadError}
          </p>
        ) : null}
        <ShelfChooser shelves={shelves} isLoading={isLoading} onPick={setChosen} />
      </PageShell>
    );
  }

  const attention = scan?.rows.filter((row) =>
    ["empty", "low", "unexpected"].includes(row.verdict),
  );

  return (
    <PageShell title={chosen.name} subtitle={`${chosen.code} · ${chosen.rows.length} rows`}>
      <button
        type="button"
        onClick={reset}
        className="-mt-1 flex shrink-0 items-center gap-1.5 self-start text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
        Choose a different shelf
      </button>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
        <div className="scroll-slim min-h-0 space-y-4 overflow-y-auto pr-1 lg:col-span-3">
          {isScanning ? <AnalysisProgress /> : null}

          {photo && scan && scan.detections.length > 0 ? (
            <DetectionOverlay
              imageUrl={photo}
              detections={scan.detections as never}
              className="animate-rise-in"
            />
          ) : null}

          <CapturePanel
            title={scan ? "Check it again" : "Photograph this shelf"}
            description={
              scan
                ? "A second photo replaces this result."
                : `We will count each row and compare it with the plan for ${chosen.code}.`
            }
            actionLabel="Check this shelf"
            isPending={isScanning}
            error={scanError}
            compact={Boolean(scan)}
            onSubmit={runScan}
          />
        </div>

        <div className="scroll-slim min-h-0 overflow-y-auto pr-1 lg:col-span-2">
          {scan ? (
            <ScanResult scan={scan} attention={attention ?? []} />
          ) : (
            <ThePlan shelf={chosen} />
          )}
        </div>
      </div>
    </PageShell>
  );
}

/* ------------------------------------------------------------ step one -- */
function ShelfChooser({
  shelves,
  isLoading,
  onPick,
}: {
  shelves: Shelf[];
  isLoading: boolean;
  onPick: (shelf: Shelf) => void;
}) {
  const [term, setTerm] = useState("");
  const needle = term.trim().toLowerCase();
  const shown = needle
    ? shelves.filter(
        (shelf) =>
          shelf.name.toLowerCase().includes(needle) ||
          shelf.code.toLowerCase().includes(needle) ||
          (shelf.location ?? "").toLowerCase().includes(needle),
      )
    : shelves;

  if (isLoading) {
    return <Loader2 className="m-auto h-6 w-6 animate-spin text-muted-foreground" />;
  }

  if (shelves.length === 0) {
    return (
      <div className="m-auto rounded-2xl bg-card p-10 text-center">
        <Grid3x3 className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="text-base font-semibold">No shelves yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          A shelf has to be laid out before it can be checked — the plan is what tells us which
          product belongs in which row.
        </p>
        <Button className="mt-4" onClick={() => (window.location.href = "/shelves")}>
          Set up a shelf
        </Button>
      </div>
    );
  }

  return (
    <>
      <p className="shrink-0 rounded-2xl bg-brand-soft p-4 text-sm">
        <strong className="font-semibold">Pick the shelf first.</strong>{" "}
        <span className="text-muted-foreground">
          Naming the shelf tells us which products can possibly be in the photo. Without it every
          box in the frame is a guess against the whole catalogue.
        </span>
      </p>

      {/* Only worth a search box once there are enough shelves to hunt through
          -- 200 of them is the case this is for, four is not. */}
      {shelves.length > 8 ? (
        <input
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          placeholder="Find a shelf by name, code or where it is…"
          aria-label="Find a shelf"
          className="w-full shrink-0 rounded-xl bg-card px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      ) : null}

      <ul className="scroll-slim grid min-h-0 flex-1 auto-rows-min grid-cols-1 gap-3 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((shelf) => {
          const assigned = shelf.rows.filter((row) => row.allocation).length;
          const lowRows = shelf.rows.filter((row) => row.needs_restock).length;
          return (
            <li key={shelf.id}>
              <button
                type="button"
                onClick={() => onPick(shelf)}
                disabled={assigned === 0}
                className={cn(
                  "flex w-full flex-col rounded-2xl bg-card p-4 text-left transition-colors",
                  assigned === 0 ? "cursor-not-allowed opacity-60" : "hover:bg-accent",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{shelf.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {shelf.code}
                      {shelf.location ? ` · ${shelf.location}` : ""}
                    </span>
                  </span>
                  {lowRows > 0 ? (
                    <span className="shrink-0 rounded-full bg-warning/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warning">
                      {lowRows} low
                    </span>
                  ) : null}
                </div>

                {/* A miniature of the bay, so the right one is recognised by
                    shape rather than by reading a code off a label. */}
                <span className="mt-3 flex flex-col gap-0.5" aria-hidden>
                  {shelf.rows.map((row) => (
                    <span
                      key={row.id}
                      className={cn(
                        "h-1.5 rounded-full",
                        !row.allocation
                          ? "bg-secondary"
                          : row.needs_restock
                            ? "bg-destructive"
                            : "bg-brand",
                      )}
                    />
                  ))}
                </span>

                <span className="mt-2.5 text-xs text-muted-foreground">
                  {assigned === 0
                    ? "No products assigned yet"
                    : `${assigned} of ${shelf.rows.length} rows assigned`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ------------------------------------------------- what should be there -- */
function ThePlan({ shelf }: { shelf: Shelf }) {
  return (
    <div className="rounded-2xl bg-card p-5">
      <h2 className="text-label mb-1 text-muted-foreground">What should be here</h2>
      <p className="mb-3.5 text-xs text-muted-foreground">
        Top row first. This is what the photo will be counted against.
      </p>
      <ol className="space-y-1.5">
        {shelf.rows.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-2.5 rounded-xl bg-secondary px-3 py-2.5"
          >
            <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
              {row.position}
            </span>
            <span className="min-w-0 flex-1">
              {row.allocation ? (
                <>
                  <span className="block truncate text-sm font-medium">
                    {row.allocation.product_name}
                  </span>
                  <span className="tabular block text-xs text-muted-foreground">
                    should hold {row.allocation.capacity} · ledger says {row.on_shelf}
                  </span>
                </>
              ) : (
                <span className="text-sm text-muted-foreground">Not assigned</span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------- results -- */
const VERDICT: Record<RowFinding["verdict"], { label: string; tone: string; dot: string }> = {
  ok: { label: "Stocked", tone: "text-muted-foreground", dot: "bg-success" },
  low: { label: "Running low", tone: "text-warning", dot: "bg-warning" },
  empty: { label: "Empty", tone: "text-destructive", dot: "bg-destructive" },
  overfull: { label: "More than planned", tone: "text-muted-foreground", dot: "bg-brand" },
  unexpected: { label: "Stock in an unassigned row", tone: "text-warning", dot: "bg-warning" },
  unallocated: { label: "Not assigned", tone: "text-muted-foreground", dot: "bg-border" },
};

function ScanResult({ scan, attention }: { scan: ShelfScan; attention: RowFinding[] }) {
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "rounded-2xl p-4",
          attention.length === 0 ? "bg-brand-soft" : "bg-card",
        )}
      >
        <div className="flex items-start gap-2.5">
          {attention.length === 0 ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
          ) : (
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold">
              {attention.length === 0
                ? "Every row is stocked"
                : `${attention.length} row${attention.length === 1 ? "" : "s"} need attention`}
            </p>
            <p className="tabular mt-0.5 text-xs text-muted-foreground">
              {scan.total_detected} items counted in {Math.round(scan.latency_ms)} ms
              {scan.unassigned > 0 ? ` · ${scan.unassigned} not attributed to a row` : ""}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5">
        <h2 className="text-label mb-3 text-muted-foreground">Row by row</h2>
        <ol className="space-y-1.5">
          {scan.rows.map((row) => {
            const verdict = VERDICT[row.verdict];
            const fill = row.capacity
              ? Math.min(100, (row.detected_facings / row.capacity) * 100)
              : 0;
            return (
              <li key={row.row_id} className="rounded-xl bg-secondary p-3">
                <div className="flex items-start gap-2.5">
                  <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
                    {row.position}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">
                        {row.product_name ?? "Not assigned"}
                      </span>
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide",
                          verdict.tone,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 rounded-full", verdict.dot)} aria-hidden />
                        {verdict.label}
                      </span>
                    </div>

                    {row.capacity > 0 ? (
                      <div className="relative mt-2 h-1.5 overflow-hidden rounded-full bg-card">
                        <span
                          className={cn(
                            "absolute inset-y-0 left-0 rounded-full transition-all",
                            row.verdict === "empty" || row.verdict === "low"
                              ? "bg-destructive"
                              : "bg-brand",
                          )}
                          style={{ width: `${fill}%` }}
                        />
                      </div>
                    ) : null}

                    <p className="tabular mt-1.5 text-xs text-muted-foreground">
                      counted <span className="font-semibold text-foreground">
                        {row.detected_facings}
                      </span>
                      {row.capacity > 0 ? ` of ${row.capacity}` : ""}
                      {" · ledger says "}
                      {row.system_on_shelf}
                      {row.gap !== 0 && row.sku ? (
                        <span className={row.gap < 0 ? "text-destructive" : undefined}>
                          {" · "}
                          {row.gap < 0
                            ? `${Math.abs(row.gap)} unaccounted for`
                            : `${row.gap} more than recorded`}
                        </span>
                      ) : null}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Said on the screen that makes the claim, not buried in a document.
          The count is real; the identity comes from the plan, not the camera. */}
      <p className="flex items-start gap-2 rounded-2xl bg-card px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        <ScanLine className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Each row is named from your shelf plan, not recognised from the photo. This confirms how
        full a row is — it cannot tell you the right product was put there.
      </p>
    </div>
  );
}
