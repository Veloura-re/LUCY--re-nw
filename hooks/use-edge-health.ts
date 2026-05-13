"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { agentDebugLog } from '@/lib/agent-debug-log';

export type EdgeHealthStatus = 'optimizing' | 'stable' | 'degraded' | 'offline';

/**
 * Monitors the diagnostic uplink to the Edge Worker.
 * Periodically pings /api/health to calculate latency and verify responsiveness.
 * Re-checks on every route pathname change while this hook is mounted.
 */
export function useEdgeHealth() {
    const pathname = usePathname();
    const [status, setStatus] = useState<EdgeHealthStatus>('stable');
    const [latency, setLatency] = useState<number | null>(null);
    const isMountedRef = useRef(true);

    const checkHealth = useCallback(async (reason: 'pathname' | 'interval' | 'online') => {
        const path =
            typeof window !== 'undefined' ? window.location.pathname : pathname;
        const start = performance.now();
        agentDebugLog({
            location: 'use-edge-health.ts:checkHealth',
            message: 'dashboard_hook_check_start',
            data: { reason, path },
            hypothesisId: 'H-frequency',
        });
        try {
            const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
            if (res.ok) {
                const rtt = Math.round(performance.now() - start);
                agentDebugLog({
                    location: 'use-edge-health.ts:checkHealth',
                    message: 'dashboard_hook_check_ok',
                    data: { reason, path, rtt },
                    hypothesisId: 'H-api',
                });
                if (isMountedRef.current) {
                    setLatency(rtt);
                    if (rtt < 150) setStatus('stable');
                    else if (rtt < 500) setStatus('optimizing');
                    else setStatus('degraded');
                }
            } else {
                agentDebugLog({
                    location: 'use-edge-health.ts:checkHealth',
                    message: 'dashboard_hook_check_http_not_ok',
                    data: { reason, path, httpStatus: res.status },
                    hypothesisId: 'H-api',
                });
                if (isMountedRef.current) setStatus('offline');
            }
        } catch (err) {
            agentDebugLog({
                location: 'use-edge-health.ts:checkHealth',
                message: 'dashboard_hook_check_throw',
                data: { reason, path, err: String(err) },
                hypothesisId: 'H-fetch',
            });
            if (isMountedRef.current) {
                setStatus('offline');
                setLatency(null);
            }
        }
    }, [pathname]);

    useEffect(() => {
        isMountedRef.current = true;
        void checkHealth('pathname');
        return () => {
            isMountedRef.current = false;
        };
    }, [pathname, checkHealth]);

    useEffect(() => {
        const interval = setInterval(() => void checkHealth('interval'), 30000);
        const handleOnline = () => void checkHealth('online');
        const handleOffline = () => {
            if (isMountedRef.current) setStatus('offline');
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [checkHealth]);

    return { status, latency };
}
