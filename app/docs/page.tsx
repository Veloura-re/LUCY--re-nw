"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    ArrowLeft,
    BookOpen,
    Terminal,
    Code,
    ChevronRight,
    Users,
    Shield,
    GraduationCap,
    HeartHandshake,
    Building2,
    Sliders,
    ArrowRight,
    CheckCircle2,
    HelpCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ScanLines,
    CustomCursor,
    AnimatedGrid,
    TiltCard,
    Reveal,
    PageFooter,
    GlitchText,
    ScanBar
} from "@/components/public/animations";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";

interface DocItem {
    name: string;
    description: string;
    howTo: string[];
    link?: string;
    badge?: string;
}

interface DocSection {
    id: string;
    title: string;
    subtitle: string;
    items: DocItem[];
}

const docSections: DocSection[] = [
    {
        id: "01",
        title: "Role Guidelines & User Manuals",
        subtitle: "Official operating instructions for each user role in the LUCY ecosystem.",
        items: [
            {
                name: "Subject Teacher Handbook",
                badge: "Faculty",
                description: "Complete guide on daily roll call, marklist grade entry, AI exam generation, and staff clock-in.",
                howTo: [
                    "Tap Clock In at campus arrival to record presence.",
                    "Open /dashboard/attendance to record present, absent, or late students.",
                    "Input continuous assessment scores on live academic marklists at /dashboard/marklist.",
                    "Upload lesson notes and syllabus resources via /dashboard/lessons."
                ],
                link: "/guidelines?role=TEACHER"
            },
            {
                name: "Homeroom Teacher Handbook",
                badge: "Section Shepherd",
                description: "Manage assigned class section, terminal conduct remarks, internal student notes, and parent absence notes.",
                howTo: [
                    "Record terminal conduct and effort remarks on student report cards.",
                    "Review and approve absence excuse permits submitted by parents.",
                    "Maintain confidential internal student notes for behavioral counseling.",
                    "Consolidate section grade totals before principal report printing."
                ],
                link: "/guidelines?role=HOMEROOM"
            },
            {
                name: "Student / Scholar Handbook",
                badge: "Learners",
                description: "Weekly timetable schedule, taking timed digital exams, downloading lesson packs, and The Sanctuary peer chat.",
                howTo: [
                    "View daily period timetable, room numbers, and subject teachers at /dashboard/student.",
                    "Take timed online quizzes and exams during active windows at /dashboard/student/exams.",
                    "Submit homework files or external drive links to teachers.",
                    "Access The Sanctuary for anonymous, safe peer support."
                ],
                link: "/guidelines?role=STUDENT"
            },
            {
                name: "Parent & Guardian Handbook",
                badge: "Family",
                description: "Link multiple children, track real-time attendance, view live grades, pay school tuition, and submit medical notes.",
                howTo: [
                    "Link your child using their 8-character admission code or QR badge at /dashboard/parent.",
                    "Receive 3-second absence notifications if your child is unaccounted for.",
                    "Pay tuition fees via Chapa (Telebirr/CBE) or Stripe with instant receipts at /dashboard/parent/billing.",
                    "Submit dated absence excuse permits directly to the school."
                ],
                link: "/guidelines?role=PARENT"
            },
            {
                name: "Principal & Academic Director Handbook",
                badge: "Administration",
                description: "Curriculum governance, clash-free master timetables, faculty assignments, student admissions, and marklist locking.",
                howTo: [
                    "Configure academic terms (active vs concluded) at /dashboard/director/marklist.",
                    "Build weekly timetable schedules with automated collision detection at /dashboard/timetable.",
                    "Enroll new scholars and generate student admission codes and QR badges.",
                    "Lock concluded term marklists to prevent post-deadline grade tampering."
                ],
                link: "/guidelines?role=PRINCIPAL"
            },
            {
                name: "School Owner & Executive Governance",
                badge: "Ownership",
                description: "Real-time fee collection telemetry, official bank account setup (CBE, Telebirr), faculty payroll, and license renewal.",
                howTo: [
                    "Configure official school bank accounts in /dashboard/finance to route parent settlements directly.",
                    "Set grade-specific fee structures, tuition deadlines, and late payment policies.",
                    "Approve faculty payroll disbursements and operating expense vouchers.",
                    "Renew LUCY OS platform subscription via Birr checkout."
                ],
                link: "/guidelines?role=OWNER"
            },
            {
                name: "SuperAdmin & Infrastructure Handbook",
                badge: "Platform Ops",
                description: "Multi-tenant health telemetry, 24-hour server error monitoring, school approvals, and safety escalations.",
                howTo: [
                    "Monitor 24-hour server health and grouped error logs at /admin/dashboard.",
                    "Authorize pending school registrations and assign executive owners.",
                    "Inspect global audit logs and disaster recovery restore points.",
                    "Moderate emergency cross-campus escalations in The Sanctuary."
                ],
                link: "/guidelines?role=SUPERADMIN"
            }
        ]
    },
    {
        id: "02",
        title: "Attendance & Roll Call Engine",
        subtitle: "High-precision daily attendance tracking and instant absence notifications.",
        items: [
            {
                name: "Taking Roll Call",
                description: "Fast in-class roster roll call with one-tap toggle between Present, Absent, and Late.",
                howTo: [
                    "Open /dashboard/attendance and select your assigned class section.",
                    "All enrolled students default to Present.",
                    "Tap any student card to mark Absent (red) or Late (amber).",
                    "Click 'Submit Roll Call' to commit the record to the immutable audit log."
                ]
            },
            {
                name: "Automated Absence Alerts",
                description: "Instant notification dispatched to parents when a scholar is marked unexcused absent.",
                howTo: [
                    "When roll call is submitted with an unexcused absence, an SMS/app alert is queued.",
                    "The parent receives the exact period, time, and class where the absence was recorded.",
                    "Parents can immediately respond with a digital excuse note via their portal."
                ]
            },
            {
                name: "Absence Excuse Authorizations",
                description: "Digital medical permit and absence excuse submission workflow.",
                howTo: [
                    "Parents submit excuse permit with dates, reason, and doctor's note.",
                    "Homeroom Teacher or Principal inspects the request in /dashboard/attendance.",
                    "Approving the permit automatically updates past unexcused absences to Excused."
                ]
            }
        ]
    },
    {
        id: "03",
        title: "Grading & Continuous Assessment",
        subtitle: "Weighted gradebook, marklists, term finalization, and report card synthesis.",
        items: [
            {
                name: "Live Term Marklist Entry",
                description: "Keyboard-friendly spreadsheet interface for entering quiz, test, and exam scores.",
                howTo: [
                    "Open /dashboard/marklist. Active terms are marked with a 'Live Term' badge.",
                    "Select your subject marklist card.",
                    "Input numeric scores (0 to maximum points allowed per column).",
                    "Weighted totals and letter grades calculate automatically in real-time.",
                    "Click 'Save Marklist'."
                ]
            },
            {
                name: "Term Finalization & Marklist Locking",
                description: "Prevent post-deadline grade adjustments and preserve historical record integrity.",
                howTo: [
                    "At the end of an academic term, the Principal clicks 'Finalize & Lock Term' in /dashboard/director/marklist.",
                    "Once locked, write permissions are revoked across all subject marklists for that term.",
                    "Historical marklists remain accessible in read-only mode in the Finished Terms Archive at /dashboard/marklist/archive."
                ]
            },
            {
                name: "Terminal Report Card Generation",
                description: "One-click compilation of official transcripts with conduct remarks and QR seals.",
                howTo: [
                    "Ensure subject teachers have entered marks and homeroom teachers have logged conduct remarks.",
                    "Open /dashboard/director/marklist or student profile.",
                    "Click 'Export Official PDF Transcript'.",
                    "The system renders a vector PDF with scannable verification seals."
                ]
            }
        ]
    },
    {
        id: "04",
        title: "Timetable & Collision Resolution Engine",
        subtitle: "Deterministic weekly scheduling preventing teacher and room double-bookings.",
        items: [
            {
                name: "Configuring Period Slots",
                description: "Define daily bell schedule, period durations, and break times.",
                howTo: [
                    "Open /dashboard/timetable as Principal.",
                    "Define daily periods (e.g. Period 1: 08:30 - 09:15, Recess: 10:45 - 11:15).",
                    "Apply the bell schedule across weekdays (Monday through Friday)."
                ]
            },
            {
                name: "Collision Detection Algorithm",
                description: "Automated pre-flight conflict check verifying instructor and classroom availability.",
                howTo: [
                    "Assign a teacher and subject to a period slot.",
                    "The system checks: Is the teacher already booked in another classroom? Is the room already occupied?",
                    "If a conflict is detected, the slot turns red with a collision warning alert.",
                    "Reassign the slot or instructor to resolve the clash."
                ]
            }
        ]
    },
    {
        id: "05",
        title: "Finance, Billing & Banking Channels",
        subtitle: "Institutional fee collection, official bank account setup, and payment gateways.",
        items: [
            {
                name: "Configuring Official School Accounts",
                description: "Ensure parent tuition settlements deposit directly into official school bank accounts.",
                howTo: [
                    "Navigate to /dashboard/finance as School Owner.",
                    "Under 'Institutional Banking Channels', add your official account (CBE, Telebirr, Stripe).",
                    "Enter the official Account Holder Name and Account Number.",
                    "Save and activate. Parent checkout screens will display these credentials."
                ]
            },
            {
                name: "Digital Parent Tuition Checkout",
                description: "Parents pay tuition online with instant receipt generation.",
                howTo: [
                    "Parent opens /dashboard/parent/billing.",
                    "Clicks 'Pay Now' on pending invoice and completes Chapa or Stripe checkout.",
                    "System updates invoice status to PAID and generates downloadable PDF receipt."
                ]
            }
        ]
    },
    {
        id: "06",
        title: "The Sanctuary Peer Support",
        subtitle: "Anonymous, pseudonymous peer mental health and scholastic resilience space.",
        items: [
            {
                name: "Student Anonymous Participation",
                description: "Safe peer discussion with zero student identity exposure.",
                howTo: [
                    "Students in Grade 7-12 access /dashboard/sanctuary.",
                    "A randomized pseudonymous callsign is assigned.",
                    "Students can share thoughts, discuss exam stress, or seek peer advice.",
                    "Emergency Exit button allows instant closing of the view."
                ]
            },
            {
                name: "Safety Sentinel Moderation",
                description: "Automated content moderation filtering extreme distress or harassment.",
                howTo: [
                    "Automated filters flag harassment, self-harm keywords, or doxxing attempts.",
                    "Flagged sessions are escalated to the SuperAdmin emergency desk at /admin/sanctuary.",
                    "SuperAdmin can terminate abusive sessions or alert school counseling leadership."
                ]
            }
        ]
    },
    {
        id: "07",
        title: "Legal, Compliance & Privacy",
        subtitle: "Regulatory alignment with FERPA, GDPR, and educational data privacy standards.",
        items: [
            {
                name: "Terms of Service",
                description: "Platform terms governing institutional licensing and user responsibilities.",
                howTo: ["Read full legal agreement at /terms."],
                link: "/terms"
            },
            {
                name: "Privacy Policy",
                description: "Data handling, encryption at rest, and zero third-party tracking commitments.",
                howTo: ["Read privacy commitments at /privacy."],
                link: "/privacy"
            },
            {
                name: "Data Processing Agreement (DPA)",
                description: "Institutional contract defining student data custody and processing boundaries.",
                howTo: ["Inspect legal DPA terms at /dpa."],
                link: "/dpa"
            },
            {
                name: "Service Level Agreement (SLA)",
                description: "Guaranteed platform availability, backup schedules, and recovery targets.",
                howTo: ["View 99.9% uptime SLA commitments at /sla."],
                link: "/sla"
            }
        ]
    }
];

export default function Docs() {
    const [activeSection, setActiveSection] = useState(0);
    const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);

    const section = docSections[activeSection];

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">
                            lucy_os // documentation
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle className="scale-90" />
                        <Link href="/guidelines">
                            <Button variant="primary" className="text-[11px] uppercase tracking-widest bg-emerald-600 hover:bg-emerald-500 text-white">
                                <Users className="w-3.5 h-3.5 mr-1.5" /> role_guidelines
                            </Button>
                        </Link>
                        <Link href="/">
                            <Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white">
                                <ArrowLeft className="w-4 h-4 mr-2" /> back_to_home
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-24 sm:pt-32 pb-20 sm:pb-32 px-4 sm:px-6">
                <div className="max-w-6xl mx-auto space-y-12 sm:space-y-16">
                    {/* Header */}
                    <section className="space-y-6 sm:space-y-8">
                        <Reveal className="flex items-center gap-3 text-slate-400 dark:text-zinc-500">
                            <BookOpen className="w-4 h-4 shrink-0" />
                            <div className="h-px w-12 bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.3em] font-bold">
                                documentation // operational_handbook
                            </span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-6xl font-bold uppercase tracking-tighter leading-none">
                                docs & guidelines<br />
                                <GlitchText className="text-slate-400 dark:text-zinc-700">complete system reference.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-xl">
                            <p className="text-slate-600 dark:text-zinc-400 text-base sm:text-lg leading-relaxed">
                                Step-by-step instructions, operational routines, and data access guides for every participant in the educational ecosystem.
                            </p>
                        </Reveal>
                        <Reveal delay={0.3}><ScanBar /></Reveal>
                    </section>

                    {/* Dedicated Role Guidelines Banner */}
                    <div className="p-6 sm:p-8 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-widest">
                                <Users className="w-4 h-4" />
                                <span>Interactive Role Guidelines Portal Available</span>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                                Looking for your specific role manual?
                            </h3>
                            <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 max-w-xl">
                                Access detailed daily routines, permitted data scopes, and task-by-task guides tailored specifically for Teachers, Homeroom Faculty, Students, Parents, Principals, Owners, and SuperAdmins.
                            </p>
                        </div>
                        <Link href="/guidelines">
                            <Button className="text-xs uppercase tracking-wider bg-emerald-600 hover:bg-emerald-500 text-white shrink-0">
                                Open Role Guidelines <ArrowRight className="w-4 h-4 ml-1.5" />
                            </Button>
                        </Link>
                    </div>

                    {/* Two-panel Documentation Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-px bg-slate-200 dark:bg-white/10 border border-slate-300 dark:border-white/10 overflow-hidden rounded-2xl">
                        {/* Sidebar Navigation */}
                        <div className="bg-slate-50 dark:bg-black p-6 space-y-1.5">
                            <div className="text-[10px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest mb-3 px-2">
                                document_index
                            </div>
                            {docSections.map((s, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        setActiveSection(i);
                                        setSelectedItemIdx(null);
                                    }}
                                    className={`w-full text-left p-3.5 flex justify-between items-center text-xs uppercase tracking-wide transition-all rounded-lg ${
                                        activeSection === i
                                            ? "text-slate-900 bg-slate-200 dark:text-white dark:bg-white/10 font-bold"
                                            : "text-slate-600 hover:text-slate-900 dark:text-zinc-500 dark:hover:text-zinc-300"
                                    }`}
                                >
                                    <span className="truncate pr-2">{s.title}</span>
                                    <span className="text-[9px] text-slate-400 dark:text-zinc-700 shrink-0">{s.id}</span>
                                </button>
                            ))}
                        </div>

                        {/* Content Panel */}
                        <div className="bg-white dark:bg-[#070707] p-8 sm:p-10 space-y-8">
                            <div className="space-y-2 pb-6 border-b border-slate-200 dark:border-white/10">
                                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-widest font-bold">
                                    section_{section.id}
                                </span>
                                <h2 className="text-2xl sm:text-3xl font-bold uppercase tracking-tight text-slate-900 dark:text-white">
                                    {section.title}
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400">
                                    {section.subtitle}
                                </p>
                            </div>

                            <div className="space-y-4">
                                {section.items.map((item, idx) => {
                                    const isExpanded = selectedItemIdx === idx;
                                    return (
                                        <div
                                            key={idx}
                                            className="p-5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-zinc-950/40 space-y-3 transition-colors hover:border-slate-300 dark:hover:border-white/20"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold uppercase tracking-wide text-slate-900 dark:text-white">
                                                        {item.name}
                                                    </h4>
                                                    {item.badge && (
                                                        <span className="text-[9px] px-2 py-0.5 rounded border border-slate-300 dark:border-white/20 text-slate-600 dark:text-zinc-400 uppercase tracking-widest">
                                                            {item.badge}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.link ? (
                                                    <Link href={item.link}>
                                                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline uppercase tracking-wider font-semibold inline-flex items-center gap-1">
                                                            open_guideline <ArrowRight className="w-3 h-3" />
                                                        </span>
                                                    </Link>
                                                ) : (
                                                    <button
                                                        onClick={() => setSelectedItemIdx(isExpanded ? null : idx)}
                                                        className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-wider hover:text-slate-900 dark:hover:text-white"
                                                    >
                                                        {isExpanded ? "collapse" : "view_details"}
                                                    </button>
                                                )}
                                            </div>

                                            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">
                                                {item.description}
                                            </p>

                                            {(isExpanded || section.id === "01") && (
                                                <div className="pt-2 border-t border-slate-200 dark:border-white/5 space-y-1.5">
                                                    <span className="text-[9px] text-slate-400 dark:text-zinc-600 uppercase tracking-widest font-bold block">
                                                        How To Execute:
                                                    </span>
                                                    <ul className="space-y-1.5 text-xs text-slate-700 dark:text-zinc-300">
                                                        {item.howTo.map((step, sIdx) => (
                                                            <li key={sIdx} className="flex items-start gap-2">
                                                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                                                                <span>{step}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <PageFooter
                id="DOCS_PROTOCOL"
                links={[
                    { href: "/guidelines", label: "role_guidelines" },
                    { href: "/support", label: "support" },
                    { href: "/terms", label: "terms" },
                    { href: "/privacy", label: "privacy" }
                ]}
            />
        </div>
    );
}
