"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

export function PresenceBroadcaster({ user }: { user: { id: string, name: string | null, email: string, role: string, schoolId?: string | null } }) {
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase.channel('global_online', {
            config: {
                presence: {
                    key: user.id,
                },
            },
        });

        channel.on('presence', { event: 'sync' }, () => {
            // we don't need to do anything on sync in the broadcaster
        });

        channel.subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    id: user.id,
                    name: user.name || user.email,
                    role: user.role,
                    schoolId: user.schoolId,
                    onlineAt: new Date().toISOString()
                });
            }
        });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return null; // Silent component
}
