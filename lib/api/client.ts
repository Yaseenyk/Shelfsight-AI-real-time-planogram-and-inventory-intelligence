/**
 * Minimal type-safe HTTP client for the ShelfSight FastAPI backend.
 *
 * Deliberately dependency-free: one fetch wrapper with timeouts, typed errors
 * and FastAPI's `{detail: ...}` error shape decoded into a readable message.
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "http://localhost:8000";

export const API_V1 = "/api/v1";

const DEFAULT_TIMEOUT_MS = 30_000;
/** Uploads run inference server-side; give them room before aborting. */
const UPLOAD_TIMEOUT_MS = 120_000;

export class ApiError extends Error {
  readonly status: number;
  readonly detail: unknown;

  constructor(message: string, status: number, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
  }

  /** 503 means a model isn't loaded — actionable, not a crash. */
  get isServiceUnavailable(): boolean {
    return this.status === 503;
  }

  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
  timeoutMs?: number;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(
    path.startsWith("http") ? path : `${API_BASE_URL}${path}`,
    // Base is only used when `path` is relative and we're in a non-browser env.
    typeof window === "undefined" ? API_BASE_URL : window.location.origin,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

async function toApiError(response: Response): Promise<ApiError> {
  let detail: unknown;
  let message = `${response.status} ${response.statusText}`;
  try {
    const payload = await response.json();
    detail = payload;
    if (typeof payload?.detail === "string") {
      message = payload.detail;
    } else if (Array.isArray(payload?.detail)) {
      // Pydantic validation errors: [{loc, msg, type}, ...]
      message = payload.detail
        .map((item: { loc?: unknown[]; msg?: string }) =>
          `${(item.loc ?? []).slice(1).join(".")}: ${item.msg ?? "invalid"}`.trim(),
        )
        .join("; ");
    }
  } catch {
    /* non-JSON error body — keep the status line */
  }
  return new ApiError(message, response.status, detail);
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { query, body, timeoutMs = DEFAULT_TIMEOUT_MS, headers, ...rest } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const isFormData = typeof FormData !== "undefined" && body instanceof FormData;

  try {
    const response = await fetch(buildUrl(path, query), {
      ...rest,
      signal: options.signal ?? controller.signal,
      headers: {
        Accept: "application/json",
        ...(isFormData || body === undefined ? {} : { "Content-Type": "application/json" }),
        ...headers,
      },
      body: isFormData ? (body as FormData) : body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      throw await toApiError(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(`Request timed out after ${timeoutMs} ms`, 0, error);
    }
    throw new ApiError(
      error instanceof Error ? error.message : "Network request failed",
      0,
      error,
    );
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "GET" }),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "POST", body }),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "PATCH", body }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: "DELETE" }),

  upload: <T>(path: string, form: FormData, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: form,
      timeoutMs: options?.timeoutMs ?? UPLOAD_TIMEOUT_MS,
    }),
};
