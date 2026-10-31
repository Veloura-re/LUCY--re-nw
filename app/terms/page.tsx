"use client";

import { ThemeToggle } from "@/components/ui/theme-toggle";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { ScanLines, CustomCursor, AnimatedGrid, Reveal, PageFooter, GlitchText, InteractiveParticleSimulation } from "@/components/public/animations";
import { Logo } from "@/components/ui/logo";
import { LEGAL_VERSION } from "@/lib/legal-versions";

const clauses = [
    { num: "01", title: "Agreement, Eligibility and Authority", body: "By creating an account or using LUCY OS you agree to these terms. Where an individual accepts on behalf of a school, they confirm they have authority to bind that institution. Teachers, students, parents and other individual users access the platform under their institution's agreement and must also follow these terms. Users who are minors may use the platform only with their institution's authorization and, where the law requires it, their parent or guardian's consent, which the institution is responsible for obtaining." },
    { num: "02", title: "Permitted Educational Use", body: "Platform usage is licensed exclusively for institutional management and academic administration. Commercial data harvesting, scraping, or utilization for non-educational monetization is strictly prohibited." },
    { num: "03", title: "Credential Integrity and Account Liability", body: "Institutions are responsible for maintaining the absolute security of administrative keys, invite tokens, and passwords. Directors may invite accountants and recorders by email; the institution decides who receives those roles, and each role can reach only the records it needs. The institution assumes full liability for all actions, data entries, and system configurations made under their school account. Users must not share credentials and must report suspected compromise to their administrator and to security@5-cn.net without delay." },
    { num: "04", title: "Institutional Data Ownership", body: "All academic data (student lists, grades, marks, schedules) remains the exclusive property of the institutional Responsible Party. LUCY OS claims no ownership of institutional data and uses it only to provide the service as described in the Privacy Policy and the DPA." },
    { num: "05", title: "User Conduct and Community Content", body: "Users must not harass or impersonate others, upload unlawful, infringing or malicious files, post content that exposes other people's personal information, or use the platform to cheat on assessments. Content posted to shared spaces such as chat rooms, public comments and the community wall is the responsibility of the person who posted it. We and the institution may remove content and restrict accounts that breach these terms." },
    { num: "06", title: "Sanctuary Rules and Limits", body: "Sanctuary is a peer-support and mentorship space, not an emergency, medical or counseling service, and it does not replace the institution's safeguarding procedures. Users must not share contact details, attempt to identify other participants, or capture, record, export or distribute session content. Sessions are pseudonymous but linked to accounts; reported sessions are reviewed by platform moderators; confidentiality is subject to the exceptions in the Privacy Policy, including disclosure required by law or needed to prevent serious harm. If you or someone else is in immediate danger, contact local emergency services." },
    { num: "07", title: "AI-Assisted Features", body: "LUCY OS includes AI-assisted features that process the content a user submits to them, as described in the Privacy Policy. All outputs are provided 'as-is', may be inaccurate or incomplete, and must be reviewed by a qualified person before they influence grades, discipline, welfare or financial decisions. The institution must not use automated outputs as the sole basis for a decision that significantly affects a student or staff member. LUCY OS disclaims liability for processing errors." },
    { num: "08", title: "Acceptable Use and Zero Tolerance Security", body: "Any attempt to inject malicious code, execute DDoS attacks, bypass authentication layers, scrape data, or breach tenant isolation is met with immediate, permanent account termination. We employ automated heuristics and log auditing to track violations, and reserve the right to ban IP ranges and provide forensic logs to cybercrime authorities for prosecution. Good-faith security research reported through our security report form or security@5-cn.net, without accessing data that is not your own, degrading the service or disclosing the issue before we respond, will not be treated as a violation." },
    { num: "09", title: "Plans, Trial and Fees", body: "Fees depend on the plan selected and are stated at purchase or in the order. Paid plans renew each billing period until cancelled. Payments may be made through Stripe or Chapa; where a payment is made in Ethiopian Birr it is converted from the plan's USD price at the rate applied at checkout. Fees exclude taxes, which the institution is responsible for. Accounts more than 15 days overdue may be suspended. Evaluation trials, including the 120-day trial available on request, carry no fee. When a trial ends the school must select a paid plan to continue, otherwise access may be suspended and its data handled under clause 14. We may change prices for a future billing period on at least 30 days' notice." },
    { num: "10", title: "Fulfillment Policy", body: "Upon successful payment of a subscription fee, the school account is provisioned and activated automatically and all features of the selected tier are immediately available. Trial accounts are provisioned after the access request is approved. No physical goods are provided under this agreement." },
    { num: "11", title: "No Refund Policy", body: "Due to the immediate provisioning of server resources and cloud infrastructure upon payment, all subscription fees are strictly non-refundable. This applies to both monthly and annual commitments, regardless of actual usage levels during the billing cycle. The evaluation trial exists so that schools can assess the platform before paying." },
    { num: "12", title: "Service Level Agreement and Outage Exclusions", body: "We guarantee a 99.9% uptime monthly target for Core Plan schools and 99.99% for Enterprise Plan. Downtime calculations exclude scheduled maintenance windows (announced 7 days in advance), force majeure events, and outages of upstream third-party providers (including Vercel, Cloudflare, Supabase and Google) beyond our direct control. The full terms are in the Service Level Agreement." },
    { num: "13", title: "SLA Remedy Credit System", body: "If monthly availability falls below the target, the sole and exclusive remedy is the issuance of Service Credits applied to the next billing cycle: 10% credit for a drop below target, and 25% credit for a drop below 99.0%. Claims must be submitted to support within 15 days of month-end. Service Credits in any single month are strictly capped at 30% of the monthly subscription fee." },
    { num: "14", title: "Suspension, Termination and Data Return", body: "The institution may cancel at any time and should export its data before the subscription ends, using the Admin Ledger or the API. Either party may terminate for a material breach that remains uncured 30 days after written notice, and we may suspend or terminate immediately for security threats, unlawful use or non-payment. On termination access is revoked and the school's data is deleted within 30 days as set out in the Privacy Policy and DPA, apart from audit records we are required to keep. Clauses that by their nature should survive termination, including payment obligations, liability limits and indemnities, will survive." },
    { num: "15", title: "Warranty Disclaimer", body: "The platform is provided on an 'as-is' and 'as-available' basis. LUCY OS disclaims all warranties of any kind, whether express, implied, statutory, or otherwise, including implied warranties of merchantability, fitness for a particular purpose, or error-free or entirely secure operation. We do not warrant that the service will meet your specific requirements, and the institution is responsible for decisions it makes based on platform data." },
    { num: "16", title: "Limitation of Liability and Consequential Damage Cap", body: "LUCY OS shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including lost tuition revenue, reputational harm, or data loss. Our aggregate direct liability for any claim is strictly capped at the total amount of subscription fees paid by the institution in the 12 months immediately preceding the event. Nothing in these terms limits liability that cannot be limited by law." },
    { num: "17", title: "Mutual Indemnification", body: "The institution agrees to defend, indemnify, and hold harmless LUCY OS against third-party claims, liabilities, or expenses arising from the institution's violation of privacy laws, upload of copyrighted curriculum without license, or misuse of user information." },
    { num: "18", title: "Third-Party Services and Intellectual Property", body: "The platform relies on third-party services, including payment, hosting, email and AI providers, and is subject to their availability and terms. LUCY OS and its licensors retain all rights in the platform, software, design and trademarks; the institution receives a non-exclusive, non-transferable, revocable right to use the platform during the subscription. Feedback you give us may be used to improve the platform without obligation to you." },
    { num: "19", title: "Changes to These Terms", body: "We may update these terms. We will publish the revised version on this page with a new revision date and give administrators at least 30 days' notice of material changes by email or in the dashboard. Continued use after the effective date is acceptance of the revised terms." },
    { num: "20", title: "Order of Precedence and General Terms", body: "These terms apply together with the Master Service Agreement, Data Processing Agreement, Service Level Agreement and Privacy Policy. If they conflict, the DPA prevails on the processing of personal data and the MSA prevails on other commercial terms. If any provision is unenforceable the rest remains in effect. These documents are the entire agreement on their subject. The institution may not assign its rights without our written consent. Notices may be given by email to the addresses on the account and to support@5-cn.net." },
    { num: "21", title: "Governing Law and Disputes Jurisdiction", body: "These terms are governed exclusively by the laws of Ethiopia. The parties will first try to resolve any dispute through good-faith negotiation for 30 days after written notice, after which they submit to the sole jurisdiction of the Federal Courts in Addis Ababa." },
    { num: "22", title: "Contact", body: "General and billing questions: support@5-cn.net and billing@5-cn.net. Security and compliance: security@5-cn.net." },
];

export default function Terms() {
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
                            <FileText className="w-4 h-4 shrink-0" />
                            <motion.div animate={{ width: ["32px", "72px", "32px"] }} transition={{ duration: 2.8, repeat: Infinity }} className="h-px bg-slate-300 dark:bg-zinc-700" />
                            <span className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] sm:tracking-[0.4em]">legal_policy // effective 2026-01-01 // revised {LEGAL_VERSION}</span>
                        </Reveal>
                        <Reveal delay={0.1}>
                            <h1 className="text-3xl sm:text-5xl md:text-7xl font-bold uppercase tracking-tighter leading-none">
                                terms of<br /><GlitchText className="text-slate-300 dark:text-zinc-800">service.</GlitchText>
                            </h1>
                        </Reveal>
                        <Reveal delay={0.2}>
                            <p className="text-slate-500 dark:text-zinc-500 text-sm sm:text-base leading-relaxed">
                                the operating agreement between LUCY OS and each provisioned school account. read before initializing your system.
                            </p>
                        </Reveal>
                    </section>

                    <div className="space-y-0 border border-slate-200 dark:border-white/5 overflow-hidden rounded-xl dark:rounded-none">
                        {clauses.map((clause, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 16 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.05 }}
                                whileHover={{ backgroundColor: "rgba(0,0,0,0.02)" }}
                                className="p-8 border-b border-slate-200 dark:border-white/5 last:border-b-0 space-y-3 group cursor-default transition-colors dark:hover:!bg-[rgba(255,255,255,0.015)]"
                            >
                                <div className="flex gap-6 items-baseline">
                                    <motion.div animate={{ opacity: [0.4, 0.8, 0.4] }} transition={{ duration: 2.8, repeat: Infinity, delay: i * 0.4 }} className="text-[9px] text-slate-400 dark:text-zinc-700 shrink-0 font-bold">[{clause.num}]</motion.div>
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

            <PageFooter id="TERMS_OF_SERVICE" links={[{ href: "/privacy", label: "privacy" }, { href: "/security", label: "security" }, { href: "/contact", label: "contact" }]} />
        </div>
    );
}
