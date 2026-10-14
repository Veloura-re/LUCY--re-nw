"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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
            title: "Campus Clock-In",
            description: "Tap Clock In on your dashboard upon arrival. The system validates network presence and records staff punctuality for administrative records.",
            icon: Clock,
            color: "bg-emerald-600"
        },
        {
            title: "Daily Roll Call",
            description: "Open Attendance to review your assigned class roster. Tap any student badge to toggle Absent or Late. Submitting roll call immediately alerts parents.",
            icon: Activity,
            color: "bg-eduGreen-500"
        },
        {
            title: "Live Term Marklists",
            description: "Access active academic marklists to input continuous assessment scores. Weighted totals and letter grades calculate automatically. Concluded terms are locked read-only.",
            icon: FileSpreadsheet,
            color: "bg-blue-600"
        },
        {
            title: "AI Exam Generator",
            description: "Generate quizzes and exams directly from lesson topics or scan existing paper tests using OCR. Schedule start and end times for student portal delivery.",
            icon: Target,
            color: "bg-purple-600"
        },
        {
            title: "Curriculum Repository",
            description: "Upload unit study packs, lesson outlines, and homework briefs. Track student download progress and answer parent inquiries in secure chat threads.",
            icon: BookOpen,
            color: "bg-amber-600"
        }
    ],

    HOMEROOM: [
        {
            title: "Cohort Shepherding",
            description: "You are the primary academic and behavioral guardian for your section. Oversee student attendance trends, section GPA averages, and individual welfare.",
            icon: Users,
            color: "bg-blue-600"
        },
        {
            title: "Absence Excuse Notes",
            description: "Review absence permits submitted by parents with medical notes. Approving a permit transitions past unexcused absences to Excused automatically.",
            icon: Shield,
            color: "bg-eduGreen-500"
        },
        {
            title: "Conduct & Term Remarks",
            description: "Author official terminal evaluations for Conduct, Effort, and Homeroom Recommendations. These qualitative remarks appear directly on official student report cards.",
            icon: Award,
            color: "bg-amber-600"
        },
        {
            title: "Confidential Notes",
            description: "Maintain private faculty-only behavioral and academic counseling logs. These records are strictly invisible to parents and students.",
            icon: Lock,
            color: "bg-purple-600"
        }
    ],

    STUDENT: [
        {
            title: "Daily Timetable",
            description: "View your personal weekly schedule, classroom locations, and assigned teachers at a glance. Never miss a period or room change.",
            icon: Calendar,
            color: "bg-blue-600"
        },
        {
            title: "Digital Exams",
            description: "Take timed online tests and quizzes during active testing windows. Answers save securely and objective scores grade instantly.",
            icon: Trophy,
            color: "bg-yellow-600"
        },
        {
            title: "Study Resources",
            description: "Download lesson notes, syllabus packs, and assignment briefs. Upload completed homework directly to your subject teachers before the deadline.",
            icon: BookOpen,
            color: "bg-orange-600"
        },
        {
            title: "The Sanctuary",
            description: "An anonymous, pseudonymous peer mental health and scholastic discussion space for Grades 7-12. Protected with zero-doxxing safety moderation.",
            icon: Sparkles,
            color: "bg-purple-600"
        }
    ],

    PARENT: [
        {
            title: "Multi-Child Linking",
            description: "Connect all your children using their 8-character student admission code or QR badge. Switch between children instantly from the top header.",
            icon: HeartHandshake,
            color: "bg-blue-600"
        },
        {
            title: "Real-Time Attendance",
            description: "Receive instant notifications if your child is marked absent. Inspect detailed monthly presence calendars and punctuality trends.",
            icon: Bell,
            color: "bg-amber-600"
        },
        {
            title: "Digital Tuition Settlement",
            description: "Inspect school fee structures and settle tuition invoices online via Chapa (Telebirr/CBE) or Stripe with instant downloadable receipts.",
            icon: CreditCard,
            color: "bg-eduGreen-600"
        },
        {
            title: "Absence Excuse Permits",
            description: "Submit dated absence permits with optional medical notes directly to homeroom teachers and administration to excuse planned absences.",
            icon: Shield,
            color: "bg-purple-600"
        }
    ],

    PRINCIPAL: [
        {
            title: "Campus Pulse & Roster",
            description: "Oversee real-time school attendance, staff punctuality, and student enrollment dossiers across all grades and sections.",
            icon: Activity,
            color: "bg-blue-600"
        },
        {
            title: "Clash-Free Timetable",
            description: "Build weekly master timetables with automated conflict detection. Prevents teacher and classroom double-bookings deterministically.",
            icon: Sliders,
            color: "bg-purple-600"
        },
        {
            title: "Term & Gradebook Locking",
            description: "Manage academic terms. When a term concludes, lock marklists to freeze grades, prevent post-deadline tampering, and generate official report cards.",
            icon: Target,
            color: "bg-red-600"
        },
        {
            title: "Student Admissions & QR",
            description: "Admit new scholars, issue official student admission codes, and print QR identity tokens for automated attendance and parent linking.",
            icon: GraduationCap,
            color: "bg-amber-600"
        }
    ],

    OWNER: [
        {
            title: "Executive Cash Flow",
            description: "Monitor real-time institutional tuition collection rates, outstanding parent balances, and total institutional revenue meters.",
            icon: Shield,
            color: "bg-amber-600"
        },
        {
            title: "Official Banking Channels",
            description: "Configure verified school bank accounts (CBE, Telebirr, Stripe) in /dashboard/finance to ensure tuition payments route directly to the school.",
            icon: CreditCard,
            color: "bg-eduGreen-600"
        },
        {
            title: "Faculty Payroll & Expenses",
            description: "Review and authorize monthly staff salary disbursements and track institutional operational outflow with full audit logging.",
            icon: Wallet,
            color: "bg-blue-600"
        },
        {
            title: "Governance & Approvals",
            description: "Cryptographically sign off on high-impact administrative proposals submitted by Principals, including fee changes and structural adjustments.",
            icon: Building2,
            color: "bg-purple-600"
        }
    ],

    SUPERADMIN: [
        {
            title: "Platform Infrastructure",
            description: "Monitor cross-tenant health telemetry and inspect active academies, subscription tiers, and system latency across all schools.",
            icon: Shield,
            color: "bg-red-600"
        },
        {
            title: "24-Hour Error Tracking",
            description: "Inspect real-time server error logs, grouped failure signatures, and route anomalies. Errors older than 90 days are pruned automatically.",
            icon: Activity,
            color: "bg-amber-600"
        },
        {
            title: "School Licensing & Owners",
            description: "Review pending academy registrations, verify official credentials, toggle active status, and link executive owner accounts.",
            icon: Building2,
            color: "bg-blue-600"
        },
        {
            title: "Safety Escalation Desk",
            description: "Oversee emergency distress reports from The Sanctuary across campuses, protecting vulnerable scholars while maintaining strict anonymity.",
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
                                    role_onboarding // {normalizedRole}
                                </span>
                                <h2 className="text-base sm:text-lg font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                                    Operational Guide
                                </h2>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <Link
                                href={`/guidelines?role=${normalizedRole}`}
                                target="_blank"
                                className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wider font-bold hidden sm:inline-flex items-center gap-1"
                            >
                                full_guidelines <ArrowRight className="w-3 h-3" />
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
