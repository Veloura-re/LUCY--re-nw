"use client";

import { usePreferences } from "@/hooks/use-preferences";

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
    usePreferences();
    return <>{children}</>;
}
