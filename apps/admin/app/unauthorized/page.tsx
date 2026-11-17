import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function UnauthorizedPage({
    searchParams,
}: {
    searchParams: Promise<{ role?: string }>;
}) {
    return (
        <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center p-4 text-zinc-100">
            <div className="w-full max-w-md bg-zinc-950 border border-red-500/30 rounded-xl p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden text-center">
                <div className="absolute top-0 left-0 right-0 h-1 bg-red-500" />

                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 mx-auto mb-4 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6" />
                </div>

                <h1 className="font-mono text-xl font-bold tracking-wider text-red-400 mb-2">
                    403 // INSUFFICIENT CLEARANCE
                </h1>

                <p className="text-xs text-zinc-400 leading-relaxed mb-6 font-mono">
                    Access Denied. Your administrator role lacks security clearance for the requested section.
                    This event has been recorded in the platform audit log.
                </p>

                <div className="space-y-3">
                    <Link
                        href="/"
                        className="w-full py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 transition-colors flex items-center justify-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Return to Authorized Department Section
                    </Link>
                </div>

                <div className="mt-8 pt-4 border-t border-zinc-900 text-[10px] font-mono text-zinc-600">
                    ZERO CROSS-ROLE BOUNDARY LEAKAGE ENFORCED
                </div>
            </div>
        </div>
    );
}
