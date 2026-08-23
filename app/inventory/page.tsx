"use client";

import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  ChevronDown,
  Loader2,
  PackageX,
  Search,
  Snowflake,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { CatalogueProduct } from "@/components/catalogue/product-picker";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

interface Facets {
  categories: { name: string; count: number }[];
  brands: { name: string; count: number }[];
}

const PAGE_SIZE = 40;

/**
 * The catalogue, as the customer's inventory system holds it.
 *
 * Read-only, and not incidentally: products, prices and stock levels belong to
 * that system, which takes deliveries in and bills sales out. We read it so a
 * discrepancy can be priced and a shelf can be checked against something. There
 * is no edit control on this screen because there is nothing here we may
 * change -- a price is corrected in the system that charges it.
 *
 * Paged rather than infinite: at ten thousand rows a page number is a position
 * a person can return to, and an infinite list is one they cannot.
 */
export default function InventoryPage() {
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"all" | "out" | "in">("all");
  const [page, setPage] = useState(0);

  const [products, setProducts] = useState<CatalogueProduct[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [facets, setFacets] = useState<Facets | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chosen, setChosen] = useState<CatalogueProduct | null>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // The typed term becomes the query on a pause, so the list does not thrash
  // through partial words on the way to a real one.
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(term.trim());
      setPage(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => {
    void request<Facets>(`${API_V1}/inventory/products/facets`)
      .then(setFacets)
      .catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const filters = {
      q: query || undefined,
      category: category ?? undefined,
      in_stock: stockFilter === "all" ? undefined : stockFilter === "in",
    };
    try {
      const [rows, count] = await Promise.all([
        request<CatalogueProduct[]>(`${API_V1}/inventory/products`, {
          query: { ...filters, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
        }),
        request<{ total: number }>(`${API_V1}/inventory/products/count`, { query: filters }),
      ]);
      setProducts(rows);
      setTotal(count.total);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the catalogue.");
    } finally {
      setIsLoading(false);
    }
  }, [query, category, stockFilter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  // The list keeps its own scroll position, so a new page or a new filter would
  // otherwise open halfway down the results.
  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [page, query, category, stockFilter]);

  const filtered = query !== "" || category !== null || stockFilter !== "all";
  const lastPage = total === null ? 0 : Math.max(0, Math.ceil(total / PAGE_SIZE) - 1);

  return (
    <PageShell
      title="Inventory"
      subtitle="Read from the inventory system — this screen changes nothing"
    >
      {/*
        The frame is the viewport; only the list moves.

        Ten thousand rows down one scrolling page means the search box, the
        filters and the page controls all leave the screen the moment you start
        looking -- so changing a filter is a scroll back up, and there is no
        fixed point to tell you where you are. The controls stay put and the
        list scrolls inside its own card, which is the behaviour a table of this
        size needs.

        Both sections sit directly in the shell's flex column: the search block
        keeps its own height, the list takes what is left.
      */}
      <section className="shrink-0 rounded-2xl bg-card p-4">
        {error ? (
          <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <input
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Search by name, brand, category or barcode…"
            aria-label="Search the catalogue"
            className="w-full rounded-xl bg-secondary py-3 pl-10 pr-10 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {term ? (
            <button
              type="button"
              onClick={() => setTerm("")}
              aria-label="Clear the search"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <div className="flex shrink-0 items-center gap-1.5">
            <Chip active={stockFilter === "all"} onClick={() => setStockFilter("all")}>
              Everything
            </Chip>
            <Chip active={stockFilter === "out"} onClick={() => setStockFilter("out")}>
              <PackageX className="h-3 w-3" aria-hidden />
              Out of stock
            </Chip>
            <Chip active={stockFilter === "in"} onClick={() => setStockFilter("in")}>
              In stock
            </Chip>
          </div>

          <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />

          {/* A menu, not a row of chips.
              Nineteen categories wrapped to three lines and took a third of the
              height away from the thing being filtered; as one scrolling row
              they left a grey scrollbar across the panel and could not be
              reached with a mouse wheel at all. A select shows every one of
              them, costs one line, and works the same on a phone. */}
          <label className="relative flex min-w-0 items-center">
            <span className="sr-only">Filter by category</span>
            <select
              value={category ?? ""}
              onChange={(event) => {
                setCategory(event.target.value || null);
                setPage(0);
              }}
              className={cn(
                "cursor-pointer appearance-none rounded-full py-1.5 pl-3 pr-8 text-xs font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                category
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-accent",
              )}
            >
              <option value="">All categories</option>
              {(facets?.categories ?? []).map((item) => (
                <option key={item.name} value={item.name}>
                  {item.name} ({item.count})
                </option>
              ))}
            </select>
            <ChevronDown
              className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 opacity-70"
              aria-hidden
            />
          </label>

          {category ? (
            <button
              type="button"
              onClick={() => {
                setCategory(null);
                setPage(0);
              }}
              className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent"
              aria-label="Clear the category filter"
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </section>

      {/* ----------------------------------------------------------- list */}
      <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl bg-card p-4">
        <div className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2">
          <h2 className="text-label text-muted-foreground">
            {total === null ? (
              "Loading…"
            ) : (
              <>
                {formatNumber(total)} product{total === 1 ? "" : "s"}
                {filtered ? " match" : " in the catalogue"}
              </>
            )}
          </h2>
          {total !== null && total > PAGE_SIZE ? (
            <div className="flex items-center gap-2 text-xs">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0 || isLoading}
                onClick={() => setPage((current) => Math.max(0, current - 1))}
              >
                Previous
              </Button>
              <span className="tabular text-muted-foreground">
                {page + 1} of {lastPage + 1}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={page >= lastPage || isLoading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </div>

        {isLoading ? (
          <Loader2 className="m-auto h-6 w-6 animate-spin text-muted-foreground" />
        ) : products.length === 0 ? (
          <div className="m-auto text-center">
            <Boxes className="mx-auto mb-3 h-9 w-9 text-muted-foreground" aria-hidden />
            <p className="text-sm font-semibold">Nothing matches those filters</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try a shorter search, or clear the category.
            </p>
          </div>
        ) : (
          <ul ref={listRef} className="scroll-slim min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {products.map((product) => (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => setChosen(product)}
                  className="flex w-full flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-3 text-left transition-colors hover:bg-accent"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold">{product.name}</span>
                      {product.system_stock === 0 ? (
                        <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-destructive">
                          Out of stock
                        </span>
                      ) : product.system_stock <= product.reorder_threshold ? (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-warning">
                          Low
                        </span>
                      ) : null}
                      {product.is_perishable ? (
                        <Snowflake
                          className="h-3 w-3 text-muted-foreground"
                          aria-label="Perishable"
                        />
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {[product.brand, product.category, product.pack_size]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <div className="tabular flex shrink-0 items-center gap-5 text-right text-xs">
                    <span>
                      <span className="block font-semibold">
                        {formatCurrency(product.unit_price)}
                      </span>
                      <span className="block text-muted-foreground">price</span>
                    </span>
                    <span className="w-14">
                      <span className="block font-semibold">
                        {formatNumber(product.system_stock)}
                      </span>
                      <span className="block text-muted-foreground">in stock</span>
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
      )}
    </section>

      <p className="shrink-0 px-1 text-[11px] text-muted-foreground">
        Products, prices and stock come from the inventory system. ShelfSight reads them and
        never writes — corrections belong in the system that bills against them.
      </p>

      {chosen ? <ProductSheet product={chosen} onClose={() => setChosen(null)} /> : null}
    </PageShell>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        // shrink-0: these sit in a horizontal scroller, and without it flex
        // squeezes every category into an unreadable sliver rather than
        // letting the row overflow.
        "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-muted-foreground hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

/** The whole record for one product — everything the other use cases read. */
function ProductSheet({
  product,
  onClose,
}: {
  product: CatalogueProduct;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const discounted = product.mrp != null && product.unit_price < product.mrp;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
      onClick={onClose}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-card p-5 sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold">{product.name}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              <span className="font-mono">{product.sku}</span>
              {product.barcode ? (
                <>
                  {" · "}
                  <span className="font-mono">{product.barcode}</span>
                </>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <Fact label="Brand" value={product.brand ?? "—"} />
          <Fact label="Category" value={product.category ?? "—"} />
          <Fact label="Pack" value={product.pack_size ?? "—"} />
          <Fact label="Selling price" value={formatCurrency(product.unit_price)} />
          <Fact
            label="Printed MRP"
            value={product.mrp != null ? formatCurrency(product.mrp) : "—"}
            note={discounted ? "sold below MRP" : undefined}
          />
          <Fact label="In stock" value={formatNumber(product.system_stock)} />
          <Fact label="Reorder at" value={formatNumber(product.reorder_threshold)} />
          <Fact label="Fits a row" value={`${product.units_per_row}`} />
          <Fact
            label="Shelf life"
            value={product.shelf_life_days ? `${product.shelf_life_days} days` : "—"}
          />
        </dl>

        {product.system_stock === 0 ? (
          <p className="mt-4 flex items-start gap-2 rounded-xl bg-destructive/10 px-3.5 py-2.5 text-xs text-destructive">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            The record says none are held. A shelf scan that finds some of these is an overcount,
            not an error.
          </p>
        ) : null}

        {product.is_perishable ? (
          <p className="mt-2 flex items-start gap-2 rounded-xl bg-brand-soft px-3.5 py-2.5 text-xs">
            <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            Perishable. Deliveries of this are dated on arrival and placed soonest-expiring at the
            front of the row.
          </p>
        ) : null}
      </div>
    </div>
  );
}

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-secondary p-3">
      <dt className="text-label text-muted-foreground">{label}</dt>
      <dd className="tabular mt-0.5 truncate text-sm font-semibold">{value}</dd>
      {note ? <dd className="text-[11px] text-muted-foreground">{note}</dd> : null}
    </div>
  );
}
