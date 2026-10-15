import Link from "next/link";

export default function NotFound() {
    return (
        <main className="min-h-screen flex items-center justify-center bg-white dark:bg-black p-6">
            <div className="max-w-md w-full text-center space-y-6">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-zinc-500">Error 404</p>
                <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">Page not found</h1>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    The page you requested does not exist or you do not have access to it.
                </p>
                <Link
                    href="/dashboard"
                    className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900 px-6 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
                >
                    Return to dashboard
                </Link>
            </div>
        </main>
    );
}
