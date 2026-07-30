"use client";

import { cn } from "@/lib/utils";
import {
    motion,
    AnimatePresence,
    useMotionValue,
    useSpring,
    useTransform
} from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { updateNavPreference } from "@/utils/nav-actions";
import { ICON_MAP, NAV_ITEMS } from "@/lib/navigation";
import { Columns2, DoorOpen, Sparkles } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const SCALING_FACTOR = 1.6;
const DISTANCE_THRESHOLD = 150;

export function FloatingDock({ role, userEmail, userName }: { role: string, userEmail: string, userName?: string }) {
    let mouseX = useMotionValue(Infinity);
    const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
    const signOutFormRef = useRef<HTMLFormElement>(null);

    const handleSignOut = () => {
        if (signOutFormRef.current) signOutFormRef.current.submit();
    };

    const menu = (NAV_ITEMS as any)[role] || [];
    const [isDesktop, setIsDesktop] = useState(false);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
        checkDesktop();
        window.addEventListener('resize', checkDesktop);
        setMounted(true);
        return () => window.removeEventListener('resize', checkDesktop);
    }, []);

    const filteredMenu = mounted ? menu.filter((item: any) => {
        if (isDesktop && item.label === "Neural Link") return false;
        return true;
    }) : menu;

    const items = [
        { icon: Columns2, label: "Switch to Sidebar", onClick: () => updateNavPreference("SIDEBAR"), variant: "toggle" },
        ...filteredMenu,
        { icon: Sparkles, label: "Interactive Tour", onClick: () => window.dispatchEvent(new CustomEvent('lucy:open-tour')), variant: "toggle" },
        { icon: DoorOpen, label: "Sign Out", onClick: () => setShowSignOutConfirm(true), variant: "danger" },
    ];

    return (
        <>
            <form ref={signOutFormRef} action="/auth/signout" method="post" className="hidden" />

            {/* Use a plain div with NO transform so child fixed-position portals work correctly */}
            <div className="fixed bottom-4 md:bottom-6 left-0 right-0 flex justify-center z-[100] pointer-events-none">
                <motion.div
                    onMouseMove={(e) => mouseX.set(e.pageX)}
                    onMouseLeave={() => mouseX.set(Infinity)}
                    className="flex items-center gap-2 px-3 pt-3 pb-3 rounded-[2.5rem] bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border border-slate-200/90 dark:border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] w-max max-w-[calc(100vw-2rem)] overflow-x-auto scrollbar-hide pointer-events-auto"
                >
                    {/* Name pill — desktop only */}
                    {userName && (
                        <div className="hidden md:flex items-center gap-2 px-3 h-[42px] rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05] shrink-0 mr-1">
                            <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-[9px] font-black text-zinc-900 dark:text-white shrink-0">
                                {userName[0]?.toUpperCase()}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-widest whitespace-nowrap max-w-[90px] truncate">{userName}</span>
                        </div>
                    )}

                    {/* Theme Toggle Switcher */}
                    <div className="shrink-0">
                        <ThemeToggle className="!w-[42px] !h-[42px] !rounded-2xl" />
                    </div>

                    {items.map((item: any, i: number) => (
                        <IconContainer mouseX={mouseX} key={i} {...item} />
                    ))}
                </motion.div>
            </div>

            <ConfirmationModal
                isOpen={showSignOutConfirm}
                onClose={() => setShowSignOutConfirm(false)}
                onConfirm={handleSignOut}
                title="Terminate Session"
                description="Are you sure you want to log out of the LUCY tactical environment?"
                confirmText="Terminate"
                variant="logout"
            />
        </>
    );
}

function IconContainer({ mouseX, icon, label, href, onClick, variant }: {
    mouseX: any,
    icon: any,
    label: string,
    href?: string,
    onClick?: () => void,
    variant?: string
}) {
    const ref = useRef<HTMLDivElement>(null);
    const pathname = usePathname();
    const isActive = href ? pathname === href : false;

    const distance = useTransform(mouseX, (val: number) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 };
        return val - bounds.x - bounds.width / 2;
    });

    const widthSync = useTransform(distance, [-DISTANCE_THRESHOLD, 0, DISTANCE_THRESHOLD], [42, 42 * SCALING_FACTOR, 42]);
    const width = useSpring(widthSync, { mass: 0.1, stiffness: 450, damping: 18 });

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const [hovered, setHovered] = useState(false);
    const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
    const [portalRoot, setPortalRoot] = useState<Element | null>(null);

    useEffect(() => {
        setPortalRoot(document.body);
    }, []);

    const Icon = typeof icon === 'string' ? (ICON_MAP as any)[icon] : icon;

    const handleMouseEnter = () => {
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            setTooltipPos({
                x: rect.left + rect.width / 2,
                y: rect.top - 10,
            });
        }
        setHovered(true);
    };

    const content = (
        <motion.div
            id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
            ref={ref}
            style={{ width: isMobile ? 42 : width }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={() => setHovered(false)}
            onClick={onClick}
            className={cn(
                "group aspect-square rounded-2xl flex items-center justify-center relative transition-all duration-100 cursor-pointer",
                isActive
                    ? "bg-eduGreen-600 text-white shadow-lg shadow-eduGreen-900/40"
                    : variant === 'danger'
                        ? "bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white hover:scale-105 active:scale-95"
                        : variant === 'toggle'
                            ? "bg-white/[0.05] text-eduGreen-500 hover:bg-eduGreen-500 hover:text-white border border-zinc-200 dark:border-white/5 md:hover:border-white/20 md:hover:scale-105 active:scale-95"
                            : "bg-white/[0.03] text-zinc-500 hover:text-white hover:bg-white/[0.1] border border-white/[0.05] md:hover:border-white/10 md:hover:scale-105 active:scale-95",
                isMobile ? "min-w-[42px] min-h-[42px]" : ""
            )}
        >
            {!isActive && (
                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            )}
            {Icon && <Icon className="w-5 h-5" />}
            {isActive && (
                <motion.div
                    layoutId="active-dot"
                    className="absolute -bottom-1 w-1.5 h-1 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)]"
                    transition={{ type: "spring", stiffness: 800, damping: 35 }}
                />
            )}
        </motion.div>
    );

    const tooltip = portalRoot ? createPortal(
        <AnimatePresence>
            {hovered && (
                <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                    transition={{ duration: 0.1, ease: "circOut" }}
                    style={{
                        position: "fixed",
                        left: tooltipPos.x,
                        top: tooltipPos.y,
                        transform: "translate(-50%, -100%)",
                        zIndex: 99999,
                        pointerEvents: "none",
                    }}
                    className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-800 rounded-lg text-[10px] font-medium text-zinc-900 dark:text-white whitespace-nowrap uppercase tracking-widest"
                >
                    {label}
                </motion.div>
            )}
        </AnimatePresence>,
        portalRoot
    ) : null;

    return (
        <>
            {tooltip}
            {href ? <Link href={href}>{content}</Link> : content}
        </>
    );
}
