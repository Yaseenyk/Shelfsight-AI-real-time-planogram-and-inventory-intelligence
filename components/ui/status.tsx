import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  PackageX,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import {
  COMPLIANCE_PHRASE,
  DISCREPANCY_PHRASE,
  EXPIRY_PHRASE,
  FRESHNESS_PHRASE,
  SEVERITY_PHRASE,
  TONE_STYLES,
  type Phrase,
  type Tone,
} from "@/lib/plain-language";
import type {
  ComplianceStatus,
  DiscrepancyType,
  ExpiryStatus,
  FreshnessLabel,
  Severity,
} from "@/lib/types/api";
import { cn } from "@/lib/utils";

/**
 * Status is shown three ways at once — colour, icon and words — because any one
 * of them can fail its reader: colour fails under colour-blindness and on a
 * printed screenshot, icons are ambiguous without training, and words alone are
 * slow to scan. Together they work for everyone.
 */
const TONE_ICON: Record<Tone, LucideIcon> = {
  good: CheckCircle2,
  warn: AlertTriangle,
  bad: XCircle,
  neutral: HelpCircle,
};

export function StatusChip({
  phrase,
  icon,
  size = "default",
  className,
}: {
  phrase: Phrase;
  icon?: LucideIcon;
  size?: "default" | "large";
  className?: string;
}) {
  const Icon = icon ?? TONE_ICON[phrase.tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border font-medium",
        TONE_STYLES[phrase.tone].chip,
        size === "large" ? "px-4 py-2 text-base" : "px-3 py-1 text-sm",
        className,
      )}
    >
      <Icon className={size === "large" ? "h-5 w-5" : "h-4 w-4"} aria-hidden />
      {phrase.label}
    </span>
  );
}

export const DiscrepancyBadge = ({ value }: { value: DiscrepancyType }) => (
  <StatusChip
    phrase={DISCREPANCY_PHRASE[value]}
    icon={value === "phantom" ? PackageX : undefined}
  />
);

export const ComplianceBadge = ({ value }: { value: ComplianceStatus }) => (
  <StatusChip phrase={COMPLIANCE_PHRASE[value]} />
);

export const FreshnessBadge = ({ value }: { value: FreshnessLabel }) => (
  <StatusChip phrase={FRESHNESS_PHRASE[value]} />
);

export const ExpiryBadge = ({ value }: { value: ExpiryStatus }) => (
  <StatusChip phrase={EXPIRY_PHRASE[value]} />
);

export const SeverityBadge = ({ value }: { value: Severity }) => (
  <StatusChip phrase={SEVERITY_PHRASE[value]} />
);
