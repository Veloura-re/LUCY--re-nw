"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useSpring, useMotionValue, useTransform } from "framer-motion";
import { X, ChevronRight, ChevronLeft, Sparkles, BookOpen, Users, GraduationCap, Calendar, BarChart3, Settings, MessageSquare, DollarSign, CheckSquare, Zap } from "lucide-react";

// --- Per-step color palette ---
const PALETTES = [
    { accent: '#3BD68D', glow: 'rgba(59,214,141,0.35)', bg: 'rgba(15,94,63,0.18)', border: 'rgba(59,214,141,0.3)', text: '#a7f3d0', name: 'green' },
    { accent: '#60A5FA', glow: 'rgba(96,165,250,0.35)', bg: 'rgba(30,64,175,0.18)', border: 'rgba(96,165,250,0.3)', text: '#bfdbfe', name: 'blue' },
    { accent: '#F472B6', glow: 'rgba(244,114,182,0.35)', bg: 'rgba(157,23,77,0.18)', border: 'rgba(244,114,182,0.3)', text: '#fce7f3', name: 'pink' },
    { accent: '#A78BFA', glow: 'rgba(167,139,250,0.35)', bg: 'rgba(109,40,217,0.18)', border: 'rgba(167,139,250,0.3)', text: '#ede9fe', name: 'purple' },
    { accent: '#FB923C', glow: 'rgba(251,146,60,0.35)', bg: 'rgba(194,65,12,0.18)', border: 'rgba(251,146,60,0.3)', text: '#ffedd5', name: 'orange' },
    { accent: '#34D399', glow: 'rgba(52,211,153,0.35)', bg: 'rgba(6,78,59,0.18)', border: 'rgba(52,211,153,0.3)', text: '#d1fae5', name: 'emerald' },
    { accent: '#FBBF24', glow: 'rgba(251,191,36,0.35)', bg: 'rgba(146,64,14,0.18)', border: 'rgba(251,191,36,0.3)', text: '#fef3c7', name: 'amber' },
    { accent: '#38BDF8', glow: 'rgba(56,189,248,0.35)', bg: 'rgba(12,74,110,0.18)', border: 'rgba(56,189,248,0.3)', text: '#e0f2fe', name: 'sky' },
    { accent: '#4ADE80', glow: 'rgba(74,222,128,0.35)', bg: 'rgba(20,83,45,0.18)', border: 'rgba(74,222,128,0.3)', text: '#dcfce7', name: 'lime' },
];

interface TourStep {
    elementId?: string;
    title: string;
    description: string;
    icon: any;
}

const getStepsForRole = (role: string): TourStep[] => {
    switch (role) {
        case 'PRINCIPAL':
        case 'SUPERADMIN':
            return [
                { title: 'Welcome to LUCY', description: 'Your all-in-one school management platform. This quick tour will show you the key areas of your dashboard.', icon: Sparkles },
                { elementId: 'nav-teachers', title: 'Teachers', description: 'Invite and manage all your teachers here. Set roles, view profiles, and track their subjects.', icon: Users },
                { elementId: 'nav-students', title: 'Students', description: 'Browse and manage all enrolled students. View profiles, grades, and attendance history.', icon: GraduationCap },
                { elementId: 'nav-classes', title: 'Classes', description: 'Create and organize classes, grades, and assign homeroom teachers with ease.', icon: BookOpen },
                { elementId: 'nav-timetable', title: 'Timetable', description: 'Generate the complete school timetable automatically. Just set the rules and let LUCY do the work.', icon: Calendar },
                { elementId: 'nav-attendance', title: 'Attendance', description: 'Track daily attendance across all classes and get real-time reports on student presence.', icon: CheckSquare },
                { elementId: 'nav-finance', title: 'Finance', description: 'Monitor school fees, invoices, and payment history all from one place.', icon: DollarSign },
                { elementId: 'nav-settings', title: 'Settings', description: 'Configure school-wide settings, branding, backup and restore your data anytime.', icon: Settings },
                { elementId: 'nav-help-center', title: 'Guideline Book', description: 'Your complete manual is always here. Step-by-step guides for every feature.', icon: BookOpen },
            ];
        case 'TEACHER':
        case 'HOMEROOM':
            return [
                { title: 'Welcome, Teacher!', description: 'Here is a quick overview of your teaching dashboard. Everything you need is right here.', icon: Sparkles },
                { elementId: 'nav-overview', title: 'My Overview', description: 'Check your daily schedule, upcoming classes, and quick stats right here.', icon: BarChart3 },
                { elementId: 'nav-add-exam', title: 'Exams & Grades', description: 'Create assessments and log student grades quickly from this section.', icon: CheckSquare },
                { elementId: 'nav-attendance', title: 'Attendance', description: 'Mark student attendance for your classes. It only takes a few seconds.', icon: CheckSquare },
                { elementId: 'nav-messages', title: 'Messages', description: 'Chat with parents and administration directly from the platform.', icon: MessageSquare },
                { elementId: 'nav-help-center', title: 'Guideline Book', description: 'Everything you need to know about LUCY is documented here.', icon: BookOpen },
            ];
        default:
            return [
                { title: 'Welcome to LUCY', description: 'Explore your new dashboard. Everything you need is just a click away.', icon: Sparkles },
                { elementId: 'nav-help-center', title: 'Guideline Book', description: 'Access the complete guide anytime you need help.', icon: BookOpen },
            ];
    }
};

// Wobbly floating animation variants - fast spring for click, slow float otherwise
const popoverVariants = {
    hidden: (dir: number) => ({
        opacity: 0,
        y: dir > 0 ? 18 : -18,
        x: dir > 0 ? 8 : -8,
        scale: 0.88,
        rotate: dir > 0 ? 2 : -2,
    }),
    visible: {
        opacity: 1,
        y: 0,
        x: 0,
        scale: 1,
        rotate: 0,
        transition: {
            type: 'spring' as const,
            stiffness: 600,
            damping: 28,
            mass: 0.6,
        }
    },
    exit: (dir: number) => ({
        opacity: 0,
        y: dir > 0 ? -18 : 18,
        x: dir > 0 ? -8 : 8,
        scale: 0.88,
        rotate: dir > 0 ? -2 : 2,
        transition: { duration: 0.12, ease: 'easeIn' as const }
    })
};

const spotlightVariants = {
    hidden: { opacity: 0, scale: 0.85 },
    visible: {
        opacity: 1,
        scale: 1,
        transition: { type: 'spring' as const, stiffness: 500, damping: 30, mass: 0.5 }
    },
    exit: { opacity: 0, scale: 0.9, transition: { duration: 0.1 } }
};

function WobblyIcon({ Icon, color }: { Icon: any, color: string }) {
    return (
        <motion.div
            animate={{
                rotate: [0, -6, 6, -4, 4, 0],
                scale: [1, 1.08, 0.95, 1.05, 1],
            }}
            transition={{ duration: 3, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
            style={{
                width: 40, height: 40, borderRadius: 12,
                background: `linear-gradient(135deg, ${color}30, ${color}10)`,
                border: `1px solid ${color}50`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                boxShadow: `0 0 16px ${color}40`,
            }}
        >
            <Icon size={18} style={{ color }} />
        </motion.div>
    );
}

function TourOverlay({ role, onClose }: { role: string; onClose: () => void }) {
    const steps = getStepsForRole(role);
    const [current, setCurrent] = useState(0);
    const [direction, setDirection] = useState(1);
    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

    const step = steps[current];
    const palette = PALETTES[current % PALETTES.length];
    const isFirst = current === 0;
    const isLast = current === steps.length - 1;
    const Icon = step.icon;

    const updateTarget = useCallback(() => {
        if (step.elementId) {
            const el = document.getElementById(step.elementId);
            if (el) { setTargetRect(el.getBoundingClientRect()); return; }
        }
        setTargetRect(null);
    }, [step]);

    useEffect(() => {
        updateTarget();
        window.addEventListener('resize', updateTarget);
        window.addEventListener('scroll', updateTarget, true);
        return () => {
            window.removeEventListener('resize', updateTarget);
            window.removeEventListener('scroll', updateTarget, true);
        };
    }, [updateTarget]);

    const goTo = (idx: number) => {
        setDirection(idx > current ? 1 : -1);
        setCurrent(idx);
    };
    const handleNext = () => { if (isLast) { onClose(); return; } goTo(current + 1); };
    const handlePrev = () => { if (!isFirst) goTo(current - 1); };

    const getPopoverStyle = (): React.CSSProperties => {
        if (!targetRect) return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
        const vpW = window.innerWidth;
        const vpH = window.innerHeight;
        const boxW = Math.min(370, vpW - 32);
        const gap = 18;
        let top: number;
        let left: number;
        if (targetRect.bottom + gap + 240 < vpH) top = targetRect.bottom + gap;
        else if (targetRect.top - gap - 240 > 0) top = targetRect.top - 240 - gap;
        else top = Math.max(16, (vpH - 240) / 2);
        left = targetRect.left + targetRect.width / 2 - boxW / 2;
        left = Math.max(16, Math.min(left, vpW - boxW - 16));
        return { top, left, width: boxW };
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Dim overlay */}
            <motion.div
                className="absolute inset-0 pointer-events-auto"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(3px)' }}
                onClick={onClose}
            />

            {/* Spotlight ring with animated color */}
            <AnimatePresence mode="wait">
                {targetRect && (
                    <motion.div
                        key={`spot-${current}`}
                        variants={spotlightVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className="absolute pointer-events-none"
                        style={{
                            top: targetRect.top - 8,
                            left: targetRect.left - 8,
                            width: targetRect.width + 16,
                            height: targetRect.height + 16,
                            borderRadius: 18,
                            boxShadow: `0 0 0 9999px rgba(0,0,0,0.78), 0 0 0 2px ${palette.accent}, 0 0 28px ${palette.glow}`,
                        }}
                    >
                        {/* Corner pulse dots */}
                        {[[-4,-4], [targetRect.width+4,-4], [-4, targetRect.height+4], [targetRect.width+4, targetRect.height+4]].map(([cx, cy], i) => (
                            <motion.div
                                key={i}
                                animate={{ scale: [1, 1.6, 1], opacity: [0.8, 0.2, 0.8] }}
                                transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                                style={{
                                    position: 'absolute', top: cy, left: cx,
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: palette.accent,
                                    boxShadow: `0 0 8px ${palette.accent}`,
                                }}
                            />
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Popover card */}
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={current}
                    custom={direction}
                    variants={popoverVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="absolute pointer-events-auto"
                    style={getPopoverStyle()}
                >
                    {/* Floating ambient orbs */}
                    <motion.div
                        animate={{ scale: [1, 1.3, 1], opacity: [0.15, 0.35, 0.15] }}
                        transition={{ duration: 4, repeat: Infinity }}
                        style={{
                            position: 'absolute', top: -50, right: -30,
                            width: 160, height: 160, borderRadius: '50%',
                            background: `radial-gradient(circle, ${palette.accent} 0%, transparent 70%)`,
                            pointerEvents: 'none', zIndex: 0,
                        }}
                    />
                    <motion.div
                        animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 5, repeat: Infinity, delay: 1 }}
                        style={{
                            position: 'absolute', bottom: -40, left: -20,
                            width: 120, height: 120, borderRadius: '50%',
                            background: `radial-gradient(circle, ${palette.accent} 0%, transparent 70%)`,
                            pointerEvents: 'none', zIndex: 0,
                        }}
                    />

                    <div className="relative z-10 bg-white/95 dark:bg-zinc-950/95 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl dark:shadow-[0_32px_60px_rgba(0,0,0,0.75)] backdrop-blur-2xl overflow-hidden p-6 text-zinc-900 dark:text-white">
                        {/* Animated top bar */}
                        <motion.div
                            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                            style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                                background: `linear-gradient(90deg, transparent, ${palette.accent}, #10b981, ${palette.accent}, transparent)`,
                                backgroundSize: '200% 100%',
                            }}
                        />

                        {/* Header row */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <WobblyIcon Icon={Icon} color={palette.accent} />
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-0.5">
                                        Step {current + 1} of {steps.length}
                                    </p>
                                    <h3 className="text-base font-black tracking-tight text-zinc-900 dark:text-white m-0">
                                        {step.title}
                                    </h3>
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.15, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                onClick={onClose}
                                className="w-8 h-8 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            >
                                <X size={14} />
                            </motion.button>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4 font-normal">
                            {step.description}
                        </p>

                        {/* Progress dots */}
                        <div className="flex gap-1.5 mb-4 items-center">
                            {steps.map((_, i) => {
                                const p = PALETTES[i % PALETTES.length];
                                return (
                                    <motion.button
                                        key={i}
                                        onClick={() => goTo(i)}
                                        animate={{
                                            width: i === current ? 24 : 6,
                                            background: i === current ? p.accent : 'rgba(120,120,128,0.25)',
                                            scale: i === current ? 1 : 0.85,
                                        }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                        whileHover={{ scale: 1.3 }}
                                        className="h-1.5 rounded-full border-none cursor-pointer p-0"
                                        style={{
                                            boxShadow: i === current ? `0 0 8px ${p.accent}` : 'none',
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2.5">
                            {!isFirst && (
                                <motion.button
                                    whileHover={{ scale: 1.04, x: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                                    onClick={handlePrev}
                                    className="px-4 py-2.5 rounded-xl cursor-pointer border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
                                >
                                    <ChevronLeft size={13} /> Back
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.03, y: -1 }}
                                whileTap={{ scale: 0.96 }}
                                transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                                onClick={handleNext}
                                className="flex-1 py-2.5 px-5 rounded-xl cursor-pointer bg-eduGreen-600 hover:bg-eduGreen-500 text-white text-[11px] font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-eduGreen-900/20 border border-eduGreen-500 transition-all"
                            >
                                {isLast ? <><Zap size={13} /> Get Started</> : <>Next <ChevronRight size={13} /></>}
                            </motion.button>
                        </div>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>,
        document.body
    );
}

export function InteractiveTour({ role }: { role: string }) {
    const [open, setOpen] = useState(false);

    const handleClose = useCallback(() => {
        setOpen(false);
        localStorage.setItem(`interactive_tour_seen_${role}`, 'true');
    }, [role]);

    useEffect(() => {
        const handleOpenTour = () => setOpen(true);
        window.addEventListener('lucy:open-tour', handleOpenTour);

        const hasSeenTour = localStorage.getItem(`interactive_tour_seen_${role}`);
        if (!hasSeenTour) {
            const timer = setTimeout(() => setOpen(true), 1500);
            return () => {
                clearTimeout(timer);
                window.removeEventListener('lucy:open-tour', handleOpenTour);
            };
        }

        return () => window.removeEventListener('lucy:open-tour', handleOpenTour);
    }, [role]);

    return (
        <AnimatePresence>
            {open && <TourOverlay role={role} onClose={handleClose} />}
        </AnimatePresence>
    );
}
