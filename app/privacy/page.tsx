"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText, InteractiveParticleSimulation } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";
import { LEGAL_VERSION } from "@/lib/legal-versions";

const clauses = [
    { num: "01", title: "Responsible Party and Operator Roles", body: "Under POPIA, GDPR and comparable data protection laws, the educational institution is the 'Responsible Party' (Data Controller) that decides why and how personal data is processed. LUCY OS acts as the 'Operator' (Data Processor) and processes institutional data only on the institution's documented instructions under the Data Processing Agreement (DPA). For website visitors and prospective customers who contact us directly (clause 03), LUCY OS is the responsible party." },
    { num: "02", title: "Information We Process", body: "Account data: name, email address, role, phone number, photo, biography, qualifications and a hashed password. Student records: name, student code, date of birth, gender, address, enrolment status, guardian name, phone and relationship, photo, attendance, grades, exam answers and attempts, teacher remarks and internal notes, certificates, invoices and payments. Staff records: attendance and payroll. Access inside a school is limited by role: accountants work with fees, invoices, expenses, payments and payroll, and recorders work with student, parent and class records. Communications: messages in school chat rooms and their attachments. Security data: IP address, browser user agent, sign-in attempts, and audit and error logs. Consent records: which version of the Terms and Privacy Policy you accepted, when, and from which IP address and browser. We extend POPIA protections to juristic persons (schools and corporate bodies) and treat their business data with the same safeguards as personal data." },
    { num: "03", title: "Website Visitors and Public Forms", body: "If you use our contact, access-request, public comment or security-report forms, we collect what you submit (such as name, email, message, school name and the plan you are interested in) together with the campaign source of the link that brought you here. We use it to respond to you, to review security reports, and to understand which channels reach schools. We do not sell it or use it for third-party advertising." },
    { num: "04", title: "Cookies, Local Storage and Analytics", body: "Essential: authentication cookies (Supabase 'sb-' cookies and session tokens) keep you signed in; blocking them prevents sign-in. Preferences: your browser stores theme, language, welcome-notice and promotion-dismissal settings in local or session storage. Attribution: a first-party cookie named 'lucy_attr' stores the campaign tags of the link you arrived from (utm values, the TikTok click identifier and the plan chosen) for 30 days. Analytics: we use PostHog to measure feature usage and capture application errors. For signed-in users it receives an internal user identifier and role, not your name or email address. Bot protection: Cloudflare Turnstile runs at sign-in and registration. We do not use advertising cookies. You can clear or block cookies in your browser settings." },
    { num: "05", title: "AI-Assisted Features", body: "Some features send content to the Google Gemini API when a user invokes them: assignment and essay review, exam question generation and extraction, assistant chat, payment receipt review and student risk summaries. The content sent can include student work and student records. We do not forward that content to our analytics provider; only technical measures such as model name, token counts, latency and text size are recorded. AI output is advisory, can be wrong, and must be reviewed by a person before it influences grades, discipline or welfare decisions. Student risk summaries are indicators for staff, not automated decisions about a student." },
    { num: "06", title: "Sub-processors", body: "We use these sub-processors: Supabase (database, authentication and file storage); Vercel and Cloudflare (hosting, delivery and bot protection); Google (Gemini AI features); PostHog (product analytics and error monitoring); Resend (transactional email such as invitations, verification codes, receipts and billing reminders); Stripe and Chapa (payments; card details are entered on their hosted pages and LUCY OS does not store card numbers); and Upstash (rate limiting and caching). Each is engaged to provide its service to us and is bound by contract to protect the data it receives. Retention by each sub-processor is governed by our agreement with it, and we do not represent that every sub-processor applies zero data retention. We update this list when it changes." },
    { num: "07", title: "Tenant Isolation and Data Minimization", body: "School data is separated by school identifier. Every request is authorized against the caller's school and role in our application, and sensitive changes are recorded in an audit log. We also maintain PostgreSQL row-level security policies, which protect direct database access but do not replace those application checks. Data is encrypted at rest (AES-256) and in transit (TLS) by our infrastructure providers. We limit the data we collect to what the features need and send analytics providers only the minimum described in clauses 04 and 05." },
    { num: "08", title: "Uploaded Files", body: "Uploaded files (profile photos, school logos, books, course materials, student coursework, payment receipts and chat attachments) and backups are stored in private buckets. A file is delivered only to a signed-in member of the school that owns it, through a short-lived link that expires within minutes, so a copied link stops working. Pages that must work without an account, such as an invitation or an ID verification page, show only the single logo or photo they need through a link that expires within the hour." },
    { num: "09", title: "Retention and Deletion", body: "Active records are kept for the duration of the subscription, and institutions can delete records inside the platform. After termination or deletion of a school, its personal and operational data, uploaded files and backups are removed from live systems promptly and in any case within 30 days. Backups of core school records are kept for disaster recovery: automatic daily backups for 30 days and backups taken manually by a school for 90 days, always retaining the three most recent, and all are removed when the school is deleted. The exception is the audit trail (actions, user identifiers, IP addresses and user agents), which we keep for at least seven years for compliance and archive to private storage when a school is deleted. Application error logs are deleted after 90 days. Sanctuary data follows clause 14." },
    { num: "10", title: "Breach Notification and Incident Response", body: "If a confirmed security compromise leads to unauthorized access to, or loss or disclosure of, personal data, LUCY OS will notify the affected institution without undue delay and no later than 48 hours after becoming aware of it, as set out in the DPA. We provide the impact scope and mitigation steps the institution needs to meet its own reporting duties to the competent data protection authority and to affected individuals." },
    { num: "11", title: "Your Rights", body: "Subject to applicable law, you may ask to access, correct, delete, restrict or object to the processing of your personal data, to receive it in a portable format, and to complain to the competent data protection authority. Because the school decides how your data is used, make requests to your school administrator first. Institutions can export their data at any time through the Admin Ledger or the API. If you contact us directly, we forward your request to the responsible institution and tell you we have done so, except where we are the responsible party under clause 03." },
    { num: "12", title: "Children and Student Data", body: "Students, many of whom are minors, use LUCY OS under the authority of their school. The institution is responsible for lawful grounds for processing student data, including obtaining any parent or guardian consent that the law requires. Parents and guardians can see the records of children linked to their account. We do not show advertising to students, do not sell personal data, and do not use student data to build advertising profiles." },
    { num: "13", title: "International Processing", body: "Our sub-processors may process data in countries other than the school's own. Where the law requires a transfer mechanism, we rely on contractual safeguards with the sub-processor, and the institution remains responsible for confirming that its use of the platform complies with any transfer restrictions that apply to it." },
    { num: "14", title: "Sanctuary Support Sessions", body: "Sanctuary is a pseudonymous peer-support and educator mentorship space. Other participants see only a pseudonym, but sessions are linked to your account so we can prevent abuse. Contact details and off-platform handles are automatically redacted, and acute crisis language can trigger helpline information and flagging for review by platform moderators. Messages are deleted when a session ends unless the session was reported. Reported sessions, with their transcripts, are visible to LUCY OS platform moderators for review. All session records, including reports, are deleted 30 days after the session starts. Confidentiality is not absolute: we may disclose information where the law requires it or where it is needed to protect someone from serious harm. Capturing, screen-recording, exporting or distributing session content is prohibited and can result in permanent loss of Sanctuary access and referral to the school for disciplinary review. We cannot technically prevent screenshots." },
    { num: "15", title: "Changes, Governing Law and Contact", body: "We will post changes to this policy on this page with a new revision date and, for material changes, notify institution administrators by email or in the dashboard. This policy is governed by the laws of Ethiopia, including applicable Ethiopian data protection law, and is read together with the GDPR and POPIA where they apply to an institution. Privacy requests and general questions: support@5-cn.net. Security incidents, DPA contracts and compliance questions: security@5-cn.net." },
];

export default function Privacy() {
    return (
        <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white selection:bg-emerald-500 selection:text-white dark:selection:bg-white dark:selection:text-black font-mono lowercase tracking-tight transition-colors duration-300">
            <ScanLines />
            <CustomCursor />
            <AnimatedGrid />
            <InteractiveParticleSimulation count={120} interactive={true} burstOnLoad={true} fullScreen={true} connectionDistance={140} showTriangles={true} />

            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200 dark:border-white/10 bg-white/85 dark:bg-black/85 backdrop-blur-md px-6 py-4 transition-colors">
                <div className="max-w-[1400px] mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2 group">
                        <Logo className="w-8 h-8" />
                        <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">LUCY OS</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <ThemeToggle className="scale-90" />
                        <Link href="/"><Button variant="ghost" className="text-[11px] uppercase tracking-widest hover:text-slate-900 dark:hover:text-white group"><ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />back_to_home</Button></Link>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-24 sm:pt-32 pb-20 sm:pb-40 px-4 sm:px-6">
                <div className="max-w-3xl mx-auto space-y-12 sm:space-y-20">

                    <section className="space-y-6 sm:space-y-8">
                        <Reveal className="flex items-center gap-3 sm:gap-4 text-slate-400 dark:text-zinc-500">
                            <Lock className="w-4 h-4 shrink-0" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em]">data_protocol // effective 2026-01-01 // revised {LEGAL_VERSION}</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                privacy<br /><GlitchText className="text-slate-300 dark:text-zinc-800">policy.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-500 text-sm sm:text-base leading-relaxed">
                                this policy describes how LUCY OS collects, processes, and protects data for school accounts, their users, and visitors to this website.
                            </p>
                        </Reveal>
                    </section>

                    {/* Clauses */}
                    <div className="space-y-0 border border-slate-200 dark:border-white/5 overflow-hidden rounded-xl dark:rounded-none">
                        {clauses.map((clause, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.06 }}
                                whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                                className="p-8 border-b border-slate-200 dark:border-white/5 last:border-b-0 space-y-3 group cursor-default transition-colors dark:hover:!bg-[rgba(255,255,255,0.015)]"
                            >
                                <div className="flex gap-6 items-baseline">
                                    <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.3 }} className="text-[9px] text-slate-400 dark:text-zinc-700 shrink-0 font-bold">[{clause.num}]</motion.div>
                                    <h2 className="text-base font-bold uppercase tracking-tight group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{clause.title}</h2>
                                </div>
                                <p className="text-slate-500 dark:text-zinc-500 text-[13px] normal-case leading-relaxed pl-10">{clause.body}</p>
                                <div className="pl-10 h-px bg-slate-200 dark:bg-zinc-900 overflow-hidden">
                                    <motion.div initial={{ width: 0 }} whileInView={{ width: "100%" }} viewport={{ once: true }} transition={{ duration: 1.3, delay: i * 0.08 }} className="h-full bg-slate-400/20 dark:bg-white/8" />
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </main>

            <PageFooter id="PRIVACY_POLICY" links={[{ href: "/terms", label: "terms" }, { href: "/security", label: "security" }, { href: "/contact", label: "contact" }]} />
        </div>
    );
}
