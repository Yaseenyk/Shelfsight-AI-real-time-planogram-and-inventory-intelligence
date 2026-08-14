"use client";

import { CalendarClock, CalendarX, ScanLine, Timer } from "lucide-react";
import { useState } from "react";

import { CapturePanel } from "@/components/dashboard/capture-panel";
import { MetricCard } from "@/components/dashboard/metric-card";
import { PageShell } from "@/components/layout/page-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpiryBadge } from "@/components/ui/status";
import { expiry } from "@/lib/api/endpoints";
import { useAction, useApi } from "@/lib/hooks/use-api";
import { formatDate, formatNumber, formatPercent } from "@/lib/utils";

const SAMPLE_TEXTS = "EXP 12/09/2026\nBEST BEFORE: 3O NOV 2O26\nUSE BY 2026-08-10\nBB 20260818";

export default function ExpiryPage() {
  const summary = useApi(expiry.summary);
  const [texts, setTexts] = useState(SAMPLE_TEXTS);

  const extract = useAction((file: File) => expiry.extractImage(file));
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

  return (
    <PageShell
      title="Expiry Date Extraction"
      subtitle="Packaging OCR (EasyOCR) → regex normalisation → validity status"
    >
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Expired on shelf"
          value={formatNumber(data?.expired)}
          hint="Parsed date already in the past"
          icon={CalendarX}
          tone={data && data.expired > 0 ? "critical" : "success"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Near expiry"
          value={formatNumber(data?.near_expiry)}
          hint="Within the configured threshold"
          icon={Timer}
          tone={data && data.near_expiry > 0 ? "warning" : "neutral"}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Read rate"
          value={formatPercent(data?.read_rate, 1)}
          hint={`${formatNumber(data?.unreadable)} unreadable of ${formatNumber(data?.total_scanned)}`}
          icon={ScanLine}
          isLoading={summary.isLoading}
        />
        <MetricCard
          label="Valid"
          value={formatNumber(data?.valid)}
          hint="Within shelf life"
          icon={CalendarClock}
          tone="success"
          isLoading={summary.isLoading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <CapturePanel
          title="Packaging OCR"
          description="Reads the date panel, then normalises and classifies it."
          actionLabel="Extract date"
          isPending={extract.isPending}
          error={extract.error}
          onSubmit={async (file) => {
            parse.reset();
            await extract.execute(file);
            await summary.refresh();
          }}
        />

        <Card>
          <CardHeader>
            <CardTitle>Parser sandbox</CardTitle>
            <CardDescription>
              Test the normaliser without OCR — one candidate string per line.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <textarea
              value={texts}
              onChange={(event) => setTexts(event.target.value)}
              rows={6}
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
          </CardContent>
        </Card>
      </section>

      {results?.extractions.length ? (
        <Card>
          <CardHeader>
            <CardTitle>Extraction results</CardTitle>
            <CardDescription>
              {results.expired_count} expired · {results.near_expiry_count} near expiry ·{" "}
              {results.unreadable_count} unreadable
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Raw OCR</th>
                  <th className="py-2 pr-3 font-medium">Normalised</th>
                  <th className="py-2 pr-3 font-medium">Pattern</th>
                  <th className="py-2 pr-3 font-medium">Parsed</th>
                  <th className="py-2 pr-3 text-right font-medium">Days left</th>
                  <th className="py-2 font-medium">Status</th>
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
                    <td className="py-2">
                      <ExpiryBadge value={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </PageShell>
  );
}
