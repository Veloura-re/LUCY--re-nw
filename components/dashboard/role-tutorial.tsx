"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
    Sparkles,
    ChevronRight,
    X,
    Lock,
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
    Search,
    GraduationCap,
    HeartHandshake,
    Building2,
    Sliders,
    Clock,
    FileSpreadsheet,
    HelpCircle,
    ArrowRight
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
    TEACHER: [
        {
            title: "Clock In",
            description: "When you arrive, tap Clock In. This saves your arrival time.",
            icon: Clock,
            color: "bg-emerald-600"
        },
        {
            title: "Daily Roll Call",
            description: "Open Attendance, then mark each student present, absent, or late. Parents are told when you submit it.",
            icon: Activity,
            color: "bg-eduGreen-500"
        },
        {
            title: "Grades",
            description: "Enter scores here. LUCY works out totals and grades for you. Finished terms cannot be changed.",
            icon: FileSpreadsheet,
            color: "bg-blue-600"
        },
        {
            title: "AI Exam Generator",
            description: "Make a quiz from a lesson topic or scan a paper test. Choose when students can take it.",
            icon: Target,
            color: "bg-purple-600"
        },
        {
            title: "Learning Materials",
            description: "Upload lessons and homework here. You can see downloads and reply to parents.",
            icon: BookOpen,
            color: "bg-amber-600"
        }
    ],

    HOMEROOM: [
        {
            title: "Your Class",
            description: "You look after this class. Check attendance, results, and students who may need help.",
            icon: Users,
            color: "bg-blue-600"
        },
        {
            title: "Absence Excuse Notes",
            description: "Read absence requests from parents. Approve one to mark the absence as excused.",
            icon: Shield,
            color: "bg-eduGreen-500"
        },
        {
            title: "Conduct & Term Remarks",
            description: "Write comments about behaviour and effort. They appear on the student report card.",
            icon: Award,
            color: "bg-amber-600"
        },
        {
            title: "Confidential Notes",
            description: "Keep private staff notes here. Parents and students cannot see them.",
            icon: Lock,
            color: "bg-purple-600"
        }
    ],

    STUDENT: [
        {
            title: "Daily Timetable",
            description: "See your weekly classes, rooms, and teachers in one place.",
            icon: Calendar,
            color: "bg-blue-600"
        },
        {
            title: "Digital Exams",
            description: "Take tests and quizzes online. Your answers save as you go, and some scores appear right away.",
            icon: Trophy,
            color: "bg-yellow-600"
        },
        {
            title: "Study Resources",
            description: "Download class notes and upload homework before it is due.",
            icon: BookOpen,
            color: "bg-orange-600"
        },
        {
            title: "The Sanctuary",
            description: "A safe space for Grades 7–12 to talk about school and wellbeing. Use a nickname; do not share personal details.",
            icon: Sparkles,
            color: "bg-purple-600"
        }
    ],

    PARENT: [
        {
            title: "Your Children",
            description: "Add each child with their student code or QR card. Switch between children at the top of the page.",
            icon: HeartHandshake,
            color: "bg-blue-600"
        },
        {
            title: "Real-Time Attendance",
            description: "Get a message when your child is absent. Check their attendance calendar anytime.",
            icon: Bell,
            color: "bg-amber-600"
        },
        {
            title: "School Fees",
            description: "See school fees and pay online with Chapa or Stripe. Download your receipt straight away.",
            icon: CreditCard,
            color: "bg-eduGreen-600"
        },
        {
            title: "Absence Excuse Permits",
            description: "Tell the school about a planned absence and add a medical note if needed.",
            icon: Shield,
            color: "bg-purple-600"
        }
    ],

    PRINCIPAL: [
        {
            title: "School Overview",
            description: "See attendance, staff arrival times, and student numbers across your school.",
            icon: Activity,
            color: "bg-blue-600"
        },
        {
            title: "Clash-Free Timetable",
            description: "Build the weekly timetable. LUCY warns you if a teacher or room is booked twice.",
            icon: Sliders,
            color: "bg-purple-600"
        },
        {
            title: "Term & Gradebook Locking",
            description: "End a term to lock grades and make report cards. Locked grades cannot be changed.",
            icon: Target,
            color: "bg-red-600"
        },
        {
            title: "Student Admissions & QR",
            description: "Add new students, create their student codes, and print QR cards for attendance and parent access.",
            icon: GraduationCap,
            color: "bg-amber-600"
        }
    ],

    OWNER: [
        {
            title: "Money Overview",
            description: "See fees collected, unpaid balances, and total income.",
            icon: Shield,
            color: "bg-amber-600"
        },
        {
            title: "Payment Accounts",
            description: "Set up the school bank and payment accounts here so fees go to the right place.",
            icon: CreditCard,
            color: "bg-eduGreen-600"
        },
        {
            title: "Faculty Payroll & Expenses",
            description: "Review and approve staff pay. You can also see school spending.",
            icon: Wallet,
            color: "bg-blue-600"
        },
        {
            title: "Governance & Approvals",
            description: "Review and approve important school changes, such as fees or school setup.",
            icon: Building2,
            color: "bg-purple-600"
        }
    ],

    SUPERADMIN: [
        {
            title: "Platform Status",
            description: "Check whether all schools and the platform are working normally.",
            icon: Shield,
            color: "bg-red-600"
        },
        {
            title: "24-Hour Error Tracking",
            description: "See recent system errors. Old errors are removed after 90 days.",
            icon: Activity,
            color: "bg-amber-600"
        },
        {
            title: "School Licensing & Owners",
            description: "Review new school requests, check their details, and turn access on or off.",
            icon: Building2,
            color: "bg-blue-600"
        },
        {
            title: "Safety Escalation Desk",
            description: "Review urgent safety reports from Sanctuary while protecting student privacy.",
            icon: Sparkles,
            color: "bg-purple-600"
        }
    ]
};

export function RoleTutorial({ role, onClose }: { role: string; onClose?: () => void }) {
    const [currentStep, setCurrentStep] = useState(0);
    const [mounted, setMounted] = useState(false);

    const normalizedRole = role?.toUpperCase();
    const steps = TUTORIAL_DATA[normalizedRole] || TUTORIAL_DATA.TEACHER;

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
        if (typeof window !== "undefined") {
            localStorage.setItem(`tutorial_seen_${normalizedRole}`, "true");
        }
        onClose?.();
    };

    if (!mounted) return null;

    const currentModule = steps[currentStep] || steps[0];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2000] flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 dark:bg-black/85 backdrop-blur-md"
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0, y: 15 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.95, opacity: 0, y: 15 }}
                    transition={{ type: "spring", damping: 25, stiffness: 220 }}
                    className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-slate-200 dark:border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl overflow-hidden font-mono tracking-tight"
                >
                    {/* Header Area */}
                    <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-3">
                            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center text-white", currentModule.color)}>
                                <Sparkles className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[9px] uppercase tracking-[0.25em] text-slate-500 dark:text-zinc-500 font-bold block">
                                    Quick guide for {normalizedRole.toLowerCase()}
                                </span>
                                <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                    Getting started
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                href={`/guidelines?role=${normalizedRole}`}
                                target="_blank"
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wider font-bold hidden sm:inline-flex items-center gap-1"
                            >
                                Full guide <ArrowRight className="w-3 h-3" />
                            </Link>
                            <button
                                onClick={handleComplete}
                                className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-8 items-center min-h-[180px]">
                        <div>
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentStep}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10 }}
                                    transition={{ duration: 0.15 }}
                                    className="space-y-3"
                                >
                                    <div className="inline-flex px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-zinc-300">
                                        Step {currentStep + 1} of {steps.length}
                                    </div>
                                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                        {currentModule.title}
                                    </h3>
                                    <p className="text-slate-600 dark:text-zinc-400 text-xs sm:text-sm leading-relaxed">
                                        {currentModule.description}
                                    </p>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="hidden md:flex items-center justify-center">
                            <div className="w-28 h-28 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 shadow-inner">
                                {(() => {
                                    const Icon = currentModule.icon;
                                    return <Icon className="w-12 h-12 text-slate-800 dark:text-white" />;
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Footer Controls */}
                    <div className="mt-10 pt-6 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                        <div className="flex gap-1.5">
                            {steps.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentStep(i)}
                                    className={cn(
                                        "h-1.5 rounded-full transition-all duration-200",
                                        i === currentStep
                                            ? "w-6 bg-slate-900 dark:bg-white"
                                            : "w-1.5 bg-slate-300 dark:bg-white/20"
                                    )}
                                />
                            ))}
                        </div>

                        <div className="flex items-center gap-2">
                            <Link
                                href={`/guidelines?role=${normalizedRole}`}
                                target="_blank"
                                className="sm:hidden text-[9px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider mr-2"
                            >
                                guidelines
                            </Link>
                            <Button
                                onClick={handleNext}
                                size="sm"
                                className="text-xs uppercase tracking-wider font-bold"
                            >
                                {currentStep === steps.length - 1 ? "Get Started" : "Next Step"}
                                <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}
