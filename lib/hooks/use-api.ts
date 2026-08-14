"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/lib/api/client";

export const POLL_INTERVAL_MS = Number(
  process.env.NEXT_PUBLIC_POLL_INTERVAL_MS ?? 15_000,
);

export interface UseApiResult<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  /** True only for background refreshes, so the UI can avoid a full skeleton. */
  isRefreshing: boolean;
  refresh: () => Promise<void>;
}

/**
 * Fetch-on-mount with optional polling.
 *
 * Kept intentionally small — the dashboard is read-mostly and does not justify a
 * data-fetching library. `deps` behaves like a `useEffect` dependency list.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  options: { pollMs?: number; enabled?: boolean; deps?: unknown[] } = {},
): UseApiResult<T> {
  const { pollMs, enabled = true, deps = [] } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Ref-held so `run` stays stable while always calling the latest fetcher.
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const mountedRef = useRef(true);
  const loadedRef = useRef(false);

  const run = useCallback(async () => {
    if (!enabled) return;
    loadedRef.current ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const result = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
      loadedRef.current = true;
    } catch (caught) {
      if (!mountedRef.current) return;
      setError(
        caught instanceof ApiError
          ? caught
          : new ApiError(caught instanceof Error ? caught.message : "Unknown error", 0),
      );
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    mountedRef.current = true;
    void run();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, ...deps]);

  useEffect(() => {
    if (!pollMs || !enabled) return;
    const id = setInterval(() => void run(), pollMs);
    return () => clearInterval(id);
  }, [pollMs, enabled, run]);

  return { data, error, isLoading, isRefreshing, refresh: run };
}

/** Imperative one-shot action (uploads, generate insight) with pending state. */
export function useAction<TArgs extends unknown[], TResult>(
  action: (...args: TArgs) => Promise<TResult>,
) {
  const [data, setData] = useState<TResult | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isPending, setIsPending] = useState(false);

  const execute = useCallback(
    async (...args: TArgs): Promise<TResult | null> => {
      setIsPending(true);
      setError(null);
      try {
        const result = await action(...args);
        setData(result);
        return result;
      } catch (caught) {
        setError(
          caught instanceof ApiError
            ? caught
            : new ApiError(caught instanceof Error ? caught.message : "Unknown error", 0),
        );
        return null;
      } finally {
        setIsPending(false);
      }
    },
    [action],
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
  }, []);

  return { data, error, isPending, execute, reset };
}
