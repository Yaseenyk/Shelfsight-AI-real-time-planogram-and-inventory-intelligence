"use client";

import { CalendarClock, Loader2, PackagePlus } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

interface BatchRow {
  id: number;
  batch_code: string;
  product_id: number;
  product_name: string;
  sku: string;
  expiry_date: string;
  quantity_received: number;
  quantity_remaining: number;
  days_to_expiry: number;
}

interface ProductOption {
  id: number;
  sku: string;
  name: string;
  shelf_life_days?: number | null;
}

/**
 * Booking a delivery into the stockroom.
 *
 * Expiry is a required field, not an optional one. A batch without a date
 * cannot be ordered against another, so accepting it would put stock on a shelf
 * that the front-to-back rule silently cannot place -- the failure would show
 * up weeks later as waste rather than as an error here.
 *
 * The stockroom list is ordered soonest-expiring first, which is the order the
 * batches should leave it in. Sorting by arrival date would show the same rows
 * in the order that causes waste.
 */
export default function ReceivingPage() {
  const { can } = useAuth();
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [batchList, productList] = await Promise.all([
        request<BatchRow[]>(`${API_V1}/batches`),
        request<ProductOption[]>(`${API_V1}/inventory/products`, { query: { limit: 200 } }),
      ]);
      setBatches(batchList);
      setProducts(productList);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the stockroom.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageShell
      fit={false}
      title="Stockroom"
      subtitle="Book in a delivery and see what is waiting to go out"
    >
      {error ? (
        <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        {can("batch:receive") ? (
          <div className="lg:col-span-2">
            <ReceiveForm products={products} onReceived={load} />
          </div>
        ) : null}

        <div className={cn(can("batch:receive") ? "lg:col-span-3" : "lg:col-span-5")}>
          <div className="rounded-2xl bg-card p-5">
            <h2 className="text-label mb-1 text-muted-foreground">In the stockroom</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              Soonest to expire first — use these before the rest
            </p>

            {isLoading ? (
              <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-muted-foreground" />
            ) : batches.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Nothing waiting. Book in a delivery to get started.
              </p>
            ) : (
              <ul className="space-y-2">
                {batches.map((batch) => (
                  <BatchCard key={batch.id} batch={batch} />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function BatchCard({ batch }: { batch: BatchRow }) {
  // Three bands rather than a raw day count: "expires in 4 days" needs
  // interpreting, "use first" does not.
  const urgency =
    batch.days_to_expiry < 0
      ? { label: "Expired", tone: "bg-destructive text-destructive-foreground" }
      : batch.days_to_expiry <= 7
        ? { label: "Use first", tone: "bg-destructive/12 text-destructive" }
        : batch.days_to_expiry <= 30
          ? { label: "Use soon", tone: "bg-warning/15 text-warning" }
          : { label: "Plenty of time", tone: "bg-secondary text-muted-foreground" };

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-secondary p-3.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold">{batch.product_name}</p>
        <p className="text-xs text-muted-foreground">
          <span className="font-mono">{batch.batch_code}</span> · expires{" "}
          {new Date(batch.expiry_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
          {batch.days_to_expiry >= 0 ? ` · ${batch.days_to_expiry} days` : " · already past"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn("rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide", urgency.tone)}>
          {urgency.label}
        </span>
        <span className="tabular text-sm font-semibold">
          {batch.quantity_remaining}
          <span className="text-xs font-normal text-muted-foreground">
            {" "}
            / {batch.quantity_received}
          </span>
        </span>
      </div>
    </li>
  );
}

function ReceiveForm({
  products,
  onReceived,
}: {
  products: ProductOption[];
  onReceived: () => void;
}) {
  const [productId, setProductId] = useState<number | "">("");
  const [quantity, setQuantity] = useState<number | "">("");
  const [expiry, setExpiry] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  const chosen = products.find((p) => p.id === productId);

  // Pre-fill the expiry from the product's shelf life so the commonest case is
  // one tap, while leaving it editable because the printed date always wins.
  useEffect(() => {
    if (chosen?.shelf_life_days && !expiry) {
      const target = new Date();
      target.setDate(target.getDate() + chosen.shelf_life_days);
      setExpiry(target.toISOString().slice(0, 10));
    }
  }, [chosen, expiry]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setDone(null);
    try {
      const batch = await request<BatchRow>(`${API_V1}/batches`, {
        method: "POST",
        body: {
          product_id: productId,
          quantity,
          expiry_date: expiry,
          batch_code: code || null,
        },
      });
      setDone(`${batch.quantity_received} × ${batch.product_name} booked in`);
      setProductId("");
      setQuantity("");
      setExpiry("");
      setCode("");
      onReceived();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-5">
      <h2 className="text-label mb-4 flex items-center gap-2 text-muted-foreground">
        <PackagePlus className="h-3.5 w-3.5" aria-hidden />
        Book in a delivery
      </h2>

      <div className="space-y-3">
        <label className="block">
          <span className="text-label mb-1.5 block text-muted-foreground">What arrived?</span>
          <select
            value={productId}
            onChange={(event) => {
              setProductId(Number(event.target.value));
              setExpiry("");
            }}
            className={inputClass}
          >
            <option value="">Choose a product…</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="text-label mb-1.5 block text-muted-foreground">How many?</span>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(event) => setQuantity(Number(event.target.value))}
              className={inputClass}
              placeholder="0"
            />
          </label>
          <label className="block">
            <span className="text-label mb-1.5 block text-muted-foreground">Expiry date</span>
            <input
              type="date"
              value={expiry}
              onChange={(event) => setExpiry(event.target.value)}
              className={inputClass}
            />
          </label>
        </div>

        <label className="block">
          <span className="text-label mb-1.5 block text-muted-foreground">
            Batch code <span className="font-normal normal-case">(optional)</span>
          </span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className={inputClass}
            placeholder="Made up for you if left blank"
          />
        </label>

        <p className="flex items-start gap-2 rounded-xl bg-brand-soft px-3 py-2.5 text-xs">
          <CalendarClock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          The expiry date decides where this goes on the shelf. Soonest-expiring stock is placed at
          the front so it sells first.
        </p>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}
        {done ? (
          <p className="rounded-xl bg-brand px-3 py-2 text-sm font-medium text-brand-foreground">
            {done}
          </p>
        ) : null}

        <Button
          className="w-full"
          onClick={() => void save()}
          disabled={saving || productId === "" || !quantity || !expiry}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Book it in
        </Button>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl bg-secondary px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
