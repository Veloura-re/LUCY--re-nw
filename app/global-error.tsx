'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log to telemetry endpoint
        fetch('/api/client-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'global_server_render_error',
                message: error.message || 'Global Server Component Crash',
                digest: error.digest,
                stack: error.stack,
            }),
        }).catch(() => {});
    }, [error]);

    return (
        <html lang="en" className="dark">
            <body className="bg-[#070709] text-zinc-100 font-sans min-h-screen flex items-center justify-center p-6">
                <div className="max-w-md w-full p-8 rounded-2xl border border-white/10 bg-zinc-950/80 backdrop-blur-xl shadow-2xl text-center space-y-6">
                    <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-2xl font-bold">
                        ⚡
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-white">System Recovering</h1>
                        <p className="text-sm text-zinc-400 mt-2">
                            A momentary server-side render exception occurred. Our autonomous recovery engine has logged the incident.
                        </p>
                        {error?.digest && (
                            <p className="text-xs font-mono text-zinc-600 mt-2">
                                Incident Ref: {error.digest}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => reset()}
                            className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
                        >
                            Retry Load
                        </button>
                        <Link
                            href="/"
                            className="py-2.5 px-4 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 font-medium rounded-xl text-sm transition-all"
                        >
                            Home
                        </Link>
                    </div>
                </div>
            </body>
        </html>
    );
}
