'use client';

import { Component, ReactNode } from 'react';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: { componentStack: string }) {
        // Fire-and-forget — send to server log
        try {
            fetch('/api/client-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'ui_crash',
                    message: error.message || 'UI component crashed',
                    stack: error.stack + '\n\nComponent Stack:\n' + info.componentStack,
                    path: window.location.pathname,
                    metadata: { componentStack: info.componentStack }
                })
            }).catch(() => {});
        } catch { /* never block rendering */ }
    }

    render() {
        if (this.state.hasError) {
            return this.props.fallback ?? (
                <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center text-zinc-900 dark:text-white p-8">
                    <div className="max-w-md text-center space-y-4">
                        <div className="text-4xl font-black text-zinc-900 dark:text-white/10">500</div>
                        <h1 className="text-xl font-bold text-zinc-900 dark:text-white">Something went wrong</h1>
                        <p className="text-sm text-zinc-600 dark:text-zinc-500">This error has been automatically reported. Try refreshing the page.</p>
                        <button
                            onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
                            className="px-4 py-2 bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 rounded-lg text-sm text-zinc-700 dark:text-zinc-300 hover:bg-white/10 transition-all"
                        >
                            Refresh page
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Hook version for async/network errors
export function setupGlobalErrorListeners() {
    if (typeof window === 'undefined') return;

    const sendError = (payload: object) => {
        fetch('/api/client-error', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }).catch(() => {});
    };

    window.addEventListener('unhandledrejection', (e) => {
        const msg = e.reason?.message || String(e.reason) || '';
        const isChunkError = msg.includes('ChunkLoadError') || 
            msg.includes('Failed to fetch dynamically imported module') ||
            msg.includes('Loading chunk');

        if (isChunkError && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
            const lastReload = sessionStorage.getItem('lucy_last_chunk_reload');
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem('lucy_last_chunk_reload', String(now));
                console.warn('[ChunkLoadError] Network drop detected on module import. Auto-reloading client bundle...');
                window.location.reload();
                return;
            }
        }

        sendError({
            type: 'unhandled_rejection',
            message: msg || 'Unhandled promise rejection',
            stack: e.reason?.stack,
            path: window.location.pathname,
        });
    });

    window.addEventListener('error', (e) => {
        const msg = e.message || '';
        const isChunkError = msg.includes('ChunkLoadError') || 
            msg.includes('Failed to fetch dynamically imported module') ||
            msg.includes('Loading chunk');

        if (isChunkError && typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
            const lastReload = sessionStorage.getItem('lucy_last_chunk_reload');
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem('lucy_last_chunk_reload', String(now));
                console.warn('[ChunkLoadError] Uncaught script error on module chunk. Auto-reloading client bundle...');
                window.location.reload();
                return;
            }
        }

        sendError({
            type: 'ui_crash',
            message: msg || 'Uncaught JS error',
            stack: e.error?.stack,
            path: window.location.pathname,
            metadata: { filename: e.filename, lineno: e.lineno, colno: e.colno }
        });
    });
}
