'use client';
import { useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import posthog from 'posthog-js';
import { setupGlobalErrorListeners } from './global-error-boundary';
import { createClient } from '@/utils/supabase/client';

const isPostHogConfigured = Boolean(
    process.env.NEXT_PUBLIC_POSTHOG_KEY && process.env.NEXT_PUBLIC_POSTHOG_HOST
);

function getPersonProperties(user: User) {
    // Only the role is sent: analytics must not hold names or email addresses.
    const properties: Record<string, string> = {};
    const role = user.user_metadata.role;

    if (typeof role === 'string') properties.role = role;

    return properties;
}

export function ErrorListenerInit() {
    useEffect(() => {
        setupGlobalErrorListeners();

        if (!isPostHogConfigured) return;

        const supabase = createClient();
        let identifiedUserId: string | null = null;
        let isUnmounted = false;

        const identifyUser = (user: User) => {
            if (identifiedUserId === user.id) return;

            if (identifiedUserId && identifiedUserId !== user.id) {
                posthog.reset();
            }

            posthog.identify(user.id, getPersonProperties(user));
            identifiedUserId = user.id;
        };

        const resetUser = () => {
            if (identifiedUserId || posthog.get_property('$user_id')) {
                posthog.reset();
            }
            identifiedUserId = null;
        };

        void supabase.auth.getUser().then(({ data: { user } }) => {
            if (isUnmounted) return;

            if (user) {
                identifyUser(user);
            } else {
                resetUser();
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                resetUser();
            } else if (event === 'SIGNED_IN' && session?.user) {
                identifyUser(session.user);
            }
        });

        return () => {
            isUnmounted = true;
            subscription.unsubscribe();
        };
    }, []);

    return null;
}
