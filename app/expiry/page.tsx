"use client";

import { CalendarClock, CalendarX, Timer } from "lucide-react";
import { useState } from "react";

import { CapturePanel } from "@/components/dashboard/capture-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { Verdict } from "@/components/dashboard/verdict";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpiryBadge } from "@/components/ui/status";
import { expiry } from "@/lib/api/endpoints";
import { useAction, useApi } from "@/lib/hooks/use-api";
import { EXPIRY_PHRASE, expirySentence } from "@/lib/plain-language";
import { formatDate, formatLatency, formatNumber } from "@/lib/utils";

const SAMPLE_TEXTS = "EXP 12/09/2026\nBEST BEFORE: 3O NOV 2O26\nUSE BY 2026-08-10\nBB 20260818";

export default function ExpiryPage() {
  const summary = useApi(expiry.summary);
  const [texts, setTexts] = useState(SAMPLE_TEXTS);

  const extract = useAction((file: File) => expiry.extract(file));
  const parse = useAction((raw: string) =>
    expiry.parse({
      texts: raw
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      persist: false,
    }),
  );

  const data = summary.data;
  const results = extract.data ?? parse.data;
  const best = extract.data?.best;

  return (
    <PageShell
      title="Expiry dates"
      subtitle="Take a photo of the date printed on a packet"
    >
      {/* The date and what to do about it, before any of the OCR detail. */}
      {best ? (
        <Verdict
          phrase={EXPIRY_PHRASE[best.status]}
          detail={
            [formatDate(best.parsed_date), expirySentence(best.days_remaining)]
              .filter(Boolean)
              .join(" · ") || undefined
          }
        />
      ) : null}

      <section className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Must be removed"
          value={formatNumber(data?.expired)}
          hint="The date has already passed"
          icon={CalendarX}
          tone={data && data.expired > 0 ? "critical" : "success"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Sell these first"
          value={formatNumber(data?.near_expiry)}
          hint="Expiring soon — good for a discount"
          icon={Timer}
          tone={data && data.near_expiry > 0 ? "warning" : "neutral"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Dates are fine"
          value={formatNumber(data?.valid)}
          hint="Nothing to do for these"
          icon={CalendarClock}
          tone="success"
          isLoading={summary.isLoading}
        />
      </section>

      <CapturePanel
        title="Read a date"
        description="Take a photo of the date on the packet. Hold the camera steady and close."
        actionLabel="Read this date"
        isPending={extract.isPending}
        error={extract.error}
        onSubmit={async (file) => {
          parse.reset();
          await extract.execute(file);
          await summary.refresh();
        }}
      />

      {results?.extractions.length ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">What we read</CardTitle>
            <CardDescription className="text-sm">
              {results.unreadable_count > 0
                ? `${results.unreadable_count} could not be read — check those packets by hand.`
                : "Every date was readable."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {results.extractions.map((item, index) => {
                const phrase = EXPIRY_PHRASE[item.status];
                const sentence = expirySentence(item.days_remaining);
                return (
                  <li
                    key={index}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
                  >
                    <div className="min-w-0">
                      <p className="tabular text-base font-medium">
                        {formatDate(item.parsed_date) || "No date found"}
                      </p>
                      {sentence ? (
                        <p className="text-sm text-muted-foreground">{sentence}</p>
                      ) : null}
                      {phrase.action ? (
                        <p className="mt-1 text-sm font-medium">→ {phrase.action}</p>
                      ) : null}
                    </div>
                    <ExpiryBadge value={item.status} />
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {/* Everything below is for whoever maintains the system, not shop staff.
          Collapsed by default so the working screen stays a single decision, but
          kept because it is what makes the OCR stage demonstrable. */}
      <details className="rounded-xl border border-border bg-card">
        <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-muted-foreground">
          Technical detail (for whoever maintains this system)
        </summary>

        <div className="space-y-5 border-t border-border p-5">
          {extract.data ? (
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                OCR variant <span className="font-mono">{extract.data.variant_used ?? "—"}</span> of{" "}
                {extract.data.variants_tried.length} tried · {formatLatency(extract.data.ocr_ms)}
              </p>
              {extract.data.raw_text ? (
                <p className="font-mono text-xs">
                  raw: {extract.data.raw_text.replace(/\n/g, " ⏎ ")}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-3">
            <p className="text-sm font-medium">
              Parser sandbox — test date normalisation without OCR, one string per line
            </p>
            <textarea
              value={texts}
              onChange={(event) => setTexts(event.target.value)}
              rows={5}
              spellCheck={false}
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Candidate expiry strings"
            />
            {parse.error ? (
              <p className="text-xs text-destructive">{parse.error.message}</p>
            ) : null}
            <Button
              size="sm"
              disabled={parse.isPending}
              onClick={() => {
                extract.reset();
                void parse.execute(texts);
              }}
            >
              Parse {texts.split("\n").filter((line) => line.trim()).length} strings
            </Button>
          </div>

          {results?.extractions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-muted-foreground">
                  <tr className="border-b border-border">
                    <th className="py-2 pr-3 font-medium">Raw OCR</th>
                    <th className="py-2 pr-3 font-medium">Normalised</th>
                    <th className="py-2 pr-3 font-medium">Pattern</th>
                    <th className="py-2 pr-3 font-medium">Parsed</th>
                    <th className="py-2 pr-3 text-right font-medium">Days left</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {results.extractions.map((item, index) => (
                    <tr key={index} className="border-b border-border/60 last:border-0">
                      <td className="py-2 pr-3 font-mono">{item.raw_text ?? "—"}</td>
                      <td className="py-2 pr-3 font-mono text-muted-foreground">
                        {item.normalized_text || "—"}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {item.matched_pattern ?? "—"}
                      </td>
                      <td className="py-2 pr-3">{formatDate(item.parsed_date)}</td>
                      <td className="py-2 pr-3 text-right">{item.days_remaining ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </details>
    </PageShell>
  );
}
