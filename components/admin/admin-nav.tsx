'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, School, CreditCard, ShieldCheck, Inbox, ScrollText, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ui/theme-toggle';

export function AdminNav() {
    const pathname = usePathname();

    const links = [
        { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/admin/sanctuary', label: 'Sanctuary Safety', icon: ShieldAlert },
        { href: '/admin/schools', label: 'Schools Ledger', icon: School },
        { href: '/admin/billing', label: 'Billing & Licenses', icon: CreditCard },
        { href: '/admin/security', label: 'Security Disclosures', icon: ShieldCheck },
        { href: '/admin/requests', label: 'Access Requests', icon: Inbox },
        { href: '/admin/logs', label: 'Activity Logs', icon: ScrollText },
    ];

    return (
        <div className="flex items-center justify-between gap-4 w-full">
            <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {links.map((link) => {
                    const Icon = link.icon;
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all border shrink-0",
                                isActive
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                                    : "bg-transparent text-slate-500 dark:text-zinc-500 border-transparent hover:text-slate-900 dark:hover:text-zinc-200"
                            )}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {link.label}
                        </Link>
                    );
                })}
            </nav>

            <ThemeToggle />
        </div>
    );
}
