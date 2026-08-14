import {
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
  HelpCircle,
  MapPin,
  PackageX,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import type {
  ComplianceStatus,
  DiscrepancyType,
  ExpiryStatus,
  FreshnessLabel,
  Severity,
} from "@/lib/types/api";

type Variant = NonNullable<BadgeProps["variant"]>;
type Spec = { label: string; variant: Variant; icon: LucideIcon };

/**
 * Every status ships as icon + text label, never colour alone — the badge stays
 * readable in greyscale print (screenshots go into the paper) and under CVD.
 */
const DISCREPANCY: Record<DiscrepancyType, Spec> = {
  match: { label: "Match", variant: "success", icon: CheckCircle2 },
  phantom: { label: "Phantom", variant: "destructive", icon: PackageX },
  undercount: { label: "Undercount", variant: "warning", icon: AlertTriangle },
  overcount: { label: "Overcount", variant: "info", icon: AlertTriangle },
};

const COMPLIANCE: Record<ComplianceStatus, Spec> = {
  compliant: { label: "Compliant", variant: "success", icon: CheckCircle2 },
  misplaced: { label: "Misplaced", variant: "warning", icon: MapPin },
  missing: { label: "Missing", variant: "destructive", icon: CircleSlash },
  extra: { label: "Extra", variant: "info", icon: AlertTriangle },
};

const FRESHNESS: Record<FreshnessLabel, Spec> = {
  fresh: { label: "Fresh", variant: "success", icon: CheckCircle2 },
  ripening: { label: "Ripening", variant: "warning", icon: AlertTriangle },
  spoiled: { label: "Spoiled", variant: "destructive", icon: XCircle },
};

const EXPIRY: Record<ExpiryStatus, Spec> = {
  valid: { label: "Valid", variant: "success", icon: CheckCircle2 },
  near_expiry: { label: "Near expiry", variant: "warning", icon: AlertTriangle },
  expired: { label: "Expired", variant: "destructive", icon: XCircle },
  unreadable: { label: "Unreadable", variant: "outline", icon: HelpCircle },
};

const SEVERITY: Record<Severity, Spec> = {
  info: { label: "Info", variant: "info", icon: CheckCircle2 },
  warning: { label: "Warning", variant: "warning", icon: AlertTriangle },
  critical: { label: "Critical", variant: "destructive", icon: XCircle },
};

function render(spec: Spec) {
  const Icon = spec.icon;
  return (
    <Badge variant={spec.variant}>
      <Icon className="h-3 w-3" aria-hidden />
      {spec.label}
    </Badge>
  );
}

export const DiscrepancyBadge = ({ value }: { value: DiscrepancyType }) => render(DISCREPANCY[value]);
export const ComplianceBadge = ({ value }: { value: ComplianceStatus }) => render(COMPLIANCE[value]);
export const FreshnessBadge = ({ value }: { value: FreshnessLabel }) => render(FRESHNESS[value]);
export const ExpiryBadge = ({ value }: { value: ExpiryStatus }) => render(EXPIRY[value]);
export const SeverityBadge = ({ value }: { value: Severity }) => render(SEVERITY[value]);
