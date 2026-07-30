"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    ChevronRight,
    X,
    Shield,
    Zap,
    Target,
    Activity,
    Users,
    Settings,
    BookOpen,
    Trophy,
    Calendar,
    CreditCard,
    LayoutDashboard,
    Wallet,
    Bell,
    Award,
    Network,
    Fingerprint,
    Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface TutorialStep {
    title: string;
    description: string;
    icon: any;
    color: string;
}

const TUTORIAL_DATA: Record<string, TutorialStep[]> = {
    OWNER: [
        {
            title: "Executive Control",
            description: "Welcome to your high-level administrative interface. Oversee all institutional data, financials, and personnel from a single vantage point.",
            icon: Shield,
            color: "bg-amber-500"
        },
        {
            title: "Financial Overview",
            description: "Access complete institutional ledger data. Monitor active revenue, track expenses, and view long-term fiscal health.",
            icon: CreditCard,
            color: "bg-eduGreen-500"
        },
        {
            title: "Personnel Governance",
            description: "Manage your directorial staff. Delegate full or partial permissions to Principals who will manage day-to-day scholastic activity.",
            icon: Users,
            color: "bg-blue-500"
        },
        {
            title: "System Integrity",
            description: "Ensure operational perfection across the institution. Monitor real-time status and security metrics to keep your neural network functioning smoothly.",
            icon: Activity,
            color: "bg-purple-500"
        }
    ],
    PRINCIPAL: [
        {
            title: "Institutional Pulse",
            description: "Direct oversight of all system metrics. Monitor performance and attendance across the entire facility in real-time.",
            icon: Activity,
            color: "bg-blue-500"
        },
        {
            title: "Academic Governance",
            description: "Customize marklist parameters and institutional grading logic to align with your academic standards.",
            icon: Target,
            color: "bg-red-500"
        },
        {
            title: "Faculty Sync",
            description: "Manage your learned scholars. Coordinate faculty assignments and oversee staffing protocols with precision.",
            icon: Users,
            color: "bg-eduGreen-500"
        },
        {
            title: "Fiscal Oversight",
            description: "Monitor institutional revenue and fee collection. Real-time ledger tracking for all financial operations.",
            icon: CreditCard,
            color: "bg-orange-500"
        },
        {
            title: "Expense Nexus",
            description: "Institutional disbursement hub. Manage faculty payroll and track institutional outflow with cryptographic precision.",
            icon: Wallet,
            color: "bg-amber-500"
        },
        {
            title: "Strategic Settings",
            description: "Configure foundational school parameters. Adjust the core architecture of your institution.",
            icon: Settings,
            color: "bg-purple-500"
        },
        {
            title: "Neural Diagnostic",
            description: "Identify and bridge disconnected nodes. Ensure institutional integrity by linking orphaned faculty and scholars.",
            icon: Network,
            color: "bg-eduGreen-600"
        }
    ],
    TEACHER: [
        {
            title: "Neural Classroom",
            description: "Access your active learning environments. Manage classes and daily schedules from a clean tactical interface.",
            icon: BookOpen,
            color: "bg-orange-500"
        },
        {
            title: "Assessment Uplink",
            description: "Deploy exams and record marks directly to the neural grid. Automated grading sync for maximum efficiency.",
            icon: Target,
            color: "bg-red-500"
        },
        {
            title: "Data Grids",
            description: "Manage complex marklists with high-speed spreadsheet interfaces. Real-time synchronization of academic results.",
            icon: Zap,
            color: "bg-eduGreen-500"
        },
        {
            title: "Student Trajectory",
            description: "Track the growth vectors of every student. Monitor progress and maintain detailed academic records.",
            icon: Activity,
            color: "bg-blue-500"
        },
        {
            title: "Neural Ledger",
            description: "Your personalized fiscal record. Access detailed paychecks, earnings history, and institutional disburstments.",
            icon: Wallet,
            color: "bg-amber-500"
        },
        {
            title: "Neural Communications",
            description: "Secure, real-time messaging with parents and students. Maintain clear communication pathways.",
            icon: Sparkles,
            color: "bg-purple-500"
        },
        {
            title: "Neural Attendance",
            description: "Synchronize student presence at the point of interaction. High-precision tactical attendance tracking.",
            icon: Activity,
            color: "bg-eduGreen-500"
        }
    ],
    STUDENT: [
        {
            title: "Tactical Hub",
            description: "Your primary command center. View your current standing, upcoming challenges, and achievement status at a glance.",
            icon: Trophy,
            color: "bg-yellow-500"
        },
        {
            title: "Temporal Grid",
            description: "Never miss a sync point. Your complete class timetable, synchronized in real-time with school scheduling.",
            icon: Calendar,
            color: "bg-blue-500"
        },
        {
            title: "Knowledge Milestones",
            description: "Access graded reports and exam results. Monitor your ascent through the academic ranks.",
            icon: Zap,
            color: "bg-eduGreen-500"
        },
        {
            title: "Learning Resources",
            description: "Access digital curriculum and study materials. Your entire library, accessible on the neural grid.",
            icon: BookOpen,
            color: "bg-orange-500"
        },
        {
            title: "Neural Link",
            description: "Interact with the AI assistant for personalized learning support and institutional guidance.",
            icon: Sparkles,
            color: "bg-purple-500"
        },
        {
            title: "Achievement Nexus",
            description: "Monitor your digital ascent. Track earned badges and institutional recognition for your scholarly efforts.",
            icon: Award,
            color: "bg-yellow-500"
        }
    ],
    PARENT: [
        {
            title: "Ward Oversight",
            description: "Complete visibility into your ward's progress. Monitor attendance and academic performance remotely.",
            icon: Shield,
            color: "bg-blue-500"
        },
        {
            title: "Fiscal Ledger",
            description: "Manage institutional billing and student fees. Secure payment gateways for all academic commitments.",
            icon: CreditCard,
            color: "bg-orange-500"
        },
        {
            title: "Administrative Clearances",
            description: "Submit absence permits and manage authorizations with high-security biometric validation.",
            icon: Zap,
            color: "bg-eduGreen-500"
        },
        {
            title: "Direct Support",
            description: "Instant messaging channels with faculty and administration. Direct uplink for ward-related queries.",
            icon: Sparkles,
            color: "bg-purple-500"
        },
        {
            title: "Verification Nexus",
            description: "Authorize ward activities and administrative requests with secure cryptographical validation.",
            icon: Fingerprint,
            color: "bg-eduGreen-600"
        },
        {
            title: "Neural Signals",
            description: "Real-time updates on your ward's institutional status. Stay informed with high-priority pulse notifications.",
            icon: Bell,
            color: "bg-amber-500"
        }
    ]
};

export function RoleTutorial({ role, onClose }: { role: string; onClose?: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [mounted, setMounted] = useState(false);

    const steps = TUTORIAL_DATA[role] || TUTORIAL_DATA.STUDENT;

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        localStorage.setItem(`tutorial_seen_${role}`, 'true');
        onClose?.();
    };

    if (!mounted) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-white/80 dark:bg-black/80 backdrop-blur-2xl"
            >
                {/* Background Ambient Glows */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{
                            scale: [1, 1.2, 1],
                            opacity: [0.1, 0.2, 0.1]
                        }}
                        transition={{ duration: 9.8, repeat: Infinity }}
                        className={cn("absolute -top-[20%] -left-[20%] w-[60%] h-[60%] rounded-full blur-[140px]", steps[currentStep].color)}
                    />
                    <motion.div
                        animate={{
                            scale: [1.2, 1, 1.2],
                            opacity: [0.1, 0.2, 0.1]
                        }}
                        transition={{ duration: 7.8, repeat: Infinity }}
                        className={cn("absolute -bottom-[20%] -right-[20%] w-[60%] h-[60%] rounded-full blur-[140px]", steps[currentStep].color)}
                    />
                </div>

                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    transition={{ type: "spring", damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-2xl bg-white/40 dark:bg-zinc-950/40 border border-zinc-300 dark:border-white/10 rounded-3xl p-8 md:p-12 shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden group"
                >
                    {/* Glass Surface Scanline */}
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent,transparent_45%,rgba(255,255,255,0.05)_50%,transparent_55%,transparent)] bg-[length:200%_200%] animate-[shimmer_5s_infinite] pointer-events-none" />

                    <div className="relative z-10">
                        {/* Header Area */}
                        <div className="flex items-center justify-between mb-12">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center bg-white/5 border border-zinc-300 dark:border-white/10 shadow-2xl")}>
                                    <Sparkles className={cn("w-6 h-6", steps[currentStep].color.replace('bg-', 'text-'))} />
                                </div>
                                <div>
                                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-zinc-900 dark:text-white/40">Neural Protocol</h2>
                                    <h1 className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white italic">Onboarding v1</h1>
                                </div>
                            </div>
                            <button
                                onClick={handleComplete}
                                className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 hover:bg-white/10 border border-zinc-200 dark:border-white/5 transition-all text-zinc-900 dark:text-white/30 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Step Content */}
                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            <div className="order-2 md:order-1">
                                <AnimatePresence mode="wait">
                                    <motion.div
                                        key={currentStep}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        transition={{ duration: 0.2, ease: "circOut" }}
                                    >
                                        <div className={cn("inline-flex px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border mb-6",
                                            steps[currentStep].color.replace('bg-', 'border-').replace('text-', 'border-'),
                                            steps[currentStep].color.replace('bg-', 'bg-').replace('bg-', 'bg-opacity-10 bg-'),
                                            steps[currentStep].color.replace('bg-', 'text-')
                                        )}>
                                            Module {currentStep + 1} of {steps.length}
                                        </div>
                                        <h3 className="text-3xl md:text-4xl font-black text-zinc-900 dark:text-white uppercase tracking-tight italic mb-4 leading-none">
                                            {steps[currentStep].title}
                                        </h3>
                                        <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base font-medium leading-relaxed tracking-wide italic">
                                            {steps[currentStep].description}
                                        </p>
                                    </motion.div>
                                </AnimatePresence>
                            </div>

                            <div className="order-1 md:order-2 flex justify-center">
                                <div className="relative">
                                    {/* Holographic Ring */}
                                    <div className={cn("absolute inset-0 rounded-full blur-2xl opacity-20 animate-pulse", steps[currentStep].color)} />
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 19.8, repeat: Infinity, ease: "linear" }}
                                        className="absolute -inset-10 border border-dashed border-zinc-300 dark:border-white/10 rounded-full opacity-30"
                                    />

                                    <div className={cn(
                                        "relative w-32 h-32 md:w-48 md:h-48 rounded-2xl flex items-center justify-center p-8 bg-white/40 dark:bg-black/40 border border-zinc-300 dark:border-white/10 backdrop-blur-md shadow-2xl overflow-hidden group-hover:scale-105 transition-transform duration-300",
                                    )}>
                                        <div className={cn("absolute inset-0 opacity-10", steps[currentStep].color)} />
                                        <AnimatePresence mode="wait">
                                            <motion.div
                                                key={currentStep}
                                                initial={{ scale: 0, rotate: -45 }}
                                                animate={{ scale: 1, rotate: 0 }}
                                                exit={{ scale: 0, rotate: 45 }}
                                                transition={{ type: "spring", damping: 15 }}
                                            >
                                                {(() => {
                                                    const Icon = steps[currentStep].icon;
                                                    return <Icon className={cn("w-12 h-12 md:w-20 md:h-20 text-zinc-900 dark:text-white relative z-10")} />;
                                                })()}
                                            </motion.div>
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="mt-16 flex items-center justify-between">
                            <div className="flex gap-2">
                                {steps.map((_, i) => (
                                    <div
                                        key={i}
                                        className={cn(
                                            "h-1.5 rounded-full transition-all duration-300",
                                            i === currentStep ? cn("w-8", steps[currentStep].color) : "w-1.5 bg-white/10"
                                        )}
                                    />
                                ))}
                            </div>

                            <Button
                                onClick={handleNext}
                                className={cn(
                                    "px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-[0.3em] font-orbitron transition-all active:scale-95 shadow-2xl",
                                    steps[currentStep].color,
                                    "text-black hover:opacity-90 grayscale-[0.2] hover:grayscale-0"
                                )}
                            >
                                {currentStep === steps.length - 1 ? "Initialize Portal" : "Next Protocol"}
                                <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
