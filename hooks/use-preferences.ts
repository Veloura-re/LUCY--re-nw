"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function usePreferences() {
    const supabase = createClient();
    const [preferences, setPreferences] = useState<any>(null);

    useEffect(() => {
        async function fetchPrefs() {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const res = await fetch('/api/user/settings');
                const data = (await res.json()) as any;
                if (data?.user?.preferences) {
                    setPreferences(data.user.preferences);
                    applyPreferences(data.user.preferences);
                }
            }
        }
        fetchPrefs();
    }, []);

    function applyPreferences(prefs: any) {
        if (typeof document === 'undefined') return;

        const body = document.body;

        // Immersive Visuals (Glows and Gradients)
        if (prefs.immersiveVisuals === false) {
            body.classList.add('hide-immersive-visuals');
        } else {
            body.classList.remove('hide-immersive-visuals');
        }

        // Neural Sync (Animations and Transitions)
        if (prefs.neuralSync === false) {
            body.classList.add('reduce-motion');
        } else {
            body.classList.remove('reduce-motion');
        }
    }

    return { preferences, refresh: applyPreferences };
}
