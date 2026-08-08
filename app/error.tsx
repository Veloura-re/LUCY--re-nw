'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function RootError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        fetch('/api/client-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: 'root_route_render_error',
                message: error.message || 'Root Route Render Crash',
                digest: error.digest,
                stack: error.stack,
            }),
        }).catch(() => {});
    }, [error]);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-[#070709] text-slate-900 dark:text-zinc-100 flex items-center justify-center p-6">
            <div className="max-w-md w-full p-8 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-950/80 backdrop-blur-xl shadow-2xl text-center space-y-6">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-2xl font-bold">
                    ⚡
                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Something Went Wrong</h1>
                    <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2">
                        An unexpected error occurred while loading this page. You can reload or return to safety.
                    </p>
                    {error?.digest && (
                        <p className="text-xs font-mono text-slate-400 dark:text-zinc-600 mt-2">
                            Ref: {error.digest}
                        </p>
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => reset()}
                        className="flex-1 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-semibold rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
                    >
                        Try Again
                    </button>
                    <Link
                        href="/"
                        className="py-2.5 px-4 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-zinc-300 font-medium rounded-xl text-sm transition-all"
                    >
                        Home
                    </Link>
                </div>
            </div>
        </div>
    );
}
