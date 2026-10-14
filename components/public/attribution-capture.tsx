"use client";

import { useEffect } from "react";
import { ATTRIBUTION_COOKIE, ATTRIBUTION_MAX_AGE_SECONDS, attributionFromParams } from "@/lib/attribution";

/**
 * Remembers which campaign link a visitor arrived from. The first source wins for 30 days, so a
 * later visit with no parameters cannot erase it; a new tagged link replaces it only when the
 * visitor arrives from a different source.
 */
export function AttributionCapture() {
    useEffect(() => {
        try {
            const incoming = attributionFromParams(new URLSearchParams(window.location.search));
            if (!incoming) return;

            const existing = document.cookie.split(";").map(c => c.trim()).find(c => c.startsWith(`${ATTRIBUTION_COOKIE}=`));
            if (existing) {
                const current = JSON.parse(decodeURIComponent(existing.slice(ATTRIBUTION_COOKIE.length + 1)));
                // Keep first-touch source, but let a newly chosen plan through
                if (current?.source && (!incoming.source || incoming.source === current.source)) {
                    if (incoming.plan && incoming.plan !== current.plan) {
                        write({ ...current, plan: incoming.plan });
                    }
                    return;
                }
            }
            write(incoming);
        } catch {
            // Attribution is best-effort and must never affect the page
        }
    }, []);

    return null;
}

function write(value: unknown) {
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${ATTRIBUTION_COOKIE}=${encodeURIComponent(JSON.stringify(value))}; Path=/; Max-Age=${ATTRIBUTION_MAX_AGE_SECONDS}; SameSite=Lax${secure}`;
}
