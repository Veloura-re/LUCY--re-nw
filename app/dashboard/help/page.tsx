import { Metadata } from "next";
import { BookOpen, Users, Calendar, ShieldCheck, Database, Sparkles, ChevronRight, HelpCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getCachedUser } from "@/lib/users";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Guideline Book | LUCY OS",
    description: "The complete manual for operating your educational institution.",
};

const SECTIONS = [
    {
        id: "getting-started",
        icon: Sparkles,
        title: "Getting Started & Initialization",
        content: (
            <div className="space-y-4 text-zinc-300 leading-relaxed text-sm">
                <p>
                    Welcome to the <strong>LUCY Educational Operating System</strong>. Your school has been initialized
                    on a high-performance neural architecture designed to minimize administrative friction.
                </p>
                <h4 className="text-white font-bold text-base mt-4 border-b border-white/10 pb-2">1. The Dashboard</h4>
                <p>
                    Depending on your preferences, you are either using the <strong>Tactical Dock</strong> (bottom of the screen)
                    or the <strong>Neural Sidebar</strong> (left of the screen) to navigate.
                    You can switch between these modes by clicking the <strong className="text-eduGreen-400">Settings</strong> cog icon.
                </p>
                <h4 className="text-white font-bold text-base mt-4 border-b border-white/10 pb-2">2. Roles & Capabilities</h4>
                <p>
                    LUCY operates on strict cryptographic roles. A Principal has full oversight, Teachers manage their specific
                    classrooms, Homeroom teachers manage their assigned cohorts, and Students/Parents have restricted views
                    of their own academic trajectories.
                </p>
            </div>
        )
    },
    {
        id: "staffing",
        icon: Users,
        title: "Faculty & Staffing Configuration",
        content: (
            <div className="space-y-4 text-zinc-300 leading-relaxed text-sm">
                <p>
                    The <strong>Staffing</strong> module is where you assign your invited teachers to the subjects they are qualified to teach.
                </p>
                <h4 className="text-white font-bold text-base mt-4 border-b border-white/10 pb-2">1. Inviting Faculty</h4>
                <p>
                    Navigate to the <strong>Teachers</strong> tab. Here you can generate encrypted invite links.
                    Send these links to your faculty. Upon registration, they will be securely bound to your school's database.
                </p>
                <h4 className="text-white font-bold text-base mt-4 border-b border-white/10 pb-2">2. Assigning Subjects</h4>
                <p>
                    In the <strong>Staffing</strong> menu, select a Class. For every subject in that class's curriculum,
                    assign a Teacher from the dropdown. 
                </p>
                <div className="bg-eduGreen-900/20 border border-eduGreen-500/30 p-4 rounded-xl mt-2">
                    <strong className="text-eduGreen-400 block mb-1">Important: Periods Per Week</strong>
                    Next to the teacher assignment, you must input the <em>Periods Per Week</em>. 
                    This number dictates how many times this class should happen every week (e.g., 5 periods for Core Math, 2 for Art).
                    The Auto-Scheduler uses this data.
                </div>
            </div>
        )
    },
    {
        id: "timetable",
        icon: Calendar,
        title: "The Timetable Auto-Scheduler",
        content: (
            <div className="space-y-4 text-zinc-300 leading-relaxed text-sm">
                <p>
                    LUCY features a state-of-the-art constraint-satisfaction engine capable of generating a flawless
                    school-wide schedule in milliseconds.
                </p>
                <h4 className="text-white font-bold text-base mt-4 border-b border-white/10 pb-2">Generating the Grid</h4>
                <ol className="list-decimal pl-5 space-y-2 mt-2">
                    <li>Ensure all Teachers are assigned in the <strong>Staffing</strong> tab.</li>
                    <li>Ensure <strong>Periods Per Week</strong> are accurately set for every single assignment.</li>
                    <li>Navigate to the <strong>Timetable</strong> tab.</li>
                    <li>Click the bold <strong>Auto-Generate Schedule</strong> button.</li>
                </ol>
                <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-xl mt-4">
                    <strong className="text-red-400 block mb-1">Warning: Overwrite Protocol</strong>
                    Running the Auto-Generator will <em>permanently overwrite</em> the existing schedule for every class in the school.
                    It ensures 100% collision-free scheduling (no teacher is double-booked).
                </div>
            </div>
        )
    },
    {
        id: "backups",
        icon: Database,
        title: "Data Integrity & Restore Points",
        content: (
            <div className="space-y-4 text-zinc-300 leading-relaxed text-sm">
                <p>
                    School data is critical. LUCY protects your institution against accidental deletions, malicious faculty actions,
                    or catastrophic configuration errors via the <strong>Restore Point</strong> system.
                </p>
                <h4 className="text-white font-bold text-base mt-4 border-b border-white/10 pb-2">Creating Backups</h4>
                <p>
                    Navigate to <strong>Settings</strong>. In the Data section, you can generate an encrypted `.lucy` backup file.
                    This file contains a complete snapshot of your school (Students, Classes, Timetables, Grades, everything).
                    Store this file safely offline.
                </p>
                <h4 className="text-white font-bold text-base mt-4 border-b border-white/10 pb-2">Restoring Data</h4>
                <p>
                    If a principal is demoted, or massive data loss occurs, you can upload a `.lucy` file in the Settings menu.
                    The system will instantly overwrite the current state with the exact state from the backup file.
                </p>
            </div>
        )
    },
    {
        id: "attendance",
        icon: ShieldCheck,
        title: "Daily Attendance Protocols",
        content: (
            <div className="space-y-4 text-zinc-300 leading-relaxed text-sm">
                <p>
                    Attendance tracking is split into two paradigms: Homeroom (Daily) and Subject (Period-based).
                </p>
                <h4 className="text-white font-bold text-base mt-4 border-b border-white/10 pb-2">Homeroom Roll Call</h4>
                <p>
                    Homeroom teachers are responsible for the primary daily roll call. This takes place at the start of the day.
                    Once submitted, the Principal can view school-wide absence metrics instantly from the Overview dashboard.
                </p>
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

    return (
        <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {/* Header */}
            <div className="relative overflow-hidden rounded-3xl bg-zinc-900 border border-white/10 p-8 md:p-12">
                <div className="absolute inset-0 bg-gradient-to-br from-eduGreen-900/20 via-transparent to-zinc-900/50" />
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-eduGreen-500/10 blur-[100px] rounded-full pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 mb-6">
                            <HelpCircle className="w-4 h-4 text-eduGreen-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-300">Official Documentation</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white italic mb-4">
                            The Guideline Book
                        </h1>
                        <p className="text-zinc-400 text-sm md:text-base max-w-xl font-medium">
                            Comprehensive operational protocols and manuals for managing your institution via the LUCY interface.
                        </p>
                    </div>
                    <div className="hidden md:flex w-32 h-32 rounded-2xl bg-black/50 border border-white/10 items-center justify-center backdrop-blur-md shadow-2xl">
                        <BookOpen className="w-16 h-16 text-eduGreen-500/50" />
                    </div>
                </div>
            </div>

            {/* Chapters */}
            <div className="space-y-6">
                <h2 className="text-xl font-black uppercase tracking-widest text-white flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-eduGreen-500" />
                    Operational Chapters
                </h2>

                <div className="w-full space-y-4">
                    {SECTIONS.map((section, index) => {
                        const Icon = section.icon;
                        return (
                            <details
                                key={section.id}
                                className="bg-zinc-900/50 border border-white/5 rounded-2xl overflow-hidden open:border-eduGreen-500/30 transition-all px-2 group"
                            >
                                <summary className="px-4 py-6 cursor-pointer list-none flex items-center gap-6 text-left outline-none">
                                    <div className="w-12 h-12 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center shrink-0 group-open:bg-eduGreen-900/30 group-open:border-eduGreen-500/30 transition-colors">
                                        <Icon className="w-6 h-6 text-zinc-400 group-open:text-eduGreen-400" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-500 mb-1">
                                            Chapter 0{index + 1}
                                        </div>
                                        <h3 className="text-lg font-bold text-white group-hover:text-eduGreen-400 transition-colors">
                                            {section.title}
                                        </h3>
                                    </div>
                                </summary>
                                <div className="px-4 pb-6 pt-2">
                                    <div className="pl-0 md:pl-18">
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
