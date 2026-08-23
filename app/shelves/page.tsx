"use client";

import { LayoutList, Loader2, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import {
  ProductPicker,
  type CatalogueProduct,
} from "@/components/catalogue/product-picker";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

interface Allocation {
  sku: string;
  product_name: string | null;
  capacity: number;
  buffer_threshold: number;
  slotting_fee: number;
}

interface Row {
  id: number;
  position: number;
  label: string | null;
  /** What the camera counted. Null means nobody has looked at this row yet. */
  last_counted: number | null;
  last_counted_at: string | null;
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

/**
 * Shelf design, for the manager.
 *
 * The rows are drawn stacked as they sit in the real bay -- row 1 at the top --
 * rather than as a table. A manager standing in front of the shelf is matching
 * what they see to what is on screen, and a list of ids does not support that.
 *
 * Each row shows its fill as a bar, so "nearly empty" is visible without
 * reading a number, and the refill point is marked on the same bar so the two
 * quantities are compared where they are set rather than in the manager's head.
 */
export default function ShelvesPage() {
  const { can } = useAuth();
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [allocatingRow, setAllocatingRow] = useState<Row | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      // The catalogue is no longer something to download: it holds thousands
      // of products, so the allocation dialog searches it instead.
      const shelfList = await request<Shelf[]>(`${API_V1}/shelves`);
      setShelves(shelfList);
      setSelectedId((current) => current ?? shelfList[0]?.id ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load shelves.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = shelves.find((shelf) => shelf.id === selectedId) ?? null;

  return (
    <PageShell title="Shelves" subtitle="Design a shelf and decide what goes on each row">
      {error ? (
        <p className="shrink-0 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {/* Two columns that scroll independently: a shop with two hundred shelves
          must not push the rows of the one being edited off the screen. */}
      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-5">
        {/* ------------------------------------------------------- shelf list */}
        <div className="flex min-h-0 flex-col lg:col-span-2">
          <div className="flex min-h-0 flex-col rounded-2xl bg-card p-4">
            <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
              <h2 className="text-label text-muted-foreground">Your shelves</h2>
              {can("shelf:create") ? (
                <Button size="sm" onClick={() => setCreating(true)}>
                  <Plus className="h-3.5 w-3.5" aria-hidden />
                  New shelf
                </Button>
              ) : null}
            </div>

            {isLoading ? (
              <p className="m-auto text-center text-sm text-muted-foreground">
                <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
              </p>
            ) : shelves.length === 0 ? (
              <div className="m-auto text-center">
                <LayoutList className="mx-auto mb-2 h-8 w-8 text-muted-foreground" aria-hidden />
                <p className="text-sm font-medium">No shelves yet</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {can("shelf:create")
                    ? "Create one to start assigning products to rows."
                    : "A manager needs to create one first."}
                </p>
              </div>
            ) : (
              <ul className="scroll-slim min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                {shelves.map((shelf) => {
                  const allocated = shelf.rows.filter((row) => row.allocation).length;
                  return (
                    <li key={shelf.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedId(shelf.id)}
                        className={cn(
                          "w-full rounded-xl px-3.5 py-3 text-left transition-colors",
                          shelf.id === selectedId
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary hover:bg-accent",
                        )}
                      >
                        <p className="text-sm font-semibold">{shelf.name}</p>
                        <p
                          className={cn(
                            "mt-0.5 text-xs",
                            shelf.id === selectedId ? "opacity-70" : "text-muted-foreground",
                          )}
                        >
                          {shelf.code} · {allocated} of {shelf.rows.length} rows assigned
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* ------------------------------------------------------ shelf detail */}
        <div className="scroll-slim min-h-0 overflow-y-auto pr-1 lg:col-span-3">
          {selected ? (
            <ShelfDetail
              shelf={selected}
              canEdit={can("shelf:allocate")}
              onAllocate={setAllocatingRow}
              onChanged={load}
            />
          ) : (
            <div className="rounded-2xl bg-card p-8 text-center text-sm text-muted-foreground">
              Pick a shelf to see its rows.
            </div>
          )}
        </div>
      </div>

      {creating ? (
        <CreateShelfDialog
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void load();
          }}
        />
      ) : null}

      {allocatingRow ? (
        <AllocateDialog
          row={allocatingRow}
          onClose={() => setAllocatingRow(null)}
          onSaved={() => {
            setAllocatingRow(null);
            void load();
          }}
        />
      ) : null}
    </PageShell>
  );
}

/** The bay, drawn as it stands: row 1 at the top. */
function ShelfDetail({
  shelf,
  canEdit,
  onAllocate,
  onChanged,
}: {
  shelf: Shelf;
  canEdit: boolean;
  onAllocate: (row: Row) => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<number | null>(null);

  const clear = async (row: Row) => {
    setBusy(row.id);
    try {
      await request(`${API_V1}/shelves/rows/${row.id}/allocation`, { method: "DELETE" });
      onChanged();
    } catch (caught) {
      window.alert(caught instanceof Error ? caught.message : "Could not clear the row.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="rounded-2xl bg-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-bold">{shelf.name}</h2>
        <p className="text-xs text-muted-foreground">
          {shelf.code}
          {shelf.location ? ` · ${shelf.location}` : ""} · {shelf.rows.length} rows
        </p>
      </div>

      <div className="space-y-2.5">
        {shelf.rows.map((row) => (
          <RowCard
            key={row.id}
            row={row}
            canEdit={canEdit}
            busy={busy === row.id}
            onAllocate={() => onAllocate(row)}
            onClear={() => void clear(row)}
          />
        ))}
      </div>
    </div>
  );
}

function RowCard({
  row,
  canEdit,
  busy,
  onAllocate,
  onClear,
}: {
  row: Row;
  canEdit: boolean;
  busy: boolean;
  onAllocate: () => void;
  onClear: () => void;
}) {
  const allocation = row.allocation;
  // The fill bar is the last camera count, not a stored quantity: nothing here
  // puts stock on a shelf, so a photograph is the only thing that knows.
  const counted = row.last_counted;
  const scanned = counted !== null;
  const fill = allocation && scanned ? Math.min(100, (counted / allocation.capacity) * 100) : 0;
  // The refill point drawn on the same bar as the fill, so the two numbers are
  // compared where they are set rather than in the manager's head.
  const bufferMark = allocation
    ? Math.min(100, (allocation.buffer_threshold / allocation.capacity) * 100)
    : 0;

  return (
    <div className="rounded-xl bg-secondary p-3.5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-[11px] font-bold text-primary-foreground">
              {row.position}
            </span>
            {allocation ? (
              <span className="truncate text-sm font-semibold">{allocation.product_name}</span>
            ) : (
              <span className="text-sm text-muted-foreground">Not assigned yet</span>
            )}
            {row.needs_restock && allocation ? (
              <span className="rounded-full bg-destructive/12 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-destructive">
                Refill
              </span>
            ) : null}
          </div>

          {allocation ? (
            <>
              <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-card">
                <span
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-full transition-all",
                    row.needs_restock ? "bg-destructive" : "bg-brand",
                  )}
                  style={{ width: `${fill}%` }}
                />
                <span
                  className="absolute inset-y-0 w-px bg-foreground/40"
                  style={{ left: `${bufferMark}%` }}
                  title={`Refill at ${allocation.buffer_threshold}`}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {scanned ? (
                  <>
                    <span className="tabular font-semibold text-foreground">{counted}</span> counted
                    of <span className="tabular">{allocation.capacity}</span>
                  </>
                ) : (
                  // Never photographed is a different state from empty, and
                  // showing "0 of 40" for it would invent a finding.
                  <span className="italic">Not checked yet</span>
                )}
                {" · refill at "}
                <span className="tabular">{allocation.buffer_threshold}</span>
                {allocation.slotting_fee > 0
                  ? ` · slotting ₹${allocation.slotting_fee.toLocaleString("en-IN")}`
                  : ""}
              </p>
            </>
          ) : null}
        </div>

        {canEdit ? (
          <div className="flex shrink-0 gap-1.5">
            <Button size="sm" variant={allocation ? "outline" : "default"} onClick={onAllocate}>
              {allocation ? "Change" : "Assign product"}
            </Button>
            {allocation ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClear}
                disabled={busy}
                aria-label="Clear this row"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                )}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-bold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function CreateShelfDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [rowCount, setRowCount] = useState(4);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await request(`${API_V1}/shelves`, {
        method: "POST",
        body: { code, name, location: location || null, row_count: rowCount },
      });
      onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create the shelf.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title="New shelf" onClose={onClose}>
      <div className="space-y-3">
        <Field label="Short code" hint="Used on labels, e.g. AISLE3-BAY2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
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
        <Field label="Where is it?" hint="Optional">
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className={inputClass}
            placeholder="Front of store, left side"
          />
        </Field>
        <Field label="How many rows?" hint="The number of shelves in this bay">
          <input
            type="number"
            min={1}
            max={12}
            value={rowCount}
            onChange={(event) => setRowCount(Number(event.target.value))}
            className={inputClass}
          />
        </Field>

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <Button className="w-full" onClick={() => void save()} disabled={saving || !code || !name}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Create shelf with {rowCount} rows
        </Button>
      </div>
    </Dialog>
  );
}

function AllocateDialog({
  row,
  onClose,
  onSaved,
}: {
  row: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [chosen, setChosen] = useState<CatalogueProduct | null>(null);
  const [capacity, setCapacity] = useState<number | "">(row.allocation?.capacity ?? "");
  const [buffer, setBuffer] = useState<number | "">(row.allocation?.buffer_threshold ?? "");
  const [fee, setFee] = useState<number>(row.allocation?.slotting_fee ?? 0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pre-fill from the product so the manager adjusts a sensible number rather
  // than inventing one. Only when untouched, so a typed value is never clobbered.
  useEffect(() => {
    if (chosen && capacity === "") {
      const suggested = chosen.units_per_row ?? 20;
      setCapacity(suggested);
      setBuffer(Math.max(1, Math.floor(suggested / 5)));
    }
  }, [chosen, capacity]);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await request(`${API_V1}/shelves/rows/${row.id}/allocation`, {
        method: "PUT",
        body: {
          sku: chosen?.sku,
          capacity: capacity === "" ? null : capacity,
          buffer_threshold: buffer === "" ? null : buffer,
          slotting_fee: fee,
        },
      });
      onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={`Row ${row.position} — assign a product`} onClose={onClose}>
      <div className="space-y-3">
        <Field
          label="Which product?"
          hint={
            row.allocation
              ? `Currently ${row.allocation.product_name}. Search to change it.`
              : undefined
          }
        >
          <ProductPicker
            value={chosen}
            onChange={(product) => {
              setChosen(product);
              setCapacity("");
              setBuffer("");
            }}
            autoFocus
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="How many fit?" hint="Full row">
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
            The refill point must be below the capacity, or the row counts as empty the moment it
            is filled.
          </p>
        ) : null}

        {error ? (
          <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        ) : null}

        <Button
          className="w-full"
          onClick={() => void save()}
          disabled={saving || !chosen}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          Save this row
        </Button>
      </div>
    </Dialog>
  );
}

const inputClass =
  "w-full rounded-xl bg-secondary px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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
      {hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}
