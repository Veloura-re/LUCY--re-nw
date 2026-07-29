'use client';

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { SuperAdminCommandCenter } from "@/components/admin/superadmin-command-center";

export default function SuperAdminDashboard() {
    const [userName, setUserName] = useState("Administrator");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const supabase = createClient();
                const { data: { user } } = await supabase.auth.getUser();
                if (user?.user_metadata?.name) {
                    setUserName(user.user_metadata.name);
                } else if (user?.email) {
                    setUserName(user.email.split('@')[0]);
                }
            } catch (err) {
                console.error("Failed to fetch user state:", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUser();
    }, []);

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-500 opacity-80" />
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.3em] text-zinc-500">
                    CALIBRATING TELEMETRY MATRIX...
                </p>
            </div>
        );
    }

    return <SuperAdminCommandCenter userName={userName} />;
}
