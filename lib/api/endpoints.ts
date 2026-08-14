/**
 * One typed function per backend endpoint, grouped by capability.
 * Components import from here — never from `client.ts` directly — so the URL
 * surface stays in a single file.
 */

import { API_V1, api } from "@/lib/api/client";
import type {
  ComplianceCheckRequest,
  ComplianceCheckResponse,
  DiscrepancyType,
  ExpiryAudit,
  ExpiryExtractRequest,
  ExpiryExtractResponse,
  ExpiryStatus,
  ExpirySummary,
  FreshnessAudit,
  FreshnessClassifyResponse,
  FreshnessLabel,
  FreshnessSummary,
  HealthResponse,
  InsightRequest,
  InsightResponse,
  InventoryLog,
  InventoryScanRequest,
  InventoryScanResponse,
  InventorySummary,
  OllamaStatus,
  PlanogramDetail,
  PlanogramSummary,
  PlanogramVerifyResponse,
  Product,
} from "@/lib/types/api";

export const meta = {
  health: () => api.get<HealthResponse>("/health", { timeoutMs: 5_000 }),
};

export const inventory = {
  products: (params?: { category?: string; limit?: number; offset?: number }) =>
    api.get<Product[]>(`${API_V1}/inventory/products`, { query: params }),

  summary: () => api.get<InventorySummary>(`${API_V1}/inventory/summary`),

  logs: (params?: {
    discrepancy_type?: DiscrepancyType;
    shelf_id?: string;
    limit?: number;
    offset?: number;
  }) => api.get<InventoryLog[]>(`${API_V1}/inventory/logs`, { query: params }),

  alerts: (limit = 20) =>
    api.get<InventoryLog[]>(`${API_V1}/inventory/alerts`, { query: { limit } }),

  scan: (payload: InventoryScanRequest) =>
    api.post<InventoryScanResponse>(`${API_V1}/inventory/scan`, payload),

  scanImage: (file: File, params?: { shelf_id?: string; store_id?: string }) => {
    const form = new FormData();
    form.append("file", file);
    if (params?.shelf_id) form.append("shelf_id", params.shelf_id);
    if (params?.store_id) form.append("store_id", params.store_id);
    return api.upload<InventoryScanResponse>(`${API_V1}/inventory/scan/image`, form);
  },
};

export const planogram = {
  layouts: () => api.get<PlanogramSummary[]>(`${API_V1}/planogram/layouts`),

  layout: (uid: string) => api.get<PlanogramDetail>(`${API_V1}/planogram/layouts/${uid}`),

  compliance: (payload: ComplianceCheckRequest) =>
    api.post<ComplianceCheckResponse>(`${API_V1}/planogram/compliance`, payload),

  /**
   * Phase 1 pipeline: upload a frame, run YOLOv8, score every planogram slot.
   * Replaces `complianceImage`, which now aliases the same backend handler.
   */
  verify: (
    file: File,
    params?: { planogram_id?: string; shelf_id?: string; confidence?: number },
  ) => {
    const form = new FormData();
    form.append("file", file);
    if (params?.planogram_id) form.append("planogram_id", params.planogram_id);
    if (params?.shelf_id) form.append("shelf_id", params.shelf_id);
    if (params?.confidence !== undefined) {
      form.append("confidence", String(params.confidence));
    }
    return api.upload<PlanogramVerifyResponse>(`${API_V1}/planogram/verify`, form);
  },

  latestAudit: (shelfId?: string) =>
    api.get<ComplianceCheckResponse | null>(`${API_V1}/planogram/audits/latest`, {
      query: { shelf_id: shelfId },
    }),
};

export const freshness = {
  summary: () => api.get<FreshnessSummary>(`${API_V1}/freshness/summary`),

  audits: (params?: { label?: FreshnessLabel; limit?: number; offset?: number }) =>
    api.get<FreshnessAudit[]>(`${API_V1}/freshness/audits`, { query: params }),

  classifyImage: (file: File, productSku?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (productSku) form.append("product_sku", productSku);
    return api.upload<FreshnessClassifyResponse>(`${API_V1}/freshness/classify/image`, form);
  },
};

export const expiry = {
  summary: () => api.get<ExpirySummary>(`${API_V1}/expiry/summary`),

  audits: (params?: { status?: ExpiryStatus; limit?: number; offset?: number }) =>
    api.get<ExpiryAudit[]>(`${API_V1}/expiry/audits`, { query: params }),

  parse: (payload: ExpiryExtractRequest) =>
    api.post<ExpiryExtractResponse>(`${API_V1}/expiry/parse`, payload),

  extractImage: (file: File, productSku?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (productSku) form.append("product_sku", productSku);
    return api.upload<ExpiryExtractResponse>(`${API_V1}/expiry/extract/image`, form);
  },
};

export const insights = {
  status: () => api.get<OllamaStatus>(`${API_V1}/insights/status`, { timeoutMs: 8_000 }),

  context: (params?: { shelf_id?: string; window_hours?: number }) =>
    api.get<Record<string, unknown>>(`${API_V1}/insights/context`, { query: params }),

  generate: (payload: InsightRequest = {}) =>
    // Local LLM generation is slow; allow the full backend timeout.
    api.post<InsightResponse>(`${API_V1}/insights/generate`, payload, { timeoutMs: 150_000 }),
};

export const shelfsight = { meta, inventory, planogram, freshness, expiry, insights };
