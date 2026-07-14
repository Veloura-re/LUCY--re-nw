"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Terminal, Code, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, TiltCard, Reveal, PageFooter, GlitchText, ScanBar } from "@/components/public/animations";
import { useState } from "react";
import { Logo } from "@/components/ui/logo";

const sections = [
    { id: "01", title: "Getting Started", items: ["System Overview", "Provisioning Your Node", "Role Setup", "First Login"] },
    { id: "02", title: "Attendance System", items: ["Marking Attendance", "Automated Alerts", "Late Thresholds", "Parent Notifications"] },
    { id: "03", title: "Grading Matrix", items: ["Creating Exam Records", "Grade Entry", "Locking Results", "Report Export"] },
    { id: "04", title: "AI Neural Assistant", items: ["Persona Overview", "Switching Personas", "Chat Sessions", "Privacy & Isolation"] },
    { id: "05", title: "Timetable Engine", items: ["Creating Periods", "Assigning Teachers", "Student View", "Conflicts"] },
    { id: "06", title: "API Reference", items: ["Authentication", "Endpoints", "Rate Limits", "Webhook Events"] },
    { id: "07", title: "Legal & Compliance", items: ["Terms of Service", "Privacy Policy", "Data Processing Agreement", "Service Level Agreement", "Cyber Liability Insurance"] },
];

const legalLinks: Record<string, string> = {
    "Terms of Service": "/terms",
    "Privacy Policy": "/privacy",
    "Data Processing Agreement": "/dpa",
    "Service Level Agreement": "/sla",
    "Cyber Liability Insurance": "/insurance"
};

const codeSnippet = `// Authenticate and fetch student attendance
const res = await fetch('/api/school/attendance', {
  headers: {
    'Authorization': 'Bearer \${token}',
    'Content-Type': 'application/json'
  }
});

const { records, summary } = await res.json();
// records: AttendanceRecord[]
// summary: { present, absent, late, total }`;

export default function Docs() {
    const [active, setActive] = useState(0);

    return (
        <div className="min-h-screen bg-black text-white selection:bg-white selection:text-black font-mono lowercase tracking-tight">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/85 backdrop-blur-md px-6 py-4">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-white">lucy_os</span>
                    </Link>
                    <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />return_to_main</Button></Link>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-40 px-6">
                <div className="max-w-6xl mx-auto space-y-16">

                    <section className="space-y-8">
                        <Reveal className="flex items-center gap-4 text-zinc-500">
                            <BookOpen className="w-4 h-4" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-zinc-700" />
                            <span className="text-[10px] uppercase tracking-[0.4em]">docs_protocol // v1.0</span>
                            <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-1.5 h-1.5 bg-white rounded-full" />
                        </Reveal>
                        <Reveal delay={0.1}>
                            <motion.h1 
                                style={{ transformStyle: "preserve-3d" }}
                                whileHover={{ rotateX: 10, rotateY: -10 }}
                                className="text-6xl md:text-8xl font-bold uppercase tracking-tighter leading-none perspective-[1000px] cursor-default"
                            >
                                docs<br /><GlitchText className="text-zinc-800">protocol.</GlitchText>
                            </motion.h1>
                        </Reveal>
                        <Reveal delay={0.2} className="max-w-xl">
                            <p className="text-zinc-500 text-lg leading-relaxed">
                                complete technical reference for the lucy neural matrix. everything you need to deploy, configure, and extend your institutional node.
                            </p>
                        </Reveal>
                        <Reveal delay={0.3}><ScanBar /></Reveal>
                    </section>

                    {/* Two-panel layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-px bg-white/10 border border-white/10 overflow-hidden">
                        {/* Sidebar */}
                        <div className="bg-black p-6 space-y-1">
                            <div className="text-[9px] text-zinc-700 uppercase tracking-widest mb-4 px-2">section_index</div>
                            {sections.map((s, i) => (
                                <motion.button
                                    key={i}
                                    onClick={() => setActive(i)}
                                    whileHover={{ x: 4 }}
                                    className={`w-full text-left p-3 flex justify-between items-center text-xs uppercase tracking-wide transition-colors ${active === i ? "text-white bg-white/5" : "text-zinc-600 hover:text-zinc-400"}`}
                                >
                                    <span>{s.title}</span>
                                    <span className="text-[8px] text-zinc-800">{s.id}</span>
                                </motion.button>
                            ))}
                        </div>

                        {/* Content panel */}
                        <motion.div
                            key={active}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.1 }}
                            className="bg-[#050505] p-10 space-y-10"
                        >
                            <div className="space-y-2">
                                <div className="text-[9px] text-zinc-700 uppercase tracking-widest">{sections[active].id}</div>
                                <h2 className="text-3xl font-bold uppercase tracking-tight">{sections[active].title}</h2>
                                <div className="h-px bg-zinc-900 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.6 }} className="h-full bg-white/10" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                {sections[active].items.map((item, j) => {
                                    const href = legalLinks[item];
                                    const content = (
                                        <motion.div key={j} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: j * 0.07 }}
                                            className="flex items-center justify-between p-4 border border-white/5 hover:border-white/15 hover:bg-white/2 group cursor-pointer transition-all"
                                        >
                                            <span className="text-zinc-400 text-sm group-hover:text-white transition-colors">{item}</span>
                                            <ChevronRight className="w-3 h-3 text-zinc-700 group-hover:text-white group-hover:translate-x-1 transition-all" />
                                        </motion.div>
                                    );
                                    
                                    return href ? <Link key={j} href={href}>{content}</Link> : content;
                                })}
                            </div>
                        </motion.div>
                    </div>

                    {/* Code example */}
                    <Reveal>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-zinc-500">
                                <Code className="w-4 h-4" />
                                <span className="text-[10px] uppercase tracking-[0.4em]">api_reference // example</span>
                            </div>
                            <TiltCard>
                                <div className="border border-white/5 bg-black overflow-hidden">
                                    <div className="flex items-center gap-2 px-6 py-3 border-b border-white/5 text-[9px] text-zinc-600 uppercase tracking-widest">
                                        <Terminal className="w-3 h-3" />
                                        <span>attendance_fetch.ts</span>
                                        <motion.div animate={{ opacity: [1, 0, 1] }} transition={{ repeat: Infinity, duration: 1.3 }} className="ml-auto w-1.5 h-1.5 bg-white/30 rounded-full" />
                                    </div>
                                    <div className="p-8">
                                        {codeSnippet.split("\n").map((line, i) => (
                                            <motion.div key={i} initial={{ opacity: 0, x: -5 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.04 }} className="text-[10px] leading-relaxed text-zinc-500 font-mono">
                                                {line || " "}
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </TiltCard>
                        </div>
                    </Reveal>
                </div>
            </main>

            <PageFooter id="DOCS_PROTOCOL" links={[{ href: "/support", label: "support" }, { href: "/changelog", label: "changelog" }, { href: "/status", label: "status" }]} />
        </div>
    );
}
