import { Metadata } from "next";
import { BookOpen, Users, Calendar, ShieldCheck, Database, Sparkles, ChevronRight, HelpCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getCachedUser } from "@/lib/users";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Guideline Book | LUCY OS",
    description: "The complete manual for operating your educational institution.",
};

const PRINCIPAL_SECTIONS = [
    {
        id: "getting-started-principal",
        icon: Sparkles,
        title: "Principal Initialization",
        content: (
            <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                <p>Welcome to the <strong>LUCY Educational Operating System</strong>. As the Principal, you possess full cryptographic oversight over the entire institution's data architecture.</p>
                <h4 className="text-zinc-900 dark:text-white font-bold text-base mt-4 border-b border-zinc-300 dark:border-white/10 pb-2">Navigation Modes</h4>
                <p>Use the Tactical Dock or the Neural Sidebar. You can toggle this via Settings.</p>
            </div>
        )
    },
    {
        id: "staffing",
        icon: Users,
        title: "Faculty & Staffing Configuration",
        content: (
            <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                <p>The <strong>Staffing</strong> module is where you assign your invited teachers to the subjects they are qualified to teach.</p>
                <h4 className="text-zinc-900 dark:text-white font-bold text-base mt-4 border-b border-zinc-300 dark:border-white/10 pb-2">Inviting Faculty</h4>
                <p>Navigate to the <strong>Teachers</strong> tab. Generate encrypted invite links to securely bind faculty to your school's database.</p>
                <div className="bg-eduGreen-900/20 border border-eduGreen-500/30 p-4 rounded-xl mt-2">
                    <strong className="text-eduGreen-400 block mb-1">Important: Periods Per Week</strong>
                    Next to the teacher assignment, you must input the <em>Periods Per Week</em>. The Auto-Scheduler requires this data.
                </div>
            </div>
        )
    },
    {
        id: "timetable",
        icon: Calendar,
        title: "The Timetable Auto-Scheduler",
        content: (
            <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                <p>LUCY features a state-of-the-art constraint-satisfaction engine capable of generating a flawless school-wide schedule in milliseconds.</p>
                <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Ensure all Teachers are assigned in the <strong>Staffing</strong> tab.</li>
                    <li>Ensure <strong>Periods Per Week</strong> are accurately set.</li>
                    <li>Navigate to the <strong>Timetable</strong> tab and click the bold <strong>Auto-Generate Schedule</strong> button.</li>
                </ol>
            </div>
        )
    },
    {
        id: "backups",
        icon: Database,
        title: "Data Integrity & Restore Points",
        content: (
            <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                <p>School data is critical. Navigate to <strong>Settings &gt; Data</strong> to generate an encrypted `.lucy` backup file containing a complete snapshot of your school.</p>
                <p>You can instantly upload this file later to overwrite the current state and restore lost data.</p>
            </div>
        )
    }
];

const TEACHER_SECTIONS = [
    {
        id: "getting-started-teacher",
        icon: Sparkles,
        title: "Teacher Workspace",
        content: (
            <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                <p>Welcome to your <strong>LUCY Workspace</strong>. This interface allows you to manage the specific subjects and cohorts you have been assigned by the administration.</p>
                <h4 className="text-zinc-900 dark:text-white font-bold text-base mt-4 border-b border-zinc-300 dark:border-white/10 pb-2">The Dashboard</h4>
                <p>Your overview page will display your classes, upcoming assignments, and your personal timetable.</p>
            </div>
        )
    },
    {
        id: "classroom-management",
        icon: BookOpen,
        title: "Exams & Assignments",
        content: (
            <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                <p>Navigate to the <strong>Exams</strong> tab to create and grade assessments for your assigned classes.</p>
                <ul className="list-disc pl-5 space-y-2 mt-2">
                    <li>Select a class and subject from your assignments.</li>
                    <li>Create an exam, setting the maximum marks.</li>
                    <li>Input student scores seamlessly. The system automatically computes grade averages.</li>
                </ul>
            </div>
        )
    },
    {
        id: "attendance",
        icon: ShieldCheck,
        title: "Daily Attendance Protocols",
        content: (
            <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                <p>If you are designated as a <strong>Homeroom Teacher</strong>, you are responsible for the primary daily roll call at the start of the day.</p>
                <p>Additionally, you may track period-based attendance for your specific subjects depending on your school's protocols.</p>
            </div>
        )
    }
];

const STUDENT_PARENT_SECTIONS = [
    {
        id: "getting-started-student",
        icon: Sparkles,
        title: "Student Portal",
        content: (
            <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                <p>Welcome to the <strong>LUCY Student Portal</strong>. This interface provides real-time access to your academic trajectory and schedule.</p>
            </div>
        )
    },
    {
        id: "academic-records",
        icon: BookOpen,
        title: "Viewing Grades & Records",
        content: (
            <div className="space-y-4 text-zinc-700 dark:text-zinc-300 leading-relaxed text-sm">
                <p>Navigate to your <strong>Exams</strong> or <strong>Overview</strong> page to track your latest assessment results.</p>
                <p>Your dashboard will also display your daily schedule and upcoming events.</p>
            </div>
        )
    }
];

export default async function HelpCenterPage() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) redirect("/login");

    const dbUser = await getCachedUser(user.id);
    if (!dbUser) redirect("/login");

    let activeSections = STUDENT_PARENT_SECTIONS;
    if (dbUser.role === 'PRINCIPAL' || dbUser.role === 'ADMIN') activeSections = PRINCIPAL_SECTIONS;
    else if (dbUser.role === 'TEACHER') activeSections = TEACHER_SECTIONS;

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
            {/* Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] bg-white/[0.02] backdrop-blur-3xl border border-zinc-300 dark:border-white/10 p-8 md:p-12 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] group">
                <div className="absolute inset-0 bg-gradient-to-br from-eduGreen-500/10 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-eduGreen-500/20 blur-[100px] rounded-full pointer-events-none group-hover:bg-eduGreen-400/30 transition-colors duration-700" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-200 dark:bg-white/5 border border-zinc-300 dark:border-white/10 mb-6">
                            <HelpCircle className="w-4 h-4 text-eduGreen-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-700 dark:text-zinc-300">Official Documentation</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-zinc-900 dark:text-white italic mb-4">
                            The Guideline Book
                        </h1>
                        <p className="text-zinc-600 dark:text-zinc-400 text-sm md:text-base max-w-xl font-medium">
                            Comprehensive operational protocols tailored for your clearance level: <strong className="text-eduGreen-400 uppercase tracking-widest text-[10px] bg-eduGreen-900/30 px-2 py-1 rounded-md ml-1">{dbUser.role}</strong>
                        </p>
                    </div>
                    <div className="hidden md:flex w-32 h-32 rounded-3xl bg-white/[0.05] border border-zinc-300 dark:border-white/20 items-center justify-center backdrop-blur-2xl shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] rotate-3 group-hover:rotate-6 transition-transform duration-700">
                        <BookOpen className="w-16 h-16 text-eduGreen-400 drop-shadow-[0_0_15px_rgba(34,197,94,0.5)]" />
                    </div>
                </div>
            </div>

            {/* Chapters */}
            <div className="space-y-6">
                <h2 className="text-xl font-black uppercase tracking-widest text-zinc-900 dark:text-white flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-eduGreen-500" />
                    Operational Chapters
                </h2>

                <div className="w-full space-y-4">
                    {activeSections.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <details
                                key={section.id}
                                className="bg-white/[0.02] backdrop-blur-xl border border-zinc-300 dark:border-white/10 rounded-3xl overflow-hidden open:bg-white/[0.04] open:border-eduGreen-500/40 transition-all duration-500 px-2 group shadow-lg hover:shadow-xl hover:border-white/20"
                            >
                                <summary className="px-4 py-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-6 text-left outline-none relative">
                                    <div className="w-14 h-14 rounded-2xl bg-white/40 dark:bg-black/40 border border-zinc-300 dark:border-white/10 flex items-center justify-center shrink-0 group-open:bg-eduGreen-500/20 group-open:border-eduGreen-400/50 group-open:shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all duration-500">
                                        <Icon className="w-6 h-6 text-zinc-600 dark:text-zinc-400 group-open:text-eduGreen-400 transition-colors duration-500" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-500 mb-1">
                                            Chapter 0{index + 1}
                                        </div>
                                        <h3 className="text-xl font-bold text-zinc-900 dark:text-white group-hover:text-eduGreen-400 group-open:text-eduGreen-300 transition-colors duration-300 drop-shadow-sm">
                                            {section.title}
                                        </h3>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/[0.05] border border-zinc-300 dark:border-white/10 flex items-center justify-center text-zinc-600 dark:text-zinc-500 group-open:rotate-90 group-open:text-eduGreen-400 group-open:border-eduGreen-500/30 transition-all duration-500 shrink-0">
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </summary>
                                <div className="px-4 pb-8 pt-2">
                                    <div className="pl-0 md:pl-20">
                                        {section.content}
                                    </div>
                                </div>
                            </details>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
