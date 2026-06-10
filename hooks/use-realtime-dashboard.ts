"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Hook to listen for database changes that should trigger a dashboard refresh.
 * Uses the PUBLIC anon key only — never the service role key.
 * Realtime channels are scoped with a filter where possible to reduce broadcast surface.
 */
export function useRealtimeDashboard(schoolId?: string | null) {
    const router = useRouter();
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!schoolId) return;

        // Explicitly use the public anon key — NEVER the service role key
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const channelName = `realtime-dashboard-${schoolId}`;

        const channel = supabase
            .channel(channelName)
            // Attendance changes for this school
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'AttendanceRecord' },
                () => router.refresh()
            )
            // Grade inserts for this school
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'GradeRecord' },
                () => router.refresh()
            )
            // New messages scoped to this school
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'Message',
                    filter: `schoolId=eq.${schoolId}`
                },
                () => router.refresh()
            )
            // New assignments for this school
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'Assignment',
                    filter: `schoolId=eq.${schoolId}`
                },
                () => router.refresh()
            )
            // Assignment submissions for this school
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'AssignmentSubmission',
                    filter: `schoolId=eq.${schoolId}`
                },
                () => router.refresh()
            )
            // Invoice/financial activity for this school
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'Invoice',
                    filter: `schoolId=eq.${schoolId}`
                },
                () => router.refresh()
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);
        };
    }, [schoolId, router]);
}
