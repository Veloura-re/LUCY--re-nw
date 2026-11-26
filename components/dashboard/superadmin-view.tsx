import Link from 'next/link';

interface SuperAdminViewProps {
    user: {
        id: string;
        name: string;
        email: string;
        role: string;
    };
}

/**
 * Platform governance dashboard for the SUPERADMIN role.
 * This view is rendered directly in /dashboard for the platform operator account.
 * Institutional-scoped features (school management, billing, etc.) are accessed
 * via the dedicated admin portal at the 4xctrl subdomain.
 */
export function SuperAdminView({ user }: SuperAdminViewProps) {
    return (
        <div className="p-6 md:p-10 max-w-4xl mx-auto">
            <div className="mb-8">
                <h1 className="text-2xl font-mono font-black text-zinc-900 dark:text-white mb-1 uppercase tracking-tighter">
                    Platform Governance
                </h1>
                <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">
                    {user.email} &mdash; SUPERADMIN
                </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                <Link
                    href="/dashboard/sanctuary/moderation"
                    className="p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-eduGreen-500/50 transition-colors group"
                >
                    <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white group-hover:text-eduGreen-600 dark:group-hover:text-eduGreen-400 transition-colors uppercase tracking-widest">
                        Sanctuary Moderation
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">
                        Review cross-campus escalations and flagged content
                    </p>
                </Link>

                <Link
                    href="/dashboard/settings"
                    className="p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-eduGreen-500/50 transition-colors group"
                >
                    <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white group-hover:text-eduGreen-600 dark:group-hover:text-eduGreen-400 transition-colors uppercase tracking-widest">
                        Platform Settings
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">
                        Global configuration and feature flags
                    </p>
                </Link>

                <Link
                    href="/dashboard/schools"
                    className="p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-eduGreen-500/50 transition-colors group"
                >
                    <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white group-hover:text-eduGreen-600 dark:group-hover:text-eduGreen-400 transition-colors uppercase tracking-widest">
                        School Registry
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">
                        Manage institutions, subscriptions and status
                    </p>
                </Link>

                <Link
                    href="/dashboard/users"
                    className="p-6 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-eduGreen-500/50 transition-colors group"
                >
                    <p className="text-sm font-mono font-bold text-zinc-900 dark:text-white group-hover:text-eduGreen-600 dark:group-hover:text-eduGreen-400 transition-colors uppercase tracking-widest">
                        User Directory
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-2 uppercase tracking-widest">
                        Platform-wide account management
                    </p>
                </Link>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950">
                <p className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                    Advanced administrative functions are available in the{' '}
                    <a
                        href="https://4xctrl.lc9s.5-cn.net"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-eduGreen-600 dark:text-eduGreen-400 hover:underline"
                    >
                        admin control panel
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}
