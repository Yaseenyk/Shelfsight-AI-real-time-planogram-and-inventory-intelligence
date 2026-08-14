import { describe, expect, it } from "vitest";

import {
  COMPLIANCE_PHRASE,
  DISCREPANCY_PHRASE,
  EXPIRY_PHRASE,
  FRESHNESS_PHRASE,
  SEVERITY_PHRASE,
  TONE_STYLES,
  countSentence,
  expirySentence,
  layoutVerdict,
  shelfVerdict,
  type Phrase,
} from "@/lib/plain-language";

/**
 * These are copy, not just code.
 *
 * Every string here is read by someone deciding whether to throw away stock or
 * refill a shelf, so the tests assert the properties that make the wording
 * trustworthy — that a bad state never reads as reassuring, that instructions
 * exist wherever action is required, and that the vocabulary stays consistent
 * across screens. A regression in this file is a regression in what a person is
 * told to do.
 */

const ALL_PHRASES: Array<[string, Record<string, Phrase>]> = [
  ["discrepancy", DISCREPANCY_PHRASE],
  ["compliance", COMPLIANCE_PHRASE],
  ["freshness", FRESHNESS_PHRASE],
  ["expiry", EXPIRY_PHRASE],
  ["severity", SEVERITY_PHRASE],
];

describe("phrase vocabulary", () => {
  it.each(ALL_PHRASES)("%s phrases all carry a label and a known tone", (_name, table) => {
    for (const [key, phrase] of Object.entries(table)) {
      expect(phrase.label, key).toBeTruthy();
      expect(["good", "warn", "bad", "neutral"]).toContain(phrase.tone);
    }
  });

  it.each(ALL_PHRASES)("%s labels avoid jargon the reader would not know", (_name, table) => {
    // The exact terms this vocabulary exists to replace.
    const jargon = /planogram|SKU|phantom|compliance|OCR|spatial|IoU|softmax|inference/i;
    for (const [key, phrase] of Object.entries(table)) {
      expect(phrase.label, `${key}: "${phrase.label}"`).not.toMatch(jargon);
      if (phrase.action) {
        expect(phrase.action, `${key}: "${phrase.action}"`).not.toMatch(jargon);
      }
    }
  });

  it("gives every actionable problem an instruction", () => {
    // A "good" state needs no instruction; anything wrong must say what to do,
    // otherwise the screen reports a problem and abandons the reader with it.
    for (const [name, table] of ALL_PHRASES) {
      for (const [key, phrase] of Object.entries(table)) {
        if (phrase.tone === "bad" || phrase.tone === "warn") {
          // Severity phrases label urgency rather than a specific fault, so the
          // instruction belongs to the alert itself, not the badge.
          if (name === "severity") continue;
          expect(phrase.action, `${name}.${key} has no action`).toBeTruthy();
        }
      }
    }
  });

  it("never describes a bad state with a good tone", () => {
    expect(DISCREPANCY_PHRASE.phantom.tone).toBe("bad");
    expect(COMPLIANCE_PHRASE.missing.tone).toBe("bad");
    expect(FRESHNESS_PHRASE.spoiled.tone).toBe("bad");
    expect(EXPIRY_PHRASE.expired.tone).toBe("bad");
    expect(SEVERITY_PHRASE.critical.tone).toBe("bad");
  });

  it("marks unreadable input as neutral, not as a failure state", () => {
    // "We could not read this" is not the same as "this is expired"; colouring
    // it red would send someone to discard perfectly good stock.
    expect(EXPIRY_PHRASE.unreadable.tone).toBe("neutral");
    expect(EXPIRY_PHRASE.unreadable.action).toMatch(/by hand/i);
  });

  it("defines styles for every tone", () => {
    for (const tone of ["good", "warn", "bad", "neutral"] as const) {
      expect(TONE_STYLES[tone].chip).toBeTruthy();
      expect(TONE_STYLES[tone].dot).toBeTruthy();
      expect(TONE_STYLES[tone].panel).toBeTruthy();
    }
  });
});

describe("countSentence", () => {
  it("states plainly when nothing is on the shelf", () => {
    expect(countSentence(0, 18)).toBe("18 should be here. None found.");
  });

  it("distinguishes running low from empty", () => {
    expect(countSentence(4, 18)).toBe("18 should be here. Only 4 found.");
  });

  it("reports a surplus without implying a shortage", () => {
    expect(countSentence(22, 18)).toBe("18 should be here. 22 found.");
  });

  it("confirms a correct count", () => {
    expect(countSentence(18, 18)).toBe("18 on the shelf. Correct.");
  });

  it("handles the both-zero case as correct rather than missing", () => {
    // Nothing expected and nothing present is not a problem to report.
    expect(countSentence(0, 0)).toBe("0 on the shelf. Correct.");
  });

  it("never emits a delta symbol or bare arithmetic", () => {
    for (const [detected, expected] of [[0, 5], [3, 5], [9, 5], [5, 5]]) {
      expect(countSentence(detected!, expected!)).not.toMatch(/[Δ·]|-\d/);
    }
  });
});

describe("expirySentence", () => {
  it("returns nothing when there is no date to describe", () => {
    expect(expirySentence(null)).toBeUndefined();
    expect(expirySentence(undefined)).toBeUndefined();
  });

  it("uses the past tense once the date has gone", () => {
    expect(expirySentence(-5)).toBe("The date passed 5 days ago.");
    expect(expirySentence(-1)).toBe("The date passed yesterday.");
  });

  it("treats today as its own case", () => {
    expect(expirySentence(0)).toBe("The date passes today.");
  });

  it("singularises one day", () => {
    expect(expirySentence(1)).toBe("1 day left.");
    expect(expirySentence(2)).toBe("2 days left.");
  });

  it("never shows a negative number to the reader", () => {
    for (const days of [-1, -2, -30, -365]) {
      expect(expirySentence(days)).not.toMatch(/-\d/);
    }
  });
});

describe("shelfVerdict", () => {
  it("reassures when there is nothing to do", () => {
    const verdict = shelfVerdict(0);
    expect(verdict.tone).toBe("good");
    expect(verdict.label).toMatch(/good/i);
  });

  it("singularises a lone problem", () => {
    expect(shelfVerdict(1).label).toBe("1 thing needs your attention");
  });

  it("escalates tone as problems accumulate", () => {
    expect(shelfVerdict(2).tone).toBe("warn");
    expect(shelfVerdict(9).tone).toBe("bad");
  });

  it("always tells the reader where to start", () => {
    for (const count of [0, 1, 3, 12]) {
      expect(shelfVerdict(count).action).toBeTruthy();
    }
  });
});

describe("layoutVerdict", () => {
  it("explains rather than blames when no plan is loaded", () => {
    const verdict = layoutVerdict(0, 0);
    expect(verdict.tone).toBe("neutral");
    expect(verdict.action).toMatch(/ask/i);
  });

  it("confirms a fully correct shelf", () => {
    expect(layoutVerdict(0, 12).tone).toBe("good");
  });

  it("counts wrong spaces instead of reporting a percentage", () => {
    // "92.3% compliance" needs converting into an action before it means
    // anything; a count of wrong spaces already is the action.
    expect(layoutVerdict(1, 12).label).toBe("1 space is wrong");
    expect(layoutVerdict(3, 12).label).toBe("3 spaces are wrong");
    expect(layoutVerdict(3, 12).label).not.toMatch(/%/);
  });

  it("escalates only when a large share of the shelf is wrong", () => {
    expect(layoutVerdict(2, 20).tone).toBe("warn");
    expect(layoutVerdict(10, 20).tone).toBe("bad");
  });
});
