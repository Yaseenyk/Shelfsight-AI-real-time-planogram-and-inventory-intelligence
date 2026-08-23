"use client";

import { Camera, Check, CheckCircle2, Loader2, RotateCcw, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { API_V1, request } from "@/lib/api/client";
import { sectionIcon } from "@/lib/product-icons";
import { cn, formatNumber } from "@/lib/utils";

interface Fill {
  id: number;
  shelf_code: string;
  shelf_name: string;
  location: string | null;
  status: "reported" | "camera_confirmed" | "approved" | "sent_back";
  reported_by: string | null;
  reported_at: string;
  rows_to_fill: number;
  units_to_bring: number;
  rows_confirmed: number | null;
  rows_checked: number | null;
  decided_by: string | null;
  decided_at: string | null;
  note: string | null;
}

/**
 * What a manager does when staff say a rack is filled.
 *
 * The loop used to stop dead here: somebody could be told exactly what to put
 * where, do it, and there was no way to say so and no way for anyone to know.
 * A plan nobody closes is a plan that keeps proposing work already done.
 *
 * The camera does the checking. A claim that a photograph has backed up is a
 * one-tap approval and sits at the top; a claim the photograph contradicts
 * shows how far off it was — "3 of 6 rows stocked" — so the decision is made on
 * evidence rather than on how much the manager trusts the person. That is the
 * whole reason this is worth having over a WhatsApp message.
 */
export default function ApprovalsPage() {
  const [waiting, setWaiting] = useState<Fill[]>([]);
  const [recent, setRecent] = useState<Fill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [pending, done] = await Promise.all([
        request<Fill[]>(`${API_V1}/shelves/fills/waiting`),
        request<Fill[]>(`${API_V1}/shelves/fills/recent`),
      ]);
      setWaiting(pending);
      setRecent(done.filter((fill) => fill.decided_at !== null).slice(0, 8));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load the reports.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const decide = async (id: number, action: () => Promise<unknown>) => {
    setBusy(id);
    setError(null);
    try {
      await action();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <PageShell title="Check work" subtitle="Racks staff have reported filled">
      {error ? (
        <p className="shrink-0 rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      {isLoading ? (
        <Loader2 className="m-auto h-6 w-6 animate-spin text-muted-foreground" />
      ) : (
        <div className="scroll-slim min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <section className="rounded-2xl bg-card p-4">
            <h2 className="text-label mb-3 text-muted-foreground">
              {waiting.length === 0
                ? "Nothing waiting"
                : `${waiting.length} waiting for you`}
            </h2>

            {waiting.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-success" aria-hidden />
                <p className="text-sm font-semibold">All caught up</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Reports appear here as soon as somebody finishes a rack.
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {waiting.map((fill) => (
                  <WaitingCard
                    key={fill.id}
                    fill={fill}
                    busy={busy === fill.id}
                    onApprove={() =>
                      decide(fill.id, () =>
                        request(`${API_V1}/shelves/fills/${fill.id}/approve`, { method: "POST" }),
                      )
                    }
                    onSendBack={(note) =>
                      decide(fill.id, () =>
                        request(`${API_V1}/shelves/fills/${fill.id}/send-back`, {
                          method: "POST",
                          body: { note },
                        }),
                      )
                    }
                  />
                ))}
              </ul>
            )}
          </section>

          {recent.length > 0 ? (
            <section className="rounded-2xl bg-card p-4">
              <h2 className="text-label mb-3 text-muted-foreground">Lately</h2>
              <ul className="space-y-1.5">
                {recent.map((fill) => (
                  <li
                    key={fill.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {fill.shelf_name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {fill.reported_by ?? "somebody"} → {fill.decided_by ?? "—"}
                        {fill.note ? ` · “${fill.note}”` : ""}
                      </span>
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide",
                        fill.status === "approved"
                          ? "bg-brand text-brand-foreground"
                          : "bg-warning/20 text-warning",
                      )}
                    >
                      {fill.status === "approved" ? "Approved" : "Sent back"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      )}
    </PageShell>
  );
}

function WaitingCard({
  fill,
  busy,
  onApprove,
  onSendBack,
}: {
  fill: Fill;
  busy: boolean;
  onApprove: () => void;
  onSendBack: (note: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");

  const confirmed = fill.status === "camera_confirmed";
  const checked = fill.rows_checked !== null;

  return (
    <li className={cn("rounded-xl p-3.5", confirmed ? "bg-brand-soft" : "bg-secondary")}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{fill.shelf_name}</p>
          <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-muted-foreground">
            <span aria-hidden>{sectionIcon(fill.location)}</span>
            {fill.location ?? fill.shelf_code} · {fill.reported_by ?? "somebody"} ·{" "}
            {new Date(fill.reported_at).toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>

          {/* The evidence, said plainly. This is the difference between this
              screen and taking somebody's word for it. */}
          <p
            className={cn(
              "mt-2 flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
              confirmed
                ? "bg-card text-foreground"
                : checked
                  ? "bg-warning/15 text-warning"
                  : "bg-card text-muted-foreground",
            )}
          >
            <Camera className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {confirmed
              ? `Camera checked it — all ${fill.rows_checked} shelves stocked`
              : checked
                ? `Camera found only ${fill.rows_confirmed} of ${fill.rows_checked} shelves stocked`
                : "No photo taken since — approving takes their word for it"}
          </p>

          <p className="tabular mt-1.5 text-xs text-muted-foreground">
            asked for {formatNumber(fill.units_to_bring)} things across {fill.rows_to_fill} shelves
          </p>
        </div>

        <div className="flex shrink-0 flex-col gap-1.5">
          <Button size="sm" onClick={onApprove} disabled={busy}>
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Check className="h-3.5 w-3.5" aria-hidden />
            )}
            Approve
          </Button>
          {!rejecting ? (
            <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={busy}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Send back
            </Button>
          ) : null}
        </div>
      </div>

      {rejecting ? (
        <div className="mt-3 border-t border-border pt-3">
          <label className="block">
            <span className="text-label mb-1.5 block text-muted-foreground">
              What is wrong with it?
            </span>
            <input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Row 2 is still empty"
              autoFocus
              className="w-full rounded-xl bg-card px-3.5 py-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
          <div className="mt-2 flex gap-1.5">
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onSendBack(note)}
              disabled={busy || !note.trim()}
            >
              Send it back
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRejecting(false);
                setNote("");
              }}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
