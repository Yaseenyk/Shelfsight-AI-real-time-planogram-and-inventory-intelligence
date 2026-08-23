"use client";

import { Check, Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { API_V1, request } from "@/lib/api/client";
import { cn } from "@/lib/utils";

export interface CatalogueProduct {
  id: number;
  sku: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  pack_size?: string | null;
  mrp?: number | null;
  unit_price: number;
  system_stock: number;
  reorder_threshold: number;
  units_per_row: number;
  barcode?: string | null;
  is_perishable: boolean;
  shelf_life_days?: number | null;
}

/**
 * Find one product in a catalogue of ten thousand.
 *
 * A `<select>` was the right control for twelve products and is the wrong one
 * for ten thousand: the browser renders every option, the list cannot be
 * searched beyond first-letter jumps, and on a phone it becomes a wheel nobody
 * can reach the middle of.
 *
 * So: type, and the server filters. Searching server-side rather than filtering
 * a downloaded list, because the list is the thing that is too big to download.
 * The query is debounced -- a keystroke is not a question, a pause is.
 *
 * Each result shows pack size and price alongside the name, because "Maggi
 * Masala Noodles" alone does not identify a product in a catalogue that holds
 * seven sizes of it.
 */
export function ProductPicker({
  value,
  onChange,
  autoFocus,
  placeholder = "Search by name, brand or barcode…",
}: {
  value: CatalogueProduct | null;
  onChange: (product: CatalogueProduct | null) => void;
  autoFocus?: boolean;
  placeholder?: string;
}) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<CatalogueProduct[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Debounced: fire on a pause, not on a keystroke. Every request is also
  // aborted when the next one starts, so a slow early response can never
  // overwrite the results of a later, narrower query.
  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setResults([]);
      setIsSearching(false);
      return;
    }
    const controller = new AbortController();
    setIsSearching(true);
    const timer = setTimeout(() => {
      request<CatalogueProduct[]>(`${API_V1}/inventory/products`, {
        query: { q: query, limit: 25 },
        signal: controller.signal,
      })
        .then((found) => {
          setResults(found);
          setError(null);
        })
        .catch((caught: unknown) => {
          if (controller.signal.aborted) return;
          setError(caught instanceof Error ? caught.message : "Search failed.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsSearching(false);
        });
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  // Close on an outside click, so the list does not sit over the form fields
  // the person moved on to.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (value) {
    return <ChosenProduct product={value} onClear={() => onChange(null)} />;
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          aria-label="Search the catalogue"
          autoComplete="off"
          autoFocus={autoFocus}
          className="w-full rounded-xl bg-secondary py-2.5 pl-9 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {isSearching ? (
          <Loader2
            className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
            aria-hidden
          />
        ) : term ? (
          <button
            type="button"
            onClick={() => setTerm("")}
            aria-label="Clear the search"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        ) : null}
      </div>

      {open && term.trim().length >= 2 ? (
        <div className="absolute z-20 mt-1.5 max-h-72 w-full overflow-y-auto rounded-xl bg-card p-1.5 shadow-lg ring-1 ring-border">
          {error ? (
            <p className="px-3 py-3 text-sm text-destructive">{error}</p>
          ) : results.length === 0 && !isSearching ? (
            <p className="px-3 py-3 text-sm text-muted-foreground">
              Nothing matches “{term.trim()}”.
            </p>
          ) : (
            <ul>
              {results.map((product) => (
                <li key={product.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(product);
                      setOpen(false);
                      setTerm("");
                    }}
                    className="flex w-full items-start justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-accent"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{product.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[product.brand, product.category].filter(Boolean).join(" · ")}
                      </span>
                    </span>
                    <span className="tabular shrink-0 text-right text-xs">
                      <span className="block font-semibold">₹{product.unit_price}</span>
                      <span className="block text-muted-foreground">
                        {product.system_stock} in stock
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : term.trim().length === 1 ? (
        <p className="mt-1.5 px-1 text-xs text-muted-foreground">Keep typing…</p>
      ) : null}
    </div>
  );
}

function ChosenProduct({
  product,
  onClear,
}: {
  product: CatalogueProduct;
  onClear: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl bg-brand-soft p-3">
      <div className="flex min-w-0 items-start gap-2">
        <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{product.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            <span className="font-mono">{product.sku}</span>
            {product.pack_size ? ` · ${product.pack_size}` : ""} · ₹{product.unit_price} ·{" "}
            {product.units_per_row} fit a row
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onClear}
        aria-label="Choose a different product"
        className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-card"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

export const pickerInputClass = cn(
  "w-full rounded-xl bg-secondary px-3.5 py-2.5 text-sm",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
);
