"use client";

import { useRealtimeDashboard } from "@/hooks/use-realtime-dashboard";

/**
 * Invisible client component that initializes real-time listeners for the dashboard.
 * It triggers a server-side refresh whenever relevant data changes.
 */
export function RealtimeRefresh({ schoolId }: { schoolId?: string | null }) {
    useRealtimeDashboard(schoolId);
    return null;
}
