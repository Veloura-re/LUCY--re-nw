"use client";

import { useEffect, useState, Suspense } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import SpringingLoader from "@/components/dashboard/springing-loader";

function LogoutContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const reason = searchParams.get('reason');
    const supabase = createClient();
    const [loggingOut, setLoggingOut] = useState(true);

    useEffect(() => {
        const performLogout = async () => {
            // Sign out of Supabase
            await supabase.auth.signOut();
            
            // Delete the concurrent session cookie
            document.cookie = "lucy_device_session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            
            // Redirect to login with error
            if (reason === 'concurrent') {
                router.push('/login?error=You have been logged out because your account was accessed from another device.');
            } else {
                router.push('/login');
            }
        };
        
        performLogout();
    }, [router, reason, supabase.auth]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-black">
            <SpringingLoader message="Terminating secure session..." />
        </div>
    );
}

export default function LogoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black" />}>
            <LogoutContent />
        </Suspense>
    );
}
