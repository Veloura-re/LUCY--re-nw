"use client";

import { useState, useEffect } from 'react';

export type EdgeHealthStatus = 'optimizing' | 'stable' | 'degraded' | 'offline';

/**
 * Monitors the diagnostic uplink to the Edge Worker.
 * Periodically pings /api/health to calculate latency and verify responsiveness.
 */
export function useEdgeHealth() {
    const [status, setStatus] = useState<EdgeHealthStatus>('stable');
    const [latency, setLatency] = useState<number | null>(null);

    useEffect(() => {
        let isMounted = true;

        const checkHealth = async () => {
            const start = performance.now();
            try {
                const res = await fetch('/api/health', { method: 'GET', cache: 'no-store' });
                if (res.ok) {
                    const end = performance.now();
                    const rtt = Math.round(end - start);
                    if (isMounted) {
                        setLatency(rtt);
                        if (rtt < 150) setStatus('stable');
                        else if (rtt < 500) setStatus('optimizing');
                        else setStatus('degraded');
                    }
                } else {
                    if (isMounted) setStatus('offline');
                }
            } catch (err) {
                if (isMounted) {
                    setStatus('offline');
                    setLatency(null);
                }
            }
        };

        // Initial check
        checkHealth();

        // Periodic monitoring every 30 seconds
        const interval = setInterval(checkHealth, 30000);

        // Listen for online/offline events for immediate feedback
        const handleOnline = () => checkHealth();
        const handleOffline = () => setStatus('offline');

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            isMounted = false;
            clearInterval(interval);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return { status, latency };
}
