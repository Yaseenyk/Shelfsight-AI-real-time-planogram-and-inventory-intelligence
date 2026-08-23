"use client";

import { ArrowLeft, ArrowRight, Check, Loader2, Rows3, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ProductPicker, type CatalogueProduct } from "@/components/catalogue/product-picker";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { cn } from "@/lib/utils";

interface CreatedShelf {
  id: number;
  code: string;
  name: string;
  rows: { id: number; position: number }[];
}

type Step = "shelf" | "rows" | "products";

const MAX_ROWS = 12;

/**
 * Setting up a shelf, in the order a manager actually does it.
 *
 * Standing in front of a bay you know three things in sequence: which bay this
 * is, how many shelves are in it, and what goes on each one. The old dialog
 * asked for all of that at once and then made you open a second dialog per row
 * afterwards, so a four-row bay was five separate forms and nothing told you
 * how far through you were.
 *
 * The row step is the reason this is a wizard rather than one long form: the
 * product fields cannot exist until the number of rows is known, and asking for
 * "how many rows" halfway down a form the manager has already started filling
 * in is how rows get created with the wrong count.
 *
 * Each row asks for the same three things, in the same order every time:
 * which product, what size the pack is, and how many fit. Pack size comes from
 * the inventory system with the product, so the manager confirms it rather than
 * typing it -- and the capacity suggestion follows from it, because a row holds
 * fifty small packs or ten large ones.
 */
export function ShelfSetupWizard({
  onClose,
  onFinished,
}: {
  onClose: () => void;
  onFinished: () => void;
}) {
  const [step, setStep] = useState<Step>("shelf");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rowCount, setRowCount] = useState(4);
  const [shelf, setShelf] = useState<CreatedShelf | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const createShelf = async () => {
    setBusy(true);
    setError(null);
    try {
      const created = await request<CreatedShelf>(`${API_V1}/shelves`, {
        method: "POST",
        body: {
          code: code.trim(),
          name: name.trim() || code.trim(),
          location: location.trim() || null,
          row_count: rowCount,
        },
      });
      setShelf(created);
      setStep("products");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the shelf.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Set up a shelf"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-2xl bg-card sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex shrink-0 items-start justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold">
              {step === "shelf"
                ? "Which shelf is this?"
                : step === "rows"
                  ? "How many rows does it have?"
                  : "What goes on each row?"}
            </h2>
            <Steps current={step} />
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {error ? (
            <p className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          {step === "shelf" ? (
            <div className="space-y-3">
              <Field label="Short code" hint="What is written on the bay, e.g. AISLE3-BAY2">
                <input
                  value={code}
                  onChange={(event) => setCode(event.target.value.toUpperCase())}
                  className={inputClass}
                  placeholder="AISLE3-BAY2"
                  autoFocus
                />
              </Field>
              <Field label="Name" hint="What staff call it">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClass}
                  placeholder="Aisle 3, Bay 2"
                />
              </Field>
              <Field label="Where is it?" hint="Optional — helps staff find it">
                <input
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className={inputClass}
                  placeholder="Front of store, left side"
                />
              </Field>
            </div>
          ) : step === "rows" ? (
            <RowCountStep value={rowCount} onChange={setRowCount} />
          ) : shelf ? (
            <RowProducts shelf={shelf} onDone={onFinished} />
          ) : null}
        </div>

        {step !== "products" ? (
          <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border p-5">
            {step === "rows" ? (
              <Button variant="ghost" onClick={() => setStep("shelf")}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                Back
              </Button>
            ) : (
              <span />
            )}
            <Button
              onClick={() => (step === "shelf" ? setStep("rows") : void createShelf())}
              disabled={busy || (step === "shelf" && !code.trim())}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {step === "shelf" ? "Next" : `Create it with ${rowCount} rows`}
              {step === "shelf" ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
            </Button>
          </footer>
        ) : null}
      </div>
    </div>
  );
}

function Steps({ current }: { current: Step }) {
  const order: Step[] = ["shelf", "rows", "products"];
  const labels: Record<Step, string> = {
    shelf: "The shelf",
    rows: "Its rows",
    products: "The products",
  };
  const index = order.indexOf(current);

  return (
    <ol className="mt-1.5 flex items-center gap-1.5">
      {order.map((step, position) => (
        <li key={step} className="flex items-center gap-1.5">
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
              position < index
                ? "bg-brand-soft text-foreground"
                : position === index
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground",
            )}
          >
            {position < index ? <Check className="h-3 w-3" aria-hidden /> : null}
            {labels[step]}
          </span>
          {position < order.length - 1 ? (
            <span className="h-px w-3 bg-border" aria-hidden />
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function RowCountStep({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        Count the shelves in the bay from top to bottom. Row 1 is the top one, the way you read it.
      </p>

      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: MAX_ROWS }, (_, index) => index + 1).map((count) => (
          <button
            key={count}
            type="button"
            onClick={() => onChange(count)}
            aria-pressed={value === count}
            className={cn(
              "tabular h-11 w-11 rounded-xl text-sm font-bold transition-colors",
              value === count
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground hover:bg-accent",
            )}
          >
            {count}
          </button>
        ))}
      </div>

      {/* A picture of the bay being described, so the number is checked against
          the shelf in front of the manager rather than against itself. */}
      <div className="mt-4 rounded-xl bg-secondary p-4">
        <p className="text-label mb-2 flex items-center gap-1.5 text-muted-foreground">
          <Rows3 className="h-3.5 w-3.5" aria-hidden />
          {value} row{value === 1 ? "" : "s"}
        </p>
        <div className="flex flex-col gap-1">
          {Array.from({ length: value }, (_, index) => (
            <div
              key={index}
              className="flex h-7 items-center rounded-md bg-card px-2 text-[11px] font-semibold text-muted-foreground"
            >
              Row {index + 1}
              {index === 0 ? <span className="ml-1.5 font-normal">· top</span> : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Step three: one product per row, with its pack size and how many fit. */
function RowProducts({ shelf, onDone }: { shelf: CreatedShelf; onDone: () => void }) {
  const [done, setDone] = useState<Record<number, string>>({});

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-brand-soft px-3.5 py-2.5 text-xs">
        <strong className="font-semibold">{shelf.code} is created.</strong>{" "}
        <span className="text-muted-foreground">
          Assign a product to each row. You can leave rows for later — an unassigned row is
          simply not checked.
        </span>
      </p>

      {shelf.rows.map((row) => (
        <RowAssignment
          key={row.id}
          rowId={row.id}
          position={row.position}
          assigned={done[row.id]}
          onAssigned={(label) => setDone((current) => ({ ...current, [row.id]: label }))}
        />
      ))}

      <Button className="w-full" onClick={onDone}>
        <Check className="h-4 w-4" aria-hidden />
        {Object.keys(done).length === shelf.rows.length
          ? "All rows assigned — finish"
          : `Finish (${Object.keys(done).length} of ${shelf.rows.length} assigned)`}
      </Button>
    </div>
  );
}

function RowAssignment({
  rowId,
  position,
  assigned,
  onAssigned,
}: {
  rowId: number;
  position: number;
  assigned?: string;
  onAssigned: (label: string) => void;
}) {
  const [product, setProduct] = useState<CatalogueProduct | null>(null);
  const [capacity, setCapacity] = useState<number | "">("");
  const [buffer, setBuffer] = useState<number | "">("");
  const [fee, setFee] = useState<number>(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Capacity follows from the pack: fifty 70g packets or ten 1kg bags in the
  // same physical row. Suggested, never imposed — the row settles the argument.
  useEffect(() => {
    if (product && capacity === "") {
      const suggestion = suggestCapacity(product.pack_size);
      setCapacity(suggestion);
      setBuffer(Math.max(1, Math.floor(suggestion / 5)));
    }
  }, [product, capacity]);

  const save = async () => {
    if (!product) return;
    setSaving(true);
    setError(null);
    try {
      await request(`${API_V1}/shelves/rows/${rowId}/allocation`, {
        method: "PUT",
        body: {
          sku: product.sku,
          capacity: capacity === "" ? null : capacity,
          buffer_threshold: buffer === "" ? null : buffer,
          slotting_fee: fee,
        },
      });
      onAssigned(product.name);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save this row.");
    } finally {
      setSaving(false);
    }
  };

  if (assigned) {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-brand-soft p-3">
        <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
          {position}
        </span>
        <Check className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 truncate text-sm font-semibold">{assigned}</span>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-secondary p-3.5">
      <div className="mb-2.5 flex items-center gap-2.5">
        <span className="tabular flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
          {position}
        </span>
        <span className="text-sm font-semibold">Row {position}</span>
      </div>

      <div className="space-y-2.5">
        <ProductPicker
          value={product}
          onChange={(chosen) => {
            setProduct(chosen);
            setCapacity("");
            setBuffer("");
          }}
          placeholder="Search the inventory system…"
        />

        {product ? (
          <>
            <div className="grid grid-cols-3 gap-2.5">
              <Field label="Pack size" hint="From the inventory system">
                <input
                  value={product.pack_size ?? "—"}
                  readOnly
                  className={cn(inputClass, "cursor-not-allowed opacity-70")}
                />
              </Field>
              <Field label="How many fit?" hint="A full row">
                <input
                  type="number"
                  min={1}
                  value={capacity}
                  onChange={(event) => setCapacity(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
              <Field label="Refill at" hint="Tell staff below this">
                <input
                  type="number"
                  min={0}
                  value={buffer}
                  onChange={(event) => setBuffer(Number(event.target.value))}
                  className={inputClass}
                />
              </Field>
            </div>

            <Field label="Slotting fee" hint="What the brand paid for this row (optional)">
              <input
                type="number"
                min={0}
                value={fee}
                onChange={(event) => setFee(Number(event.target.value))}
                className={inputClass}
              />
            </Field>

            {typeof capacity === "number" && typeof buffer === "number" && buffer >= capacity ? (
              <p className="rounded-xl bg-warning/12 px-3 py-2 text-xs text-warning">
                The refill point must be below the capacity, or the row counts as empty the
                moment it is filled.
              </p>
            ) : null}

            {error ? (
              <p className="rounded-xl bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </p>
            ) : null}

            <Button size="sm" className="w-full" onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : null}
              Save row {position}
            </Button>
          </>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Facings per row from the pack label.
 *
 * Mirrors the server's suggestion so the manager sees a number the moment a
 * product is chosen rather than after a round trip. The server decides for real
 * when the allocation is saved; this only fills the box.
 */
export function suggestCapacity(packSize?: string | null): number {
  if (!packSize) return 20;
  const match = /([\d.]+)\s*(kg|g|l|ml)/i.exec(packSize);
  if (!match) return 20;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return 20;
  const scale: Record<string, number> = { kg: 1, l: 1, g: 0.001, ml: 0.001 };
  const unit = scale[(match[2] ?? "").toLowerCase()] ?? 1;
  // "6 x 200 ml" — multiply by the pack count where one is written.
  const multiple = /^\s*(\d+)\s*[x*]/i.exec(packSize);
  const packs = multiple ? Number(multiple[1]) : 1;
  const weight = amount * unit * (Number.isFinite(packs) ? packs : 1);

  for (const [limit, facings] of [
    [0.06, 60],
    [0.15, 45],
    [0.35, 30],
    [0.75, 20],
    [1.5, 14],
    [3, 10],
    [6, 6],
  ] as const) {
    if (weight <= limit) return facings;
  }
  return 4;
}

const inputClass =
  "w-full rounded-xl bg-card px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-label mb-1.5 block text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
