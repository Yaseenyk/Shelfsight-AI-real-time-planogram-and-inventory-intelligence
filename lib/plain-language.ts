/**
 * Plain-language vocabulary for the whole dashboard.
 *
 * The people using this are shop-floor staff, not analysts. Every phrase here
 * replaces a technical term that means nothing to them:
 *
 *   "phantom SKU"        -> "Nothing left on shelf"
 *   "planogram"          -> "Shelf layout"
 *   "spatial compliance" -> "Is everything in the right place?"
 *   "OCR"                -> "Reading dates from packets"
 *
 * Two rules this file exists to enforce:
 * 1. **One definition per concept.** The same status must read identically on
 *    every screen, or the reader learns two names for one thing.
 * 2. **Say what to do, not what happened.** "18 missing" is a fact; "Check the
 *    stockroom for Bisleri water" is an instruction someone can act on.
 *
 * The technical terms still exist in the API and the paper — this is a
 * presentation layer, not a rename of the domain model.
 */

import type {
  ComplianceStatus,
  DiscrepancyType,
  ExpiryStatus,
  FreshnessLabel,
  Severity,
} from "@/lib/types/api";

export type Tone = "good" | "warn" | "bad" | "neutral";

export interface Phrase {
  /** Short label for a chip or heading. */
  label: string;
  /** One sentence a person can act on. */
  action?: string;
  tone: Tone;
}

export const DISCREPANCY_PHRASE: Record<DiscrepancyType, Phrase> = {
  match: { label: "Correct", tone: "good" },
  phantom: {
    label: "Nothing on shelf",
    action: "Check the stockroom and refill this shelf",
    tone: "bad",
  },
  undercount: {
    label: "Running low",
    action: "Add more from the stockroom",
    tone: "warn",
  },
  overcount: {
    label: "Too many",
    action: "Count again and update the stock record",
    tone: "warn",
  },
};

export const COMPLIANCE_PHRASE: Record<ComplianceStatus, Phrase> = {
  compliant: { label: "In the right place", tone: "good" },
  misplaced: { label: "Wrong product here", action: "Move it to its own space", tone: "warn" },
  missing: { label: "Empty space", action: "Refill this space", tone: "bad" },
  extra: { label: "Should not be here", action: "Move this item away", tone: "warn" },
};

export const FRESHNESS_PHRASE: Record<FreshnessLabel, Phrase> = {
  fresh: { label: "Fresh", tone: "good" },
  ripening: { label: "Getting ripe", action: "Sell soon or reduce the price", tone: "warn" },
  spoiled: { label: "Spoiled", action: "Remove from the shelf now", tone: "bad" },
};

export const EXPIRY_PHRASE: Record<ExpiryStatus, Phrase> = {
  valid: { label: "Date is fine", tone: "good" },
  near_expiry: { label: "Expiring soon", action: "Sell first or reduce the price", tone: "warn" },
  expired: { label: "Date has passed", action: "Remove from the shelf now", tone: "bad" },
  unreadable: { label: "Date not clear", action: "Check the packet by hand", tone: "neutral" },
};

export const SEVERITY_PHRASE: Record<Severity, Phrase> = {
  info: { label: "For information", tone: "neutral" },
  warning: { label: "Needs a look", tone: "warn" },
  critical: { label: "Do this first", tone: "bad" },
};

/** Tailwind classes per tone — kept here so colour and wording stay paired. */
export const TONE_STYLES: Record<Tone, { chip: string; dot: string; panel: string }> = {
  // Panels are borderless tinted surfaces: on a grey page ground the tint alone
  // separates them, and a border on top makes the screen look boxed-in.
  good: {
    chip: "bg-brand text-brand-foreground",
    dot: "bg-success",
    // The all-clear panel is the signature lime, so "nothing is wrong" is the
    // most recognisable state on the screen.
    panel: "bg-brand text-brand-foreground",
  },
  warn: {
    chip: "bg-warning/15 text-warning",
    dot: "bg-warning",
    panel: "bg-warning/12",
  },
  bad: {
    chip: "bg-destructive/12 text-destructive",
    dot: "bg-destructive",
    panel: "bg-destructive/10",
  },
  neutral: {
    chip: "bg-secondary text-muted-foreground",
    dot: "bg-muted-foreground",
    panel: "bg-secondary",
  },
};

/**
 * Turn a stock count into a sentence rather than a table row.
 * "18 should be here. None found." beats "detected 0 · system 18 · Δ -18".
 */
export function countSentence(detected: number, expected: number): string {
  if (detected === 0 && expected > 0) {
    return `${expected} should be here. None found.`;
  }
  if (detected < expected) {
    return `${expected} should be here. Only ${detected} found.`;
  }
  if (detected > expected) {
    return `${expected} should be here. ${detected} found.`;
  }
  return `${detected} on the shelf. Correct.`;
}

/**
 * Turn a days-remaining count into a sentence.
 * "Expired 5 days ago" and "3 days left" both beat a bare "-5" or "3".
 */
export function expirySentence(days: number | null | undefined): string | undefined {
  if (days === null || days === undefined) return undefined;
  if (days < -1) return `The date passed ${Math.abs(days)} days ago.`;
  if (days === -1) return "The date passed yesterday.";
  if (days === 0) return "The date passes today.";
  if (days === 1) return "1 day left.";
  return `${days} days left.`;
}

/**
 * Verdict for a shelf-layout check.
 *
 * Deliberately counts *spaces that are wrong* rather than reporting a
 * percentage. "92.3% compliance" needs converting into an action before it
 * means anything; "2 spaces are wrong" is already the action.
 */
export function layoutVerdict(problems: number, total: number): Phrase {
  if (total === 0) {
    return {
      label: "No shelf plan loaded",
      action: "Ask whoever set this up to add your shelf plan",
      tone: "neutral",
    };
  }
  if (problems === 0) {
    return { label: "Everything is in the right place", tone: "good" };
  }
  return {
    label: problems === 1 ? "1 space is wrong" : `${problems} spaces are wrong`,
    action: "Look for the red and orange spaces below",
    tone: problems > total / 4 ? "bad" : "warn",
  };
}

/** Overall shelf verdict, used by the big banner at the top of the home page. */
export function shelfVerdict(problems: number): Phrase {
  if (problems === 0) {
    return { label: "Everything looks good", action: "No action needed right now", tone: "good" };
  }
  if (problems === 1) {
    return { label: "1 thing needs your attention", action: "See the list below", tone: "warn" };
  }
  return {
    label: `${problems} things need your attention`,
    action: "Start with the red ones",
    tone: problems > 3 ? "bad" : "warn",
  };
}
