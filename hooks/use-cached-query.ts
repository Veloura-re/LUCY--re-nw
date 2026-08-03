'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getClientCache, setClientCache, invalidateClientCache } from '@/lib/cache-client';

export interface UseCachedQueryOptions<T> {
    /** Unique cache key for this resource */
    key: string;
    /** Async fetch function returning the data */
    fetcher: (signal?: AbortSignal) => Promise<T>;
    /** Optional initial fallback data */
    initialData?: T;
    /** Cache Time-To-Live in milliseconds (default: 10 minutes) */
    ttlMs?: number;
    /** Whether query execution is enabled (default: true) */
    enabled?: boolean;
    /** Persist cache to localStorage in addition to sessionStorage (default: false) */
    persistToLocal?: boolean;
    /** Number of automatic retries on transient network errors (default: 2) */
    retries?: number;
    /** Base delay between retries in milliseconds (default: 1200) */
    retryDelayMs?: number;
    /** Max request timeout in milliseconds before aborting (default: 10000) */
    timeoutMs?: number;
    /** Optional callback on successful fetch */
    onSuccess?: (data: T) => void;
    /** Optional callback on fetch error */
    onError?: (err: any) => void;
}

export interface UseCachedQueryResult<T> {
    /** The active data (cached or newly fetched) */
    data: T | undefined;
    /** Direct state updater */
    setData: React.Dispatch<React.SetStateAction<T | undefined>>;
    /** True only when no cached data exists and initial network request is in flight */
    loading: boolean;
    /** True when cached data is rendered, but background refresh is running */
    isRevalidating: boolean;
    /** True if browser is currently offline */
    isOffline: boolean;
    /** True if currently displaying cached data */
    isFromCache: boolean;
    /** Error object if the latest request failed */
    error: Error | null;
    /** Manually trigger a fresh network fetch */
    refetch: (isManual?: boolean) => Promise<T | undefined>;
    /** Optimistically update local data and cache */
    mutate: (updater: T | ((prev?: T) => T), shouldRevalidate?: boolean) => void;
    /** Invalidate this query's cache */
    invalidate: () => void;
}

export function useCachedQuery<T>({
    key,
    fetcher,
    initialData,
    ttlMs = 10 * 60 * 1000,
    enabled = true,
    persistToLocal = false,
    retries = 2,
    retryDelayMs = 1200,
    timeoutMs = 10000,
    onSuccess,
    onError
}: UseCachedQueryOptions<T>): UseCachedQueryResult<T> {
    // 1. Synchronously inspect cache for instant rendering
    const cachedInitial = typeof window !== 'undefined' ? getClientCache<T>(key) : null;
    const resolvedInitial = cachedInitial ?? initialData;

    const [data, setData] = useState<T | undefined>(resolvedInitial);
    const [loading, setLoading] = useState<boolean>(!resolvedInitial && enabled);
    const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
    const [isFromCache, setIsFromCache] = useState<boolean>(!!cachedInitial);
    const [isOffline, setIsOffline] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);

    const retryCountRef = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);

    // Online / Offline synchronization
    useEffect(() => {
        isMountedRef.current = true;

        const handleOnline = () => {
            if (isMountedRef.current) {
                setIsOffline(false);
                executeFetch(true);
            }
        };

        const handleOffline = () => {
            if (isMountedRef.current) {
                setIsOffline(true);
            }
        };

        if (typeof window !== 'undefined') {
            setIsOffline(!navigator.onLine);
            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);
        }

        return () => {
            isMountedRef.current = false;
            if (typeof window !== 'undefined') {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            }
        };
    }, []);

    // Core execute fetch logic
    const executeFetch = useCallback(
        async (isManual = false): Promise<T | undefined> => {
            if (!enabled) return undefined;

            // Abort previous in-flight request if any
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;

            const timeoutId = setTimeout(() => {
                controller.abort();
            }, timeoutMs);

            // If we already have data (from cache or previous fetch), mark revalidating
            if (data !== undefined) {
                setIsRevalidating(true);
            } else {
                setLoading(true);
            }

            try {
                const freshData = await fetcher(controller.signal);

                if (!isMountedRef.current) return freshData;

                clearTimeout(timeoutId);
                setData(freshData);
                setError(null);
                setIsFromCache(false);
                retryCountRef.current = 0;

                // Save to persistent cache
                setClientCache(key, freshData, ttlMs, persistToLocal);

                if (onSuccess) {
                    onSuccess(freshData);
                }

                return freshData;
            } catch (err: any) {
                if (!isMountedRef.current) return undefined;

                clearTimeout(timeoutId);

                // If cancelled / aborted due to newer request, ignore
                if (err.name === 'AbortError' && !isManual) {
                    // Check if it was genuine timeout vs supersede
                    return undefined;
                }

                console.warn(`[useCachedQuery:${key}] Fetch warning:`, err.message);

                // Auto-retry transient failures if under limit
                if (!isManual && retryCountRef.current < retries && navigator.onLine) {
                    retryCountRef.current += 1;
                    const backoff = retryCountRef.current * retryDelayMs;
                    setTimeout(() => {
                        if (isMountedRef.current) {
                            executeFetch(false);
                        }
                    }, backoff);
                    return undefined;
                }

                const resolvedError = err instanceof Error ? err : new Error(String(err));
                setError(resolvedError);

                if (onError) {
                    onError(resolvedError);
                }

                return undefined;
            } finally {
                if (isMountedRef.current) {
                    setLoading(false);
                    setIsRevalidating(false);
                }
            }
        },
        [enabled, key, fetcher, data, ttlMs, persistToLocal, retries, retryDelayMs, timeoutMs, onSuccess, onError]
    );

    // Initial mount trigger
    useEffect(() => {
        // If not cached, or enabled on mount, trigger background revalidation
        if (enabled) {
            executeFetch(false);
        }

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [key, enabled]);

    // Optimistic Mutation
    const mutate = useCallback(
        (updater: T | ((prev?: T) => T), shouldRevalidate = false) => {
            setData(prev => {
                const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
                setClientCache(key, next, ttlMs, persistToLocal);
                return next;
            });

            if (shouldRevalidate) {
                executeFetch(true);
            }
        },
        [key, ttlMs, persistToLocal, executeFetch]
    );

    // Explicit Cache Invalidation
    const invalidate = useCallback(() => {
        invalidateClientCache(key);
    }, [key]);

    return {
        data,
        setData,
        loading,
        isRevalidating,
        isOffline,
        isFromCache,
        error,
        refetch: executeFetch,
        mutate,
        invalidate
    };
}
