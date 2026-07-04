'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, School, CreditCard, ShieldCheck, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

export function AdminNav() {
    const pathname = usePathname();

    const links = [
        { href: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
        { href: '/admin/schools', label: 'Schools Ledger', icon: School },
        { href: '/admin/billing', label: 'Billing & Licenses', icon: CreditCard },
        { href: '/admin/security', label: 'Security Disclosures', icon: ShieldCheck },
        { href: '/admin/requests', label: 'Access Requests', icon: Inbox },
    ];

    return (
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                    <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-widest transition-all border shrink-0",
                            isActive
                                ? "bg-eduGreen-500/10 text-eduGreen-400 border-eduGreen-500/20"
                                : "bg-transparent text-zinc-500 border-transparent hover:text-zinc-300"
                        )}
                    >
                        <Icon className="w-3.5 h-3.5" />
                        {link.label}
                    </Link>
                );
            })}
        </nav>
    );
}
