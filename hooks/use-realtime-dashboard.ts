"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

/**
 * Hook to listen for database changes that should trigger a dashboard refresh.
 * This makes the app feel "live" by automatically updating server components
 * when relevant data changes in the background.
 */
export function useRealtimeDashboard(schoolId?: string | null) {
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        if (!schoolId) return;

        // 1. Listen for new Attendance Records
        const attendanceChannel = supabase
            .channel(`realtime-dashboard-${schoolId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'AttendanceRecord',
                },
                () => {
                    console.log('[Realtime] Attendance update detected, refreshing...');
                    router.refresh();
                }
            )
            // 2. Listen for new Grade Records
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'GradeRecord',
                },
                () => {
                    console.log('[Realtime] New grade record detected, refreshing...');
                    router.refresh();
                }
            )
            // 3. Listen for new Messages (to update counter icons, if any)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'Message',
                },
                () => {
                    console.log('[Realtime] New message detected, refreshing...');
                    router.refresh();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(attendanceChannel);
        };
    }, [schoolId, supabase, router]);
}
