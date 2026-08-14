import { AlertTriangle, CheckCircle2, HelpCircle, XCircle, type LucideIcon } from "lucide-react";

import { TONE_STYLES, type Phrase, type Tone } from "@/lib/plain-language";
import { cn } from "@/lib/utils";

const TONE_ICON: Record<Tone, LucideIcon> = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
  neutral: HelpCircle,
};

/**
 * The answer, stated once and large, before any of the numbers behind it.
 *
 * Every analysis screen in this app used to lead with a row of metric tiles and
 * leave the reader to work out the conclusion — "spoilage rate 12.5%, mean
 * confidence 91.2%" requires interpreting two numbers before you know whether
 * to throw the fruit away. This states the conclusion in a sentence, adds the
 * instruction underneath, and lets the detail sit below where it belongs.
 *
 * `aria-live` matters here: results arrive after an upload finishes, so a screen
 * reader user gets no cue unless the region announces itself.
 */
export function Verdict({
  phrase,
  detail,
  className,
}: {
  phrase: Phrase;
  /** Optional supporting line — a count, a date, a product name. */
  detail?: string;
  className?: string;
}) {
  const Icon = TONE_ICON[phrase.tone];

  return (
    <section
      className={cn(
        "flex items-center gap-5 rounded-xl border p-6",
        TONE_STYLES[phrase.tone].panel,
        className,
      )}
      aria-live="polite"
    >
      <span
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-full",
          phrase.tone === "good" && "bg-success/20",
          phrase.tone === "warn" && "bg-warning/20",
          phrase.tone === "bad" && "bg-destructive/15",
          phrase.tone === "neutral" && "bg-muted",
        )}
      >
        <Icon
          className={cn(
            "h-9 w-9",
            phrase.tone === "good" && "text-success",
            phrase.tone === "warn" && "text-warning",
            phrase.tone === "bad" && "text-destructive",
            phrase.tone === "neutral" && "text-muted-foreground",
          )}
          aria-hidden
        />
      </span>

      <div className="min-w-0">
        <h2 className="text-2xl font-semibold leading-tight">{phrase.label}</h2>
        {phrase.action ? (
          <p className="mt-1 text-base font-medium">{phrase.action}</p>
        ) : null}
        {detail ? <p className="mt-1 text-sm text-muted-foreground">{detail}</p> : null}
      </div>
    </section>
  );
}
