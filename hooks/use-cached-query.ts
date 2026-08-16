'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getClientCache, setClientCache, invalidateClientCache } from '@/lib/cache-client';
import { useNetworkQuality, getAdaptiveNetworkConfig } from '@/hooks/use-network-quality';

export class NetworkTimeoutError extends Error {
    isTimeout: boolean;
    isOffline: boolean;
    isNotFound: boolean;

    constructor(message: string, isTimeout = true, isOffline = false) {
        super(message);
        this.name = isTimeout ? 'NetworkTimeoutError' : isOffline ? 'OfflineError' : 'NetworkError';
        this.isTimeout = isTimeout;
        this.isOffline = isOffline;
        this.isNotFound = false;
    }
}

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
    /** Persist cache to localStorage in addition to sessionStorage (default: true for resilient offline) */
    persistToLocal?: boolean;
    /** Number of automatic retries on transient network errors (default: adaptive, up to 3) */
    retries?: number;
    /** Base delay between retries in milliseconds (default: adaptive, 1200 - 2500ms) */
    retryDelayMs?: number;
    /** Max request timeout in milliseconds before aborting (default: adaptive, up to 28000ms on 2G/3G) */
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
    error: (Error & { isTimeout?: boolean; isNotFound?: boolean; isOffline?: boolean }) | null;
    /** Current retry attempt in flight (0 = initial, 1 = retry 1, etc.) */
    retryAttempt: number;
    /** Maximum configured retries */
    maxRetries: number;
    /** Whether request timed out during last attempt */
    isTimeout: boolean;
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
    persistToLocal = true,
    retries,
    retryDelayMs,
    timeoutMs,
    onSuccess,
    onError
}: UseCachedQueryOptions<T>): UseCachedQueryResult<T> {
    const networkQuality = useNetworkQuality();
    const adaptiveConfig = getAdaptiveNetworkConfig(networkQuality);

    const resolvedTimeoutMs = timeoutMs ?? adaptiveConfig.timeoutMs;
    const resolvedRetries = retries ?? adaptiveConfig.retries;
    const resolvedRetryDelayMs = retryDelayMs ?? adaptiveConfig.retryDelayMs;

    // 1. Synchronously inspect cache for instant zero-latency rendering
    const cachedInitial = typeof window !== 'undefined' ? getClientCache<T>(key) : null;
    const resolvedInitial = cachedInitial ?? initialData;

    const [data, setData] = useState<T | undefined>(resolvedInitial);
    const [loading, setLoading] = useState<boolean>(!resolvedInitial && enabled);
    const [isRevalidating, setIsRevalidating] = useState<boolean>(false);
    const [isFromCache, setIsFromCache] = useState<boolean>(!!cachedInitial);
    const [isOffline, setIsOffline] = useState<boolean>(networkQuality === 'offline');
    const [isTimeout, setIsTimeout] = useState<boolean>(false);
    const [retryAttempt, setRetryAttempt] = useState<number>(0);
    const [error, setError] = useState<(Error & { isTimeout?: boolean; isNotFound?: boolean; isOffline?: boolean }) | null>(null);

    const retryCountRef = useRef(0);
    const abortControllerRef = useRef<AbortController | null>(null);
    const isMountedRef = useRef(true);
    const isManualTimeoutRef = useRef(false);

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

            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                setIsOffline(true);
                const offlineErr = new NetworkTimeoutError('Device is currently offline. Showing cached campus ledger snapshot.', false, true);
                setError(offlineErr);
                setLoading(false);
                setIsRevalidating(false);
                return data;
            }

            // Abort previous in-flight request if any
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            const controller = new AbortController();
            abortControllerRef.current = controller;
            isManualTimeoutRef.current = false;

            const timeoutId = setTimeout(() => {
                isManualTimeoutRef.current = true;
                controller.abort();
            }, resolvedTimeoutMs);

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
                setIsTimeout(false);
                setIsFromCache(false);
                retryCountRef.current = 0;
                setRetryAttempt(0);

                // Save to persistent cache (localStorage + sessionStorage)
                setClientCache(key, freshData, ttlMs, persistToLocal);

                if (onSuccess) {
                    onSuccess(freshData);
                }

                return freshData;
            } catch (err: any) {
                if (!isMountedRef.current) return undefined;

                clearTimeout(timeoutId);

                const wasTimeout = isManualTimeoutRef.current || err.name === 'AbortError' || err.message?.toLowerCase().includes('timeout') || err.message?.toLowerCase().includes('aborted');

                // If aborted normally due to component unmount or rapid refetch, ignore silently
                if (err.name === 'AbortError' && !isManualTimeoutRef.current && !isManual) {
                    return undefined;
                }

                if (wasTimeout) {
                    setIsTimeout(true);
                }

                // Check if genuine 404 (Resource Not Found) vs transient network error
                const is404 = err.status === 404 || err.message?.includes('404') || err.message?.toLowerCase().includes('not found in your institution');

                // Auto-retry transient failures if under limit
                if (!isManual && !is404 && retryCountRef.current < resolvedRetries && (typeof navigator === 'undefined' || navigator.onLine)) {
                    retryCountRef.current += 1;
                    setRetryAttempt(retryCountRef.current);
                    
                    // Jittered backoff: baseDelay * 1.5^retry + (0-400ms jitter)
                    const jitter = Math.floor(Math.random() * 400);
                    const backoff = Math.floor(resolvedRetryDelayMs * Math.pow(1.5, retryCountRef.current - 1)) + jitter;

                    setTimeout(() => {
                        if (isMountedRef.current) {
                            executeFetch(false);
                        }
                    }, backoff);
                    return undefined;
                }

                let resolvedError: Error & { isTimeout?: boolean; isNotFound?: boolean; isOffline?: boolean };
                if (wasTimeout) {
                    resolvedError = new NetworkTimeoutError(
                        'Campus ledger connection is slow or taking longer than expected. Retrying in background...',
                        true,
                        false
                    );
                } else if (is404) {
                    resolvedError = err instanceof Error ? err : new Error(String(err));
                    resolvedError.isNotFound = true;
                    resolvedError.isTimeout = false;
                } else {
                    resolvedError = err instanceof Error ? err : new Error(String(err));
                    resolvedError.isNotFound = false;
                    resolvedError.isTimeout = false;
                }

                setError(resolvedError);

                if (onError) {
                    onError(resolvedError);
                }

                // Keep cached data active so UI doesn't collapse into empty screen!
                const existingCache = getClientCache<T>(key);
                if (existingCache !== null && existingCache !== undefined) {
                    setData(existingCache);
                    setIsFromCache(true);
                }

                return undefined;
            } finally {
                if (isMountedRef.current) {
                    setLoading(false);
                    setIsRevalidating(false);
                }
            }
        },
        [enabled, key, fetcher, data, ttlMs, persistToLocal, resolvedRetries, resolvedRetryDelayMs, resolvedTimeoutMs, onSuccess, onError]
    );

    // Initial mount trigger
    useEffect(() => {
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
        retryAttempt,
        maxRetries: resolvedRetries,
        isTimeout,
        refetch: executeFetch,
        mutate,
        invalidate
    };
}
