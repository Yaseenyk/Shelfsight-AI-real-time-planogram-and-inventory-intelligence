"use client";

import { AlertTriangle, CheckCircle2, Loader2, ScanBarcode } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface ScanResult {
  product_name: string;
  sku: string;
  shelf_code: string;
  row_position: number;
  taken_from_batch: string;
  batch_expiry: string;
  remaining_on_row: number;
  needs_restock: boolean;
}

/**
 * The till.
 *
 * A single always-focused input, because a USB barcode scanner is a keyboard:
 * it types the code and presses Enter. Nothing else on the screen may steal
 * focus, or the next scan lands somewhere harmless and the sale is silently
 * lost.
 *
 * The result names which batch the unit came from and when it expires. That is
 * not decoration -- it is the only visible evidence that the front of the shelf
 * is being sold first, and the cashier is the person positioned to notice if it
 * ever stops being true.
 */
export default function TillPage() {
  const [barcode, setBarcode] = useState("");
  const [history, setHistory] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep the field focused: a scanner types wherever the caret happens to be.
  useEffect(() => {
    const focus = () => inputRef.current?.focus();
    focus();
    const timer = setInterval(focus, 1500);
    return () => clearInterval(timer);
  }, []);

  const scan = async (code: string) => {
    if (!code.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await request<ScanResult>(`${API_V1}/sales/scan`, {
        method: "POST",
        body: { barcode: code.trim(), quantity: 1 },
      });
      setHistory((current) => [result, ...current].slice(0, 12));
      setBarcode("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That scan did not work.");
      setBarcode("");
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  };

  return (
    <PageShell fit={false} title="Till" subtitle="Scan a barcode to sell an item">
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="rounded-2xl bg-card p-5">
            <h2 className="text-label mb-3 flex items-center gap-2 text-muted-foreground">
              <ScanBarcode className="h-3.5 w-3.5" aria-hidden />
              Scan
            </h2>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                void scan(barcode);
              }}
            >
              <input
                ref={inputRef}
                value={barcode}
                onChange={(event) => setBarcode(event.target.value)}
                placeholder="Point the scanner here"
                aria-label="Barcode"
                autoComplete="off"
                className="w-full rounded-xl bg-secondary px-4 py-4 text-center font-mono text-lg tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button className="mt-3 w-full" type="submit" disabled={busy || !barcode.trim()}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                Sell one
              </Button>
            </form>

            {error ? (
              <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            ) : null}

            <div className="mt-4 rounded-xl bg-secondary p-3">
              <p className="text-label mb-1.5 text-muted-foreground">No scanner? Try these</p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    ["8901234500031", "Chips"],
                    ["8901234500017", "Water"],
                    ["8901234500048", "Milk"],
                  ] as const
                ).map(([code, label]) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => void scan(code)}
                    disabled={busy}
                    className="rounded-lg bg-card px-2.5 py-1.5 font-mono text-xs transition-colors hover:bg-accent"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="rounded-2xl bg-card p-5">
            <h2 className="text-label mb-3 text-muted-foreground">Just sold</h2>
            {history.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                Scans will appear here.
              </p>
            ) : (
              <ul className="space-y-2">
                {history.map((item, index) => (
                  <li
                    key={`${item.taken_from_batch}-${index}`}
                    className={cn(
                      "rounded-xl p-3.5",
                      index === 0 ? "bg-brand-soft" : "bg-secondary",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{item.product_name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.shelf_code} row {item.row_position} · taken from{" "}
                          <span className="font-mono">{item.taken_from_batch}</span>, expires{" "}
                          {new Date(item.batch_expiry).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="tabular text-sm font-semibold">
                          {item.remaining_on_row} left
                        </p>
                        {item.needs_restock ? (
                          <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] font-bold uppercase tracking-wide text-destructive">
                            <AlertTriangle className="h-3 w-3" aria-hidden />
                            Refill raised
                          </p>
                        ) : (
                          <p className="mt-0.5 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" aria-hidden />
                            Stocked
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
