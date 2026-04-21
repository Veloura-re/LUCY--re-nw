"use client";

import { createClient } from "@/utils/supabase/client";

/**
 * Updates the navigation preference (DOCK vs SIDEBAR) for the current user.
 * We use cookies for immediate UI response and update the DB for persistence.
 */
export async function updateNavPreference(mode: "DOCK" | "SIDEBAR") {
    // 1. Set cookie for immediate middleware/RSG response
    document.cookie = `nav_pref=${mode}; path=/; max-age=${60 * 60 * 24 * 365}`;

    // 2. Persist to DB via API (easier than a full Server Action for this JSON field updates)
    try {
        const res = await fetch('/api/user/preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nav_pref: mode })
        });

        if (!res.ok) {
            console.error("Failed to persist navigation preference to DB");
        }
    } catch (e) {
        console.error("Error updating navigation preference:", e);
    }

    // 3. Refresh the page to apply layout changes
    window.location.reload();
}
