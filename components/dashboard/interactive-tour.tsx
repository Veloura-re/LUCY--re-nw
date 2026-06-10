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

                    <div style={{
                        position: 'relative', zIndex: 1,
                        background: `linear-gradient(135deg, ${palette.bg} 0%, rgba(9,9,11,0.97) 100%)`,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 24,
                        boxShadow: `0 32px 60px rgba(0,0,0,0.75), inset 0 1px 0 ${palette.border}, 0 0 50px ${palette.glow}`,
                        backdropFilter: 'blur(28px)',
                        overflow: 'hidden',
                        padding: '1.5rem',
                    }}>
                        {/* Animated top bar */}
                        <motion.div
                            animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                            transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                            style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                                background: `linear-gradient(90deg, transparent, ${palette.accent}, ${palette.text}, ${palette.accent}, transparent)`,
                                backgroundSize: '200% 100%',
                            }}
                        />

                        {/* Header row */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <WobblyIcon Icon={Icon} color={palette.accent} />
                                <div>
                                    <p style={{ fontSize: '0.6rem', fontWeight: 700, color: palette.accent, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 3, opacity: 0.8 }}>
                                        {current + 1} / {steps.length}
                                    </p>
                                    <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#f4f4f5', letterSpacing: '-0.01em', lineHeight: 1.2, margin: 0 }}>
                                        {step.title}
                                    </h3>
                                </div>
                            </div>
                            <motion.button
                                whileHover={{ scale: 1.15, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                                onClick={onClose}
                                style={{
                                    width: 30, height: 30, borderRadius: 9, border: `1px solid rgba(255,255,255,0.08)`,
                                    background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center',
                                    justifyContent: 'center', cursor: 'pointer', color: '#71717a', flexShrink: 0,
                                }}
                            >
                                <X size={13} />
                            </motion.button>
                        </div>

                        {/* Description */}
                        <p style={{ fontSize: '0.82rem', color: '#a1a1aa', lineHeight: 1.7, margin: '0 0 1.1rem 0', fontWeight: 400 }}>
                            {step.description}
                        </p>

                        {/* Progress dots */}
                        <div style={{ display: 'flex', gap: 5, marginBottom: '1.1rem', alignItems: 'center' }}>
                            {steps.map((_, i) => {
                                const p = PALETTES[i % PALETTES.length];
                                return (
                                    <motion.button
                                        key={i}
                                        onClick={() => goTo(i)}
                                        animate={{
                                            width: i === current ? 26 : 8,
                                            background: i === current ? p.accent : 'rgba(255,255,255,0.12)',
                                            scale: i === current ? 1 : 0.85,
                                        }}
                                        transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                                        whileHover={{ scale: 1.3 }}
                                        style={{
                                            height: 5, borderRadius: 99, border: 'none', cursor: 'pointer',
                                            boxShadow: i === current ? `0 0 8px ${p.accent}` : 'none',
                                        }}
                                    />
                                );
                            })}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '0.6rem' }}>
                            {!isFirst && (
                                <motion.button
                                    whileHover={{ scale: 1.04, x: -2 }}
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                                    onClick={handlePrev}
                                    style={{
                                        flex: '0 0 auto', padding: '0.55rem 1rem', borderRadius: 12, cursor: 'pointer',
                                        border: `1px solid rgba(255,255,255,0.1)`,
                                        background: 'rgba(255,255,255,0.04)',
                                        color: '#71717a', fontSize: '0.7rem', fontWeight: 700,
                                        letterSpacing: '0.1em', textTransform: 'uppercase',
                                        display: 'flex', alignItems: 'center', gap: 5,
                                    }}
                                >
                                    <ChevronLeft size={13} /> Back
                                </motion.button>
                            )}
                            <motion.button
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.94 }}
                                transition={{ type: 'spring', stiffness: 600, damping: 22 }}
                                onClick={handleNext}
                                style={{
                                    flex: 1, padding: '0.6rem 1.2rem', borderRadius: 12, cursor: 'pointer',
                                    border: `1px solid ${palette.border}`,
                                    background: `linear-gradient(135deg, ${palette.bg}, rgba(9,9,11,0.6))`,
                                    color: palette.text, fontSize: '0.72rem', fontWeight: 800,
                                    letterSpacing: '0.14em', textTransform: 'uppercase',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                                    boxShadow: `0 0 20px ${palette.glow}`,
                                    position: 'relative', overflow: 'hidden',
                                }}
                            >
                                <motion.div
                                    animate={{ x: ['-110%', '120%'] }}
                                    transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5, ease: 'easeInOut' }}
                                    style={{
                                        position: 'absolute', top: 0, left: 0, width: '40%', height: '100%',
                                        background: `linear-gradient(90deg, transparent, ${palette.accent}40, transparent)`,
                                        pointerEvents: 'none',
                                    }}
                                />
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
