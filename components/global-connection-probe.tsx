"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { agentDebugLog } from "@/lib/agent-debug-log";

/**
 * Runs a lightweight /api/health ping on every client-side navigation (pathname change).
 * Used for connectivity visibility across routes where dashboard EdgeHealthIndicator is not mounted.
 */
export function GlobalConnectionProbe() {
    const pathname = usePathname();

    useEffect(() => {
        const t0 = performance.now();
        agentDebugLog({
            location: "global-connection-probe.tsx:effect",
            message: "global_probe_fetch_start",
            data: { pathname },
            hypothesisId: "H-layout",
        });

        fetch("/api/health", { method: "GET", cache: "no-store" })
            .then((res) => {
                const ms = Math.round(performance.now() - t0);
                agentDebugLog({
                    location: "global-connection-probe.tsx:then",
                    message: "global_probe_fetch_end",
                    data: { pathname, ok: res.ok, httpStatus: res.status, ms },
                    hypothesisId: "H-layout",
                });
            })
            .catch((err) => {
                agentDebugLog({
                    location: "global-connection-probe.tsx:catch",
                    message: "global_probe_fetch_error",
                    data: { pathname, err: String(err) },
                    hypothesisId: "H-fetch",
                });
            });
    }, [pathname]);

    return null;
}
