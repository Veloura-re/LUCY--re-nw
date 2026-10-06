"use client";

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

/**
 * Hook to listen for database changes that should trigger a dashboard refresh.
 * Uses unique channel instances and defensive error boundaries to prevent
 * duplicate postgres_changes callback collisions after subscribe().
 */
export function useRealtimeDashboard(schoolId?: string | null) {
    const router = useRouter();
    const channelRef = useRef<any>(null);

    useEffect(() => {
        if (!schoolId) return;

        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return;

        // Explicitly use the public anon key — NEVER the service role key
        const supabase = createBrowserClient(url, key);

        // Unique instance channel name prevents collision with layout-level channels
        const instanceId = globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 8);
        const channelName = `realtime-dashboard-${schoolId}-${instanceId}`;

        try {
            const channel = supabase
                .channel(channelName)
                // Attendance changes for this school
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'AttendanceRecord' },
                    () => { try { router.refresh(); } catch {} }
                )
                // Grade inserts for this school
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'GradeRecord' },
                    () => { try { router.refresh(); } catch {} }
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
                    () => { try { router.refresh(); } catch {} }
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
                    () => { try { router.refresh(); } catch {} }
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
                    () => { try { router.refresh(); } catch {} }
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
                    () => { try { router.refresh(); } catch {} }
                );

            channelRef.current = channel;

            channel.subscribe((status: string, err?: any) => {
                if (err) {
                    console.warn('[useRealtimeDashboard] Subscription status:', status, err);
                }
            });
        } catch (err) {
            console.warn('[useRealtimeDashboard] Realtime connection registration bypassed:', err);
        }

        return () => {
            if (channelRef.current) {
                try {
                    supabase.removeChannel(channelRef.current);
                } catch {
                    /* non-blocking teardown */
                }
                channelRef.current = null;
            }
        };
    }, [schoolId, router]);
}
