"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { NavToggle } from "@/components/dashboard/nav-toggle";
import { Menu, X, Sparkles, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { ICON_MAP, NAV_ITEMS, Role as NavRole } from "@/lib/navigation";
import { Logo } from "@/components/ui/logo";
import { ThemeToggle } from "@/components/ui/theme-toggle";

interface DashboardSidebarProps {
    dbUser: any;
    menu: any[];
}

export function DashboardSidebar({ dbUser, menu }: DashboardSidebarProps) {
    const [mobileOpen, setMobileOpen] = useState(false);
    const [collapsed, setCollapsed] = useState(false); // desktop collapse
    const [mounted, setMounted] = useState(false);
    const [isDesktop, setIsDesktop] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsDesktop(window.innerWidth >= 1024);
        }
    }, []);

    useEffect(() => {
        const handleResize = () => setIsDesktop(window.innerWidth >= 1024);
        window.addEventListener("resize", handleResize);
        setMounted(true);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Close mobile on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    const filteredMenu = mounted
        ? menu.filter((item) => {
            if (isDesktop && item.label === "Neural Link") return false;
            return true;
        })
        : menu;

    return (
        <>
            {/* ── Mobile Hamburger (bottom-left, visible < md) ── */}
            <div className="md:hidden fixed top-4 left-4 z-[60]">
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    className="bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white shadow-2xl"
                >
                    {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
            </div>

            {/* ── Mobile Backdrop ── */}
            <AnimatePresence>
                {mobileOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setMobileOpen(false)}
                        className="fixed inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-sm z-[50] md:hidden"
                    />
                )}
            </AnimatePresence>

            {/* ── Sidebar ── */}
            <motion.aside
                animate={{ width: collapsed ? 68 : 288 }}
                transition={{ duration: 0.1, ease: [0.4, 0, 0.2, 1] }}
                className={cn(
                    "fixed inset-y-0 left-0 z-[55] bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl border-r border-zinc-200 dark:border-zinc-900/50 flex flex-col overflow-hidden shrink-0",
                    "md:relative md:translate-x-0 md:h-screen",
                    mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
                    "transition-transform duration-300"
                )}
                style={{ minWidth: collapsed ? 68 : undefined }}
            >
                {/* ── Logo + Desktop Hamburger ── */}
                <div className={cn(
                    "flex items-center gap-3 px-4 pt-5 pb-4 relative",
                    collapsed ? "justify-center" : "justify-between",
                    "md:px-4 px-16" // Add padding on mobile to avoid X button
                )}>
                    <AnimatePresence mode="wait">
                        {!collapsed && (
                            <motion.div
                                key="logo"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -10 }}
                                transition={{ duration: 0.1 }}
                                className="flex flex-col gap-1"
                            >
                                {dbUser.school?.logoUrl ? (
                                    <img src={dbUser.school.logoUrl} alt="School Logo" className="w-10 h-10 object-contain rounded-lg bg-zinc-100/50 dark:bg-zinc-900/50 p-1" />
                                ) : (
                                    <Logo className="w-10 h-10" />
                                )}
                                {dbUser.school && (
                                    <p className="text-[9px] uppercase tracking-widest text-zinc-600 font-medium truncate max-w-[140px]">{dbUser.school.name}</p>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Desktop hamburger / collapse toggle */}
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className={cn(
                            "hidden md:flex items-center justify-center w-8 h-8 rounded-xl border border-zinc-300 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/60 text-zinc-600 dark:text-zinc-500 hover:text-white hover:border-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-800/60 transition-all shrink-0",
                            collapsed && "mx-auto"
                        )}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        <motion.div animate={{ rotate: collapsed ? 0 : 180 }} transition={{ duration: 0.1 }}>
                            <ChevronRight className="w-4 h-4" />
                        </motion.div>
                    </button>
                </div>

                {/* ── Nav Items ── */}
                <nav className="flex-1 px-2 space-y-1 overflow-y-auto scrollbar-hide py-2">
                    {filteredMenu.map((item: any) => {
                        const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP];
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <motion.div
                                    id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                                    whileHover={{ x: collapsed ? 0 : 2 }}
                                    className={cn(
                                        "flex items-center gap-3 h-11 px-3 rounded-2xl transition-all group font-semibold text-sm cursor-pointer",
                                        isActive
                                            ? "bg-eduGreen-900/20 text-eduGreen-600 dark:text-eduGreen-400 border border-eduGreen-900/30"
                                            : "text-zinc-700 dark:text-zinc-500 hover:text-eduGreen-600 dark:hover:text-eduGreen-400 hover:bg-eduGreen-50 dark:hover:bg-eduGreen-900/10 hover:border-eduGreen-900/20 border border-transparent",
                                        collapsed ? "justify-center px-0" : ""
                                    )}
                                    title={collapsed ? item.label : undefined}
                                >
                                    {Icon && (
                                        <Icon className={cn("shrink-0 transition-transform group-hover:scale-110", collapsed ? "w-5 h-5" : "w-4 h-4")} />
                                    )}
                                    <AnimatePresence>
                                        {!collapsed && (
                                            <motion.span
                                                initial={{ opacity: 0, width: 0 }}
                                                animate={{ opacity: 1, width: "auto" }}
                                                exit={{ opacity: 0, width: 0 }}
                                                transition={{ duration: 0.1 }}
                                                className="whitespace-nowrap overflow-hidden"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                    {isActive && !collapsed && (
                                        <motion.div
                                            layoutId="sidebar-active-dot"
                                            className="ml-auto w-1.5 h-1.5 rounded-full bg-eduGreen-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]"
                                            transition={{ type: "spring", stiffness: 600, damping: 30 }}
                                        />
                                    )}
                                </motion.div>
                            </Link>
                        );
                    })}
                </nav>

                {/* ── Bottom Section ── */}
                <div className={cn("border-t border-zinc-200 dark:border-zinc-900/50 mt-auto space-y-3 p-3", collapsed ? "items-center flex flex-col" : "")}>
                    {!collapsed && (
                        <div className="space-y-2">
                            <NavToggle mode="DOCK" />
                            <div className="flex items-center gap-2">
                                <ThemeToggle className="!w-[38px] !h-[38px] !rounded-xl shrink-0" />
                                <Button
                                    variant="ghost"
                                    onClick={() => window.dispatchEvent(new CustomEvent("lucy:open-tour"))}
                                    className="flex-1 justify-start gap-3 h-10 px-3 rounded-xl text-zinc-600 dark:text-zinc-500 hover:text-eduGreen-600 dark:hover:text-eduGreen-400 hover:bg-eduGreen-50 dark:hover:bg-eduGreen-900/10 transition-all font-black uppercase tracking-widest text-[9px]"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Interactive Tour
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* User profile row */}
                    <div className={cn("flex items-center gap-3", collapsed ? "flex-col gap-2" : "")}>
                        <div
                            className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-700 dark:text-zinc-300 font-black text-sm shadow-2xl shrink-0"
                            title={collapsed ? (dbUser.name || dbUser.email) : undefined}
                        >
                            {dbUser.name?.[0]?.toUpperCase() || dbUser.email?.[0]?.toUpperCase()}
                        </div>
                        <AnimatePresence>
                            {!collapsed && (
                                <motion.div
                                    initial={{ opacity: 0, width: 0 }}
                                    animate={{ opacity: 1, width: "auto" }}
                                    exit={{ opacity: 0, width: 0 }}
                                    transition={{ duration: 0.1 }}
                                    className="overflow-hidden min-w-0"
                                >
                                    <p className="text-xs font-semibold truncate text-zinc-900 dark:text-white dark:text-zinc-100 tracking-tight">{dbUser.name || "—"}</p>
                                    <p className="text-[9px] text-zinc-600 truncate">{dbUser.email}</p>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {!collapsed && <SignOutButton />}
                    {collapsed && (
                        <>
                            <ThemeToggle className="!w-9 !h-9 !rounded-xl" />
                            <button
                                onClick={() => window.dispatchEvent(new CustomEvent("lucy:open-tour"))}
                                className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-500 hover:text-eduGreen-600 dark:hover:text-eduGreen-400 hover:border-eduGreen-900/40 transition-all"
                                title="Interactive Tour"
                            >
                                <Sparkles className="w-4 h-4" />
                            </button>
                        </>
                    )}
                </div>
            </motion.aside>
        </>
    );
}
