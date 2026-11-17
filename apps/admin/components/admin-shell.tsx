'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Shield, DollarSign, Terminal, LifeBuoy, Crown, LogOut, Clock, AlertTriangle } from 'lucide-react';
import { AdminRole } from '@prisma/client';

interface AdminShellProps {
    admin: {
        id: string;
        name: string;
        email: string;
        role: AdminRole;
    };
    children: React.ReactNode;
}

export function AdminShell({ admin, children }: AdminShellProps) {
    const pathname = usePathname();
    const router = useRouter();
    const [secondsLeft, setSecondsLeft] = useState(1800); // 30 minutes

    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsLeft((prev) => {
                if (prev <= 1) {
                    clearInterval(interval);
                    router.push('/login?reason=expired');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        const resetTimer = () => setSecondsLeft(1800);
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);

        return () => {
            clearInterval(interval);
            window.removeEventListener('mousemove', resetTimer);
            window.removeEventListener('keydown', resetTimer);
        };
    }, [router]);

    const formatTime = (secs: number) => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    const handleSignOut = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } finally {
            router.push('/login');
        }
    };

    // Navigation links permitted per role
    const navItems = [
        {
            label: 'Superadmin Center',
            href: '/superadmin',
            icon: Crown,
            visible: admin.role === AdminRole.SUPERADMIN,
        },
        {
            label: 'Finance & Payments',
            href: '/finance',
            icon: DollarSign,
            visible: admin.role === AdminRole.FINANCE || admin.role === AdminRole.SUPERADMIN,
        },
        {
            label: 'Security & Access',
            href: '/security',
            icon: Shield,
            visible: admin.role === AdminRole.SECURITY || admin.role === AdminRole.SUPERADMIN,
        },
        {
            label: 'System Logs & Health',
            href: '/logs',
            icon: Terminal,
            visible: admin.role === AdminRole.DEVELOPER || admin.role === AdminRole.SUPERADMIN,
        },
        {
            label: 'School Support Directory',
            href: '/support',
            icon: LifeBuoy,
            visible: admin.role === AdminRole.SUPPORT || admin.role === AdminRole.SUPERADMIN,
        },
    ].filter((item) => item.visible);

    const roleColor = {
        [AdminRole.SUPERADMIN]: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        [AdminRole.FINANCE]: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        [AdminRole.SECURITY]: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
        [AdminRole.DEVELOPER]: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
        [AdminRole.SUPPORT]: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
    }[admin.role];

    return (
        <div className="min-h-screen flex flex-col bg-[#070709] text-zinc-100">
            {/* Top Security Banner */}
            <header className="border-b border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                            <span className="font-mono text-sm tracking-wider font-semibold text-zinc-200">
                                4xctrl // LUCY OS
                            </span>
                            <span className="text-[11px] font-mono px-2 py-0.5 rounded border border-zinc-700 bg-zinc-900 text-zinc-400">
                                {typeof window !== 'undefined' && window.location.hostname.includes('st4g3') ? 'STAGING' : 'PRODUCTION'}
                            </span>
                        </div>

                        {/* Navigation links */}
                        <nav className="hidden md:flex items-center gap-1">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname.startsWith(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 transition-all ${
                                            isActive
                                                ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700'
                                                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                                        }`}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {item.label}
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Session Timer */}
                        <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 bg-zinc-900/80 border border-zinc-800 px-2.5 py-1 rounded">
                            <Clock className="w-3.5 h-3.5 text-zinc-400" />
                            <span>{formatTime(secondsLeft)}</span>
                        </div>

                        {/* Role Badge & Identity */}
                        <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border font-semibold ${roleColor}`}>
                                {admin.role}
                            </span>
                            <span className="text-xs font-medium text-zinc-300 hidden sm:inline">
                                {admin.name}
                            </span>
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={handleSignOut}
                            className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-colors"
                            title="Sign out of Admin Session"
                        >
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Navigation bar */}
            <div className="md:hidden border-b border-zinc-800 bg-zinc-950 px-4 py-2 flex items-center gap-1 overflow-x-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`px-2.5 py-1.5 rounded text-xs whitespace-nowrap flex items-center gap-1.5 ${
                                isActive ? 'bg-zinc-800 text-white font-semibold' : 'text-zinc-400'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            {item.label}
                        </Link>
                    );
                })}
            </div>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
                {children}
            </main>
        </div>
    );
}
