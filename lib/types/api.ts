/**
 * Type mirror of the FastAPI Pydantic contracts (`be/app/schemas/`).
 *
 * These are hand-maintained on purpose: they are the single place where a
 * backend contract change becomes a compile error in the dashboard. When the
 * backend schema moves, update this file first and let `tsc` find the callers.
 */

/* ------------------------------------------------------------------ enums */

export const DISCREPANCY_TYPES = ["match", "phantom", "undercount", "overcount"] as const;
export type DiscrepancyType = (typeof DISCREPANCY_TYPES)[number];

export const COMPLIANCE_STATUSES = ["compliant", "misplaced", "missing", "extra"] as const;
export type ComplianceStatus = (typeof COMPLIANCE_STATUSES)[number];

export const FRESHNESS_LABELS = ["fresh", "ripening", "spoiled"] as const;
export type FreshnessLabel = (typeof FRESHNESS_LABELS)[number];

export const EXPIRY_STATUSES = ["valid", "near_expiry", "expired", "unreadable"] as const;
export type ExpiryStatus = (typeof EXPIRY_STATUSES)[number];

export const SEVERITIES = ["info", "warning", "critical"] as const;
export type Severity = (typeof SEVERITIES)[number];

/* ----------------------------------------------------------------- common */

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface Detection {
  class_id: number;
  class_name: string;
  confidence: number;
  bbox: BoundingBox;
  sku?: string | null;
  track_id?: number | null;
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  timestamp: string;
  database: string;
  detector_loaded: boolean;
  detector_model?: string | null;
  detector_classes?: number | null;
  /** True when the loaded detector is the generic COCO model, not the shelf one. */
  detector_is_generic_baseline?: boolean | null;
  detector_error?: string | null;
  freshness_loaded?: boolean | null;
  freshness_model?: string | null;
  freshness_trained_at?: string | null;
  freshness_error?: string | null;
  ollama_reachable?: boolean | null;
}

/* -------------------------------------------------------------- inventory */

export interface Product {
  id: number;
  sku: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  detection_class_id?: number | null;
  detection_class_name?: string | null;
  unit_price: number;
  system_stock: number;
  reorder_threshold: number;
  is_perishable: boolean;
  shelf_life_days?: number | null;
  created_at: string;
  updated_at: string;
}

export interface DiscrepancyItem {
  sku: string;
  product_name: string;
  detected_count: number;
  system_count: number;
  discrepancy: number;
  discrepancy_type: DiscrepancyType;
  severity: Severity;
  estimated_value_impact: number;
}

export interface InventoryLog {
  id: number;
  session_id?: number | null;
  product_id: number;
  detected_count: number;
  system_count: number;
  discrepancy: number;
  discrepancy_type: DiscrepancyType;
  severity: Severity;
  mean_confidence?: number | null;
  shelf_id?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface InventoryScanRequest {
  shelf_id?: string | null;
  store_id?: string | null;
  detections: Detection[];
  persist?: boolean;
}

export interface InventoryScanResponse {
  session_uid: string;
  shelf_id?: string | null;
  /** What the detector localised, before SKU resolution. */
  objects_detected?: number;
  unresolved_detections?: number;
  /** The boxes themselves, so the dashboard can draw them over the photo. */
  detections?: Detection[];
  image_width?: number;
  image_height?: number;
  total_detected: number;
  total_system: number;
  matched_skus: number;
  discrepancies: DiscrepancyItem[];
  phantom_count: number;
  latency_ms?: number | null;
  created_at: string;
}

export interface InventorySummary {
  total_products: number;
  total_system_stock: number;
  total_detected_stock: number;
  phantom_skus: number;
  undercount_skus: number;
  overcount_skus: number;
  accuracy_rate: number;
  value_at_risk: number;
  last_scan_at?: string | null;
}

/* -------------------------------------------------------------- planogram */

export interface PlanogramTolerances {
  iou_threshold: number;
  center_distance_threshold: number;
  row_band_tolerance: number;
  min_detection_confidence: number;
}

export interface PlanogramSlot {
  slot_id: string;
  position: number;
  sku: string;
  expected_facings: number;
  bbox: BoundingBox;
  orientation: "front" | "left" | "right" | "top";
  min_confidence?: number | null;
  is_mandatory: boolean;
}

export interface PlanogramRow {
  row_id: string;
  index: number;
  slots: PlanogramSlot[];
}

export interface PlanogramShelf {
  shelf_id: string;
  level: number;
  y_range: [number, number];
  rows: PlanogramRow[];
}

export interface PlanogramDocument {
  schema_version: string;
  planogram_id: string;
  name: string;
  version: string;
  store_id?: string | null;
  aisle?: string | null;
  bay?: string | null;
  units: "normalized";
  tolerances: PlanogramTolerances;
  shelves: PlanogramShelf[];
  metadata: Record<string, unknown>;
}

export interface PlanogramSummary {
  id: number;
  planogram_uid: string;
  name: string;
  version: string;
  store_id?: string | null;
  aisle?: string | null;
  bay?: string | null;
  shelf_count: number;
  slot_count: number;
  is_active: boolean;
  checksum?: string | null;
  created_at: string;
  updated_at: string;
}

export interface PlanogramDetail extends PlanogramSummary {
  layout_json: PlanogramDocument;
}

export interface SlotResult {
  slot_id: string;
  shelf_id: string;
  row_id: string;
  expected_sku: string;
  observed_sku?: string | null;
  status: ComplianceStatus;
  iou: number;
  center_distance: number;
  confidence?: number | null;
  expected_bbox?: BoundingBox | null;
  observed_bbox?: BoundingBox | null;
  expected_facings: number;
  observed_facings: number;
}

export interface ComplianceCheckRequest {
  planogram_uid?: string | null;
  shelf_id?: string | null;
  detections: Detection[];
  tolerances?: PlanogramTolerances | null;
  persist?: boolean;
}

export interface ComplianceAudit {
  id: number;
  session_id?: number | null;
  planogram_id: number;
  shelf_id?: string | null;
  total_slots: number;
  compliant_slots: number;
  misplaced_slots: number;
  missing_slots: number;
  extra_detections: number;
  compliance_score: number;
  spatial_alignment_accuracy: number;
  mean_iou?: number | null;
  mean_center_distance?: number | null;
  false_positive_rate?: number | null;
  latency_ms?: number | null;
  created_at: string;
}

export interface ComplianceCheckResponse extends ComplianceAudit {
  slot_results: SlotResult[];
}

/** Instrumentation for one detector pass (Phase 1). */
export interface DetectionSummary {
  count: number;
  resolved_skus: number;
  unresolved: number;
  suppressed: number;
  mean_confidence?: number | null;
  class_counts: Record<string, number>;
  model_version?: string | null;
  image_width?: number | null;
  image_height?: number | null;
  inference_ms?: number | null;
  postprocess_ms?: number | null;
}

/** Response of `POST /planogram/verify` — detection + compliance in one call. */
export interface PlanogramVerifyResponse extends ComplianceCheckResponse {
  session_uid: string;
  planogram_uid: string;
  detections: Detection[];
  detection: DetectionSummary;
  detection_latency_ms?: number | null;
  total_latency_ms?: number | null;
}

/* -------------------------------------------------------------- freshness */

export interface FreshnessPrediction {
  label: FreshnessLabel;
  confidence: number;
  class_probabilities: Record<string, number>;
  bbox?: BoundingBox | null;
  backbone?: string | null;
  latency_ms?: number | null;
}

export interface FreshnessClassifyResponse {
  session_uid?: string | null;
  predictions: FreshnessPrediction[];
  spoiled_count: number;
  ripening_count: number;
  latency_ms?: number | null;
}

export interface FreshnessAudit {
  id: number;
  session_id?: number | null;
  product_id?: number | null;
  label: FreshnessLabel;
  confidence: number;
  class_probabilities?: Record<string, number> | null;
  bbox?: number[] | null;
  backbone?: string | null;
  model_version?: string | null;
  latency_ms?: number | null;
  ground_truth_label?: FreshnessLabel | null;
  created_at: string;
}

export interface FreshnessSummary {
  total_assessed: number;
  fresh: number;
  ripening: number;
  spoiled: number;
  spoilage_rate: number;
  mean_confidence?: number | null;
}

/* ----------------------------------------------------------------- expiry */

export interface ExpiryExtraction {
  raw_text?: string | null;
  normalized_text?: string | null;
  matched_pattern?: string | null;
  parsed_date?: string | null;
  days_remaining?: number | null;
  status: ExpiryStatus;
  ocr_confidence?: number | null;
  bbox?: BoundingBox | null;
  latency_ms?: number | null;
}

export interface ExpiryExtractRequest {
  texts: string[];
  product_sku?: string | null;
  session_uid?: string | null;
  reference_date?: string | null;
  persist?: boolean;
}

export interface ExpiryExtractResponse {
  session_uid?: string | null;
  extractions: ExpiryExtraction[];
  expired_count: number;
  near_expiry_count: number;
  unreadable_count: number;
  latency_ms?: number | null;
  /** The read to act on — most decisive dated candidate, not merely the most confident. */
  best?: ExpiryExtraction | null;
  raw_text?: string | null;
  variant_used?: string | null;
  variants_tried: string[];
  ocr_ms?: number | null;
}

export interface ExpiryAudit {
  id: number;
  session_id?: number | null;
  product_id?: number | null;
  raw_text?: string | null;
  normalized_text?: string | null;
  matched_pattern?: string | null;
  parsed_date?: string | null;
  days_remaining?: number | null;
  status: ExpiryStatus;
  ocr_confidence?: number | null;
  latency_ms?: number | null;
  created_at: string;
}

export interface ExpirySummary {
  total_scanned: number;
  valid: number;
  near_expiry: number;
  expired: number;
  unreadable: number;
  read_rate: number;
}

/* --------------------------------------------------------------- insights */

export interface InsightRequest {
  shelf_id?: string | null;
  session_uid?: string | null;
  window_hours?: number;
  audience?: "store_manager" | "regional_director" | "analyst";
  context?: Record<string, unknown> | null;
  model?: string | null;
  temperature?: number | null;
}

export interface InsightAction {
  /** 1 = do this first. */
  priority: number;
  title: string;
  rationale: string;
  severity: Severity;
}

export interface InsightResponse {
  summary: string;
  headline?: string | null;
  actions: InsightAction[];

  /** Model that actually produced the text. */
  model: string;
  model_requested?: string | null;
  /** True when the configured model was absent and another was used. */
  model_substituted: boolean;

  prompt_tokens?: number | null;
  completion_tokens?: number | null;
  latency_ms?: number | null;
  generated_at: string;

  degraded: boolean;
  /** Why the LLM path did not produce the briefing (e.g. "model_not_found: …"). */
  degraded_reason?: string | null;
  scope: "session" | "window";
  session_uid?: string | null;
}

/** The compiled prompt, exposed so a run can be reproduced exactly. */
export interface PromptBundle {
  system: string;
  user: string;
  audience: string;
}

export interface OllamaStatus {
  reachable: boolean;
  base_url: string;
  default_model: string;
  /** Whether the configured model is actually installed. */
  model_available: boolean;
  available_models: string[];
  version?: string | null;
  error?: string | null;
  /** Actionable next step when something is missing. */
  hint?: string | null;
}
