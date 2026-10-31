"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Keyboard, Play, Pause,
  Cpu, Shield, Terminal as TerminalIcon, Layers,
  ChevronDown, ArrowUpRight, Info, CheckCircle2,
  AlertTriangle, Database, Activity, Mail, CreditCard, Users,
  BookOpen, GraduationCap, ClipboardList, BarChart3,
  Clock, Lock, Zap, Globe, Eye, FileText, Bell,
  UserCheck, Calendar, Palette, Settings, MessageSquare,
  HeartHandshake, Sparkles, ArrowRight, ShieldCheck,
  Smartphone, Award, RefreshCw, Check, Maximize2, Minimize2,
  AlertCircle, DollarSign, Send, HelpCircle, CheckCheck,
  FileDown, Download, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { downloadDeckAsPPTX, downloadDeckAsPDF } from "@/lib/deck-export";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
  ScanLines, CustomCursor, AnimatedGrid, HexGrid,
  GlitchOverlay, Counter, InteractiveParticleSimulation
} from "@/components/public/animations";

// ─── Custom Confetti Particle System ──────────────────────────────────────────
function PresentationConfetti({ trigger }: { trigger: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const colors = ["#10b981", "#38bdf8", "#818cf8", "#fbbf24", "#f43f5e", "#ffffff"];
    const particles: Array<{
      x: number; y: number; size: number; color: string;
      speedX: number; speedY: number; rotation: number; rotationSpeed: number;
    }> = [];

    for (let i = 0; i < 160; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 5 - 2.5,
        speedY: Math.random() * 4 + 2,
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 4 - 2,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      let active = false;
      particles.forEach(p => {
        p.y += p.speedY;
        p.x += p.speedX;
        p.rotation += p.rotationSpeed;
        if (p.y < height) active = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });
      if (active) animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [trigger]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[50] w-full h-full" />;
}

// ─── Large Stage-Ready Stat Counter ──────────────────────────────────────────
function ProjectorStatBlock({ label, value, prefix = "", suffix = "", delay = 0, sub }: { label: string; value: number; prefix?: string; suffix?: string; delay?: number; sub?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: false }}
      transition={{ delay, duration: 0.4, type: "spring" }}
      className="p-6 md:p-8 border-2 border-slate-300 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/80 rounded-3xl text-center space-y-1.5 shadow-xl"
    >
      <div className="text-4xl sm:text-6xl md:text-7xl font-black text-emerald-600 dark:text-emerald-400 font-mono flex items-center justify-center tracking-tight">
        {prefix && <span>{prefix}</span>}
        <Counter from={0} to={value} suffix={suffix} duration={1.8} />
      </div>
      <div className="text-xs sm:text-sm md:text-base text-slate-800 dark:text-zinc-200 uppercase tracking-widest font-black font-sans">{label}</div>
      {sub && <div className="text-[11px] text-slate-500 dark:text-zinc-400 font-sans">{sub}</div>}
    </motion.div>
  );
}

// ─── Large Stage-Ready Feature Card ───────────────────────────────────────────
function ProjectorCard({ icon: Icon, title, desc, delay = 0, badge, highlight, extra }: { icon: any; title: string; desc: string; delay?: number; badge?: string; highlight?: boolean; extra?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false }}
      transition={{ delay, duration: 0.4 }}
      className={`p-6 md:p-8 border-2 rounded-3xl transition-all duration-300 group space-y-3 shadow-lg relative overflow-hidden ${highlight
          ? "border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40"
          : "border-slate-300 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/70"
        }`}
    >
      <div className="flex items-center justify-between">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
          <Icon className="w-6 h-6 md:w-7 md:h-7" />
        </div>
        {badge && (
          <span className="text-xs md:text-sm font-mono font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 px-3 py-1 rounded-xl border border-emerald-500/40">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-base sm:text-lg md:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight font-sans">{title}</h3>
      <p className="text-sm sm:text-base text-slate-700 dark:text-zinc-300 leading-relaxed font-sans font-medium">{desc}</p>
      {extra && <div className="pt-2">{extra}</div>}
    </motion.div>
  );
}

// ─── Floating Stress Persona Bubble ───────────────────────────────────────────
function StressPersonaBubble({ role, quote, problem, delay }: { role: string; quote: string; problem: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: [0, -4, 0] }}
      transition={{
        opacity: { delay, duration: 0.4 },
        scale: { delay, duration: 0.4 },
        y: { repeat: Infinity, duration: 4 + delay, ease: "easeInOut" }
      }}
      className="p-5 border-2 border-rose-300 dark:border-rose-900/60 bg-rose-50/90 dark:bg-rose-950/40 backdrop-blur-xl rounded-3xl space-y-2 shadow-lg text-left"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-widest text-rose-700 dark:text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
          {role}
        </span>
        <AlertCircle className="w-4 h-4 text-rose-500" />
      </div>
      <p className="text-xs sm:text-sm text-slate-800 dark:text-rose-100 font-sans italic leading-relaxed">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="text-[11px] font-mono text-rose-700 dark:text-rose-300 font-bold uppercase pt-1 border-t border-rose-200 dark:border-rose-900/40">
        Pain: {problem}
      </div>
    </motion.div>
  );
}

// ─── Presentation Slide Definition ───────────────────────────────────────────
interface Slide {
  id: string;
  tag: string;
  title: string;
  sub: string;
  content: React.ReactNode;
  technicalAppendix: string[];
}

export default function PresentationDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAppendix, setShowAppendix] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExportingPPTX, setIsExportingPPTX] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const handleDownloadPPTX = async () => {
    try {
      setIsExportingPPTX(true);
      toast.info("Generating animated PowerPoint presentation (.pptx)...");
      await downloadDeckAsPPTX();
      toast.success("PowerPoint presentation downloaded successfully!");
    } catch (error) {
      console.error("PPTX export error:", error);
      toast.error("Failed to generate PowerPoint file.");
    } finally {
      setIsExportingPPTX(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPDF(true);
      toast.info("Generating high-resolution presentation PDF...");
      await downloadDeckAsPDF();
      toast.success("Keynote PDF downloaded successfully!");
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to generate PDF file.");
    } finally {
      setIsExportingPDF(false);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => { });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => { });
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const slides: Slide[] = [
    // ──────────────────── 1. THE INVISIBLE BURDEN ────────────────────
    {
      id: "intro_burden",
      tag: "Act 01 // The Silent Tax on Schools",
      title: "The Friction Holding Your Campus Back",
      sub: "Behind every great school is an invisible operational tax: hundreds of wasted educator hours, unverified bank receipts, and anxious parents locked in communication blackouts.",
      content: (
        <div className="space-y-4 w-full text-left">
          {/* Animated Popping Stress Personas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <StressPersonaBubble
              role="Senior Faculty (11:45 PM)"
              quote="I spend 20 hours calculating weighted averages on scratch paper every exam week instead of mentoring students. I haven't slept before 1 AM all term."
              problem="40 Hours Monthly Grading Fatigue"
              delay={0.1}
            />
            <StressPersonaBubble
              role="Anxious Parent (Home)"
              quote="I pay premium tuition, yet I have zero visibility into my son's daily attendance or test scores until finals are already over."
              problem="90-Day Information Blackout"
              delay={0.2}
            />
            <StressPersonaBubble
              role="School Principal"
              quote="Our master timetable collapsed twice this term because Room 204 was double-booked for Physics and Chemistry. 45 students had nowhere to sit."
              problem="Classroom & Schedule Collisions"
              delay={0.3}
            />
            <StressPersonaBubble
              role="Finance Director"
              quote="We spend 4 days matching unverified bank slips across three different banks while tuition arrears compound into uncollected debt."
              problem="Revenue Leakage & Manual Slip Chasing"
              delay={0.4}
            />
          </div>
          <div className="p-4 border-2 border-emerald-500/40 bg-emerald-50/90 dark:bg-emerald-950/40 rounded-2xl text-xs sm:text-sm md:text-base text-emerald-950 dark:text-emerald-200 font-bold flex items-center gap-3 shadow-md">
            <Sparkles className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>LUCY was built to eliminate this friction entirely—returning time to teachers, clarity to parents, and financial control to leadership.</span>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Legacy Friction: Disconnected spreadsheets, unverified paper bank slips, chaotic WhatsApp gossip groups, and end-of-term administrative panic.",
        "LUCY OS: One unified real-time operational engine connecting School Owners, Principals, Faculty, Parents, and Scholars."
      ]
    },

    // ──────────────────── 2. THE CORE PHILOSOPHY ────────────────────
    {
      id: "core_philosophy",
      tag: "Act 02 // The Architectural Shift",
      title: "Software Must Execute The Work, Not Just Host It",
      sub: "Scanning paper into PDFs is not innovation. LUCY executes the underlying cognitive workload autonomously—computing weighted marklists, preventing schedule collisions, and streaming live campus telemetry.",
      content: (
        <div className="space-y-4 w-full text-left">
          <div className="space-y-4">
            {[
              {
                manual: "Faculty members spend 18 hours manually crunching weighted percentages, ranking formulas, and grade curves with a calculator.",
                lucy: "Continuous automated aggregation computes weighted marklists, grade distributions, and student rankings in milliseconds."
              },
              {
                manual: "Administrative staff spend 3 full days printing, sorting, stamping, and manually sealing paper report cards.",
                lucy: "Cryptographically verified, school-branded digital PDF report dossiers generated in 60 seconds with QR verification."
              },
              {
                manual: "Parents endure a 90-day communication blackout, discovering learning obstacles only after term finals are finished.",
                lucy: "Real-time visibility into daily attendance, test scores, homework rosters, and teacher notes on any smartphone."
              }
            ].map((comp, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.12 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 md:p-6 border-2 border-slate-300 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/70 rounded-3xl text-sm md:text-base shadow-md"
              >
                <div className="text-slate-600 dark:text-zinc-400 flex items-start gap-3">
                  <span className="text-rose-600 dark:text-rose-400 font-black font-mono shrink-0 uppercase">[Legacy Strain]</span>
                  <span className="font-sans font-medium text-xs sm:text-sm md:text-base">{comp.manual}</span>
                </div>
                <div className="text-slate-900 dark:text-white font-bold flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span className="font-sans text-xs sm:text-sm md:text-base text-emerald-800 dark:text-emerald-300 font-bold">{comp.lucy}</span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ),
      technicalAppendix: [
        "Dynamic formula engine supports customizable curriculum assessment models (e.g. 20/30/50 weighted marklists).",
        "Deterministic rendering generates verified PDF report cards with zero formula errors."
      ]
    },

    // ──────────────────── 3. SOLUTION 1: ACADEMIC CORE ────────────────────
    {
      id: "sol_paperwork",
      tag: "Act 03 // Academic Infrastructure",
      title: "The 40-Hour Gift to Every Educator",
      sub: "When repetitive arithmetic and manual paperwork are automated with 100% mathematical precision, burnout drops, lesson quality surges, and faculty retention climbs.",
      content: (
        <div className="space-y-4 w-full text-left">
          <div className="grid grid-cols-2 gap-4">
            <ProjectorStatBlock label="Monthly Time Reclaimed" value={40} suffix="h" delay={0.05} sub="Per faculty member on grading" />
            <ProjectorStatBlock label="Formula Precision" value={100} suffix="%" delay={0.1} sub="Zero calculation errors" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProjectorCard
              icon={BarChart3}
              title="Autonomous Marklists"
              desc="Enter raw scores directly into structured matrices. Weighted totals, grade distributions, and student ranks calculate automatically."
              badge="Instant Math"
              delay={0.15}
            />
            <ProjectorCard
              icon={FileText}
              title="60-Second Report Dossiers"
              desc="Generate elegant, school-branded PDF report cards with QR security stamps and principal signatures for hundreds of scholars in 60 seconds."
              badge="60 Seconds"
              delay={0.2}
            />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Continuous grading engine automatically handles weights, curves, and teacher remarks.",
        "Generates cumulative academic transcripts ready for ministry export."
      ]
    },

    // ──────────────────── 4. SOLUTION 2: PARENT BRIDGE ────────────────────
    {
      id: "sol_parents",
      tag: "Act 04 // Family Alignment",
      title: "Continuous Transparency Builds Fierce Parent Loyalty",
      sub: "Eliminate chaotic WhatsApp gossip groups. Empower families with direct, live academic visibility and protect teacher sanity with automated evening quiet hours.",
      content: (
        <div className="space-y-4 w-full text-left">
          <div className="grid grid-cols-2 gap-4">
            <ProjectorStatBlock label="Absence SMS Dispatch" value={3} suffix="s" delay={0.05} sub="Instant notification to parents" />
            <ProjectorStatBlock label="Family Trust Index" value={98} suffix="%" delay={0.1} sub="Reported parental satisfaction" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProjectorCard
              icon={Eye}
              title="Live Parental Portal"
              desc="Parents track test grades, lesson pacing, and daily attendance immediately from their smartphones. No more 90-day blackouts."
              badge="Real-Time"
              delay={0.15}
            />
            <ProjectorCard
              icon={MessageSquare}
              title="Boundary-Enforced School Chat"
              desc="Official institutional messaging keeps teacher phone numbers private with automated evening quiet hours to protect faculty wellbeing."
              badge="Private & Safe"
              delay={0.2}
            />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Multi-student family accounts allow parents to switch between children effortlessly.",
        "Automatic SMS integration notifies parents within seconds of unexcused absences."
      ]
    },

    // ──────────────────── 5. SOLUTION 3: CAMPUS LOGISTICS ────────────────
    {
      id: "sol_operations",
      tag: "Act 05 // Campus Operations",
      title: "Zero Double-Bookings. Flawless Campus Command.",
      sub: "Constraint-satisfaction scheduling that prevents room and teacher clashes, paired with 10-second single-tap roll calls across the entire campus.",
      content: (
        <div className="space-y-4 w-full text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProjectorCard
              icon={ClipboardList}
              title="10-Second Digital Roll Call"
              desc="Teachers mark present or absent with single-tap rosters, updating school records and parent portals in real time."
              badge="Single-Tap Roster"
              delay={0.05}
            />
            <ProjectorCard
              icon={Calendar}
              title="Collision-Free Timetables"
              desc="Intelligent scheduling engine prevents room double-bookings and balances teacher workloads across the campus."
              badge="Zero Clashes"
              delay={0.1}
            />
            <ProjectorCard
              icon={BookOpen}
              title="Structured Curriculum Tracking"
              desc="Teachers organize curriculum topics and lesson notes in clean digital views for academic coordinators."
              badge="Curriculum Sync"
              delay={0.15}
            />
            <ProjectorCard
              icon={UserCheck}
              title="Paperless Absence Permits"
              desc="Parents submit medical notes and leave requests directly via smartphone. Approved by principals with a single tap."
              badge="Paperless"
              delay={0.2}
            />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Optimized lightweight payloads allow attendance roll calls to submit instantly with minimal bandwidth.",
        "Constraint satisfaction algorithm guarantees optimal classroom and teacher utilization."
      ]
    },

    // ──────────────────── 6. SOLUTION 4: FINANCIAL AUTONOMY ───────────────
    {
      id: "sol_finance",
      tag: "Act 06 // Institutional Capital",
      title: "Instant Mobile Settlement & 100% Ledger Precision",
      sub: "Direct Telebirr, CBE Birr, and card payments reconcile automatically. School owners monitor live tuition revenues, arrears, and operating costs.",
      content: (
        <div className="space-y-4 w-full text-left">
          <div className="grid grid-cols-2 gap-4">
            <ProjectorStatBlock label="Faster Fee Collection" value={25} suffix="%" delay={0.05} sub="Via automated SMS reminders" />
            <ProjectorStatBlock label="Tuition Record Accuracy" value={100} suffix="%" delay={0.1} sub="Zero missing bank slips" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProjectorCard
              icon={CreditCard}
              title="Automated Digital Invoices"
              desc="Parents settle tuition via Telebirr, CBE Birr, or card, receiving verified digital receipts with instant ledger reconciliation."
              badge="Instant Settlement"
              delay={0.15}
            />
            <ProjectorCard
              icon={Activity}
              title="Live Cash-Flow Dashboard"
              desc="School directors track incoming tuition, pending arrears, and operating expenditures in real time."
              badge="Executive View"
              delay={0.2}
            />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Double-entry bookkeeping ledger prevents unauthorized balance overrides.",
        "Instant settlement webhooks update student tuition records without manual data entry."
      ]
    },

    // ──────────────────── 7. SOLUTION 5: THE SANCTUARY ───────────────────
    {
      id: "sol_sanctuary",
      tag: "Act 07 // Student Wellbeing",
      title: "The Sanctuary: Anonymous Student Mental Health & Safety",
      sub: "Scholars in Grades 7–12 cannot excel academically if they are suffering in silence. A protected, zero-doxxing space with real-time PII shields and faculty guidance.",
      content: (
        <div className="space-y-4 w-full text-left">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProjectorCard
              icon={HeartHandshake}
              title="Anonymous Peer Uplink"
              desc="Students discuss academic anxiety and peer pressure with a fellow secondary scholar across the school network without stigma."
              badge="Grades 7–12"
              delay={0.05}
            />
            <ProjectorCard
              icon={GraduationCap}
              title="Verified Educator Mentorship"
              desc="Scholars connect with verified faculty counselors for confidential academic advice and emotional encouragement."
              badge="Verified Faculty"
              delay={0.1}
            />
            <ProjectorCard
              icon={Shield}
              title="Real-Time Anti-Doxxing Shields"
              desc="Automated guardrail engine instantly intercepts and scrubs personal phone numbers, emails, and social media handles."
              badge="Anti-Doxxing"
              delay={0.15}
            />
            <ProjectorCard
              icon={Lock}
              title="Ephemeral Privacy & 24/7 Crisis Guard"
              desc="Sessions dissolve on exit with anti-capture veils and immediate automated routing to 24/7 crisis lifelines. No student is left alone."
              badge="Zero Trace"
              delay={0.2}
            />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Automated regex sanitizer blocks phone numbers, emails, and social media handles in real time.",
        "Sessions are strictly ephemeral with client-side anti-capture interceptors and crisis hotlines."
      ]
    },

    // ──────────────────── 8. SOLUTION 6: CLOUD SOVEREIGNTY ─────────────────
    {
      id: "sol_security",
      tag: "Act 08 // Enterprise Security",
      title: "Permanent Cloud Records & Immutable Audit Trails",
      sub: "Academic marks and institutional finances protected with per-school isolation enforced on every request, role-based boundaries, and zero on-premise hardware costs.",
      content: (
        <div className="space-y-4 w-full text-left">
          <div className="grid grid-cols-2 gap-4">
            <ProjectorStatBlock label="Platform Uptime" value={99.9} suffix="%" delay={0.05} sub="High-availability cloud" />
            <ProjectorStatBlock label="Server Hardware Cost" value={0} prefix="$" delay={0.1} sub="Zero local server overhead" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ProjectorCard
              icon={TerminalIcon}
              title="Cryptographic Audit Ledger"
              desc="Every mark entry, fee adjustment, and record modification is permanently logged with exact user attribution and timestamps."
              badge="100% Traceable"
              delay={0.15}
            />
            <ProjectorCard
              icon={Globe}
              title="Encrypted Hourly Snapshots"
              desc="Runs securely in the cloud on any device. Hourly cloud snapshots protect against hardware failures or physical fire damage."
              badge="AES-256 Cloud"
              delay={0.2}
            />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Every request is authorized against the caller's school and role, with database row-level security as an additional layer.",
        "Automatic cloud snapshot backups ensure zero institutional data loss."
      ]
    },

    // ──────────────────── 9. THE INSTITUTIONAL FLYWHEEL ───────────────────
    {
      id: "flywheel_growth",
      tag: "Act 09 // The Multiplier Effect",
      title: "The Flywheel: How Modern Campuses Dominate Their Market",
      sub: "When operational friction disappears, a compounding cycle of teacher energy, parent loyalty, and student achievement turns a campus into a market leader.",
      content: (
        <div className="space-y-3 w-full text-left">
          {[
            { step: "01", title: "Zero-Friction Operations", desc: "Automating repetitive workflows reclaims dozens of hours every week for teachers and administrators." },
            { step: "02", title: "Energized Faculty", desc: "Educators invest reclaimed energy into richer lesson pacing and individualized student mentorship." },
            { step: "03", title: "Continuous Transparency", desc: "Live parent portals build deep, enduring institutional trust and eliminate communication blackouts." },
            { step: "04", title: "Thriving Scholars", desc: "Students feel safe, valued, and motivated—accelerating exam performance and emotional wellbeing." },
            { step: "05", title: "Campus Market Dominance", desc: "Exceptional parent loyalty and academic prestige drive word-of-mouth waitlists and enrollment growth." }
          ].map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              className="p-4 md:p-5 border-2 border-slate-300 dark:border-zinc-800 bg-white/90 dark:bg-zinc-950/70 rounded-2xl flex items-center gap-4 group hover:border-emerald-500 transition-colors shadow-md"
            >
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-emerald-500/10 border-2 border-emerald-500/40 flex items-center justify-center text-sm md:text-base font-black font-mono text-emerald-700 dark:text-emerald-400 shrink-0">
                {item.step}
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm sm:text-base md:text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight font-sans">{item.title}</h4>
                <p className="text-xs sm:text-sm md:text-base text-slate-700 dark:text-zinc-300 font-sans font-medium">{item.desc}</p>
              </div>
              <ArrowRight className="w-5 h-5 text-slate-400 dark:text-zinc-500 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all shrink-0" />
            </motion.div>
          ))}
        </div>
      ),
      technicalAppendix: [
        "The Flywheel aligns school leadership, faculty, parents, and students into one unified feedback loop.",
        "Increased retention and word-of-mouth recommendations directly boost campus enrollment."
      ]
    },

    // ──────────────────── 10. CONCLUSION & 4-MONTH TRIAL ─────────────────
    {
      id: "conclusion_launch",
      tag: "Act 10 // The Partnership Mandate",
      title: "Deploy Across Your Campus: 4 Months Free",
      sub: "Experience the entire LUCY operating system across your entire school for a full academic term—with zero risk, zero hardware, and complete hands-on onboarding.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-8 sm:p-12 border-2 border-emerald-500 bg-emerald-50/90 dark:bg-emerald-950/50 rounded-3xl space-y-6 shadow-2xl text-center"
          >
            <div className="w-20 h-20 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-xl">
              <ShieldCheck className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <span className="inline-block text-xs md:text-sm font-mono font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300 bg-emerald-500/20 px-4 py-1.5 rounded-xl border border-emerald-500/40">
                Full Academic Term Offer
              </span>
              <h3 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Start Your 4-Month Free Trial
              </h3>
            </div>

            <p className="text-base sm:text-lg md:text-xl text-slate-700 dark:text-zinc-200 max-w-xl mx-auto leading-relaxed font-sans font-medium">
              Equip your entire school with automated gradebooks, live parent communication, conflict-free scheduling, and student Sanctuary support.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left py-2">
              <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-emerald-500/30 text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>4 Full Months Free</span>
              </div>
              <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-emerald-500/30 text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Zero Server Hardware</span>
              </div>
              <div className="p-3 rounded-xl bg-white/80 dark:bg-zinc-900/80 border border-emerald-500/30 text-xs font-bold text-slate-800 dark:text-zinc-200 flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>15-Min Onboarding</span>
              </div>
            </div>

            <div className="pt-2 flex justify-center">
              <Link href="/register">
                <Button
                  onClick={() => setShowConfetti(true)}
                  className="w-full sm:w-auto h-14 px-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base uppercase tracking-wider rounded-2xl shadow-xl shadow-emerald-950/40 transition-all"
                >
                  Claim 4-Month Free Trial <ArrowUpRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      ),
      technicalAppendix: [
        "Complete 4-month academic term trial covers unlimited teachers, students, and parent accounts.",
        "Dedicated institutional customer support at support@5-cn.net."
      ]
    }
  ];

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentSlide(prev => (prev + 1) % slides.length);
    setShowAppendix(false);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
    setShowAppendix(false);
  }, [slides.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "f" || e.key === "F") {
        toggleFullscreen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Auto-play loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(handleNext, 9000);
    return () => clearInterval(interval);
  }, [isPlaying, handleNext]);

  // Confetti timeout
  useEffect(() => {
    if (!showConfetti) return;
    const timeout = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timeout);
  }, [showConfetti]);

  const slide = slides[currentSlide];

  // Large-Stage Slide transition animation variants
  const slideVariants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 90 : -90,
      opacity: 0,
      filter: "blur(6px)",
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      filter: "blur(0px)",
      scale: 1,
      transition: {
        x: { type: "spring" as const, stiffness: 260, damping: 26 },
        opacity: { duration: 0.35 },
        filter: { duration: 0.25 },
        scale: { duration: 0.35 }
      }
    },
    exit: (dir: number) => ({
      x: dir > 0 ? -90 : 90,
      opacity: 0,
      filter: "blur(6px)",
      scale: 0.98,
      transition: {
        x: { type: "spring" as const, stiffness: 260, damping: 26 },
        opacity: { duration: 0.25 }
      }
    })
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-black text-slate-900 dark:text-white flex flex-col font-mono lowercase tracking-tight select-none overflow-x-hidden overflow-y-auto relative transition-colors duration-300">

      {/* ── Visual Overlays & Animated Particle Background ── */}
      <ScanLines />
      <CustomCursor />
      <AnimatedGrid />
      <HexGrid />
      <GlitchOverlay />
      <InteractiveParticleSimulation count={120} interactive={true} burstOnLoad={true} fullScreen={true} connectionDistance={140} showTriangles={true} />
      <PresentationConfetti trigger={showConfetti} />

      {/* ── Ambient Radial Glow for High-Contrast Projectors ── */}
      <div className="fixed inset-0 pointer-events-none z-0 flex items-center justify-center opacity-40 dark:opacity-30">
        <motion.div
          animate={{ scale: [1, 1.15, 1], rotate: [0, 90, 0] }}
          transition={{ repeat: Infinity, duration: 18, ease: "linear" }}
          className="w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-emerald-500/30 via-sky-500/20 to-teal-500/30 blur-[150px]"
        />
      </div>

      {/* ── Top Presenter Bar ── */}
      <nav className="border-b-2 border-slate-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between relative z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl transition-colors">
        <Link href="/" className="flex items-center gap-3 group">
          <Logo className="w-8 h-8 text-slate-900 dark:text-white" />
          <span className="font-black text-xl tracking-tighter text-slate-900 dark:text-white">LUCY OS</span>
          <span className="hidden sm:inline-block text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            Projector Keynote
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Button
              onClick={handleDownloadPPTX}
              disabled={isExportingPPTX}
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-xl border-2 border-slate-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 shadow-sm"
              title="Download as PowerPoint (.pptx) with animations and speaker notes"
            >
              {isExportingPPTX ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" /> : <FileDown className="w-3.5 h-3.5 text-emerald-500" />}
              <span className="hidden sm:inline">PPTX</span>
            </Button>

            <Button
              onClick={handleDownloadPDF}
              disabled={isExportingPDF}
              variant="outline"
              size="sm"
              className="h-9 px-3 rounded-xl border-2 border-slate-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-800 dark:text-zinc-200 shadow-sm"
              title="Download as High-Resolution Presentation PDF"
            >
              {isExportingPDF ? <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-500" /> : <FileText className="w-3.5 h-3.5 text-teal-500" />}
              <span className="hidden sm:inline">PDF</span>
            </Button>
          </div>

          <Button
            onClick={toggleFullscreen}
            variant="outline"
            size="sm"
            className="h-9 px-3 rounded-xl border-2 border-slate-300 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-zinc-900"
            title="Toggle Projector Fullscreen (Press F)"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4 text-emerald-500" />}
            <span className="hidden md:inline">{isFullscreen ? "Exit Fullscreen" : "Projector Mode"}</span>
          </Button>

          <Link href="/register">
            <Button className="h-9 sm:h-10 px-3.5 sm:px-5 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] sm:text-xs uppercase tracking-widest font-black rounded-xl shadow-md transition-all">
              4-Month Free Trial
            </Button>
          </Link>

          <motion.span
            animate={{ borderColor: ["rgba(16,185,129,0.3)", "rgba(16,185,129,0.8)", "rgba(16,185,129,0.3)"] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 border-2 border-emerald-500/40 bg-emerald-50 dark:bg-zinc-950/80 text-[11px] sm:text-xs text-emerald-700 dark:text-emerald-400 uppercase font-black font-mono rounded-xl shadow-sm whitespace-nowrap"
          >
            Slide {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </motion.span>
        </div>
      </nav>

      {/* ── Slide Progress Bar ── */}
      <div className="h-1.5 bg-slate-200 dark:bg-zinc-900 relative z-20 overflow-hidden">
        <motion.div
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-sky-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]"
        />
      </div>

      {/* ── Main Big-Screen Slide Stage ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 lg:p-16 relative z-10 max-w-[1550px] mx-auto w-full">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center min-h-[60vh]"
          >
            {/* Left Column: Big-Bold Keynote Headline */}
            <div className="lg:col-span-5 space-y-6 text-left relative z-20">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 text-slate-600 dark:text-zinc-400 text-xs sm:text-sm font-mono tracking-widest font-black uppercase"
              >
                <motion.span animate={{ scale: [1, 1.6, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1.8 }} className="w-2.5 h-2.5 bg-emerald-500 rounded-full" />
                {slide.tag}
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black uppercase tracking-tight leading-[1.02] text-slate-900 dark:text-white"
              >
                {slide.title}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="text-base sm:text-lg md:text-xl text-slate-700 dark:text-zinc-300 leading-relaxed font-sans font-medium"
              >
                {slide.sub}
              </motion.p>

              {/* Technical Appendix toggler */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="pt-3">
                <Button
                  onClick={() => setShowAppendix(!showAppendix)}
                  variant="ghost"
                  className="p-0 h-auto text-xs uppercase text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 group tracking-widest font-black"
                >
                  <Info className="w-4 h-4 text-emerald-500" />
                  {showAppendix ? "Hide Technical Details" : "See Technical Architecture"}
                  <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showAppendix ? "rotate-180" : ""}`} />
                </Button>
              </motion.div>

              {/* Expandable Technical Appendix */}
              <AnimatePresence>
                {showAppendix && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 mt-3 border-l-4 border-emerald-500 bg-white/90 dark:bg-zinc-900/90 space-y-2 rounded-r-2xl shadow-lg">
                      <div className="text-xs uppercase tracking-widest text-emerald-700 dark:text-emerald-400 font-black">
                        Architecture Blueprint //
                      </div>
                      <ul className="space-y-2 text-xs sm:text-sm font-mono text-slate-800 dark:text-zinc-300">
                        {slide.technicalAppendix.map((line, i) => (
                          <li key={i} className="flex gap-2.5 items-start">
                            <span className="text-emerald-500 font-black shrink-0">{">"}</span> {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Column: Big-Card Interactive Content */}
            <div className="lg:col-span-7 relative z-20">
              {slide.content}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Bottom Presenter Controls ── */}
      <footer className="border-t-2 border-slate-200 dark:border-zinc-800 px-6 py-5 relative z-20 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="w-12 h-12 border-2 border-slate-300 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-900 rounded-2xl transition-all"
            title="Previous Slide (Left Arrow)"
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-12 h-12 border-2 border-slate-300 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-900 rounded-2xl transition-all"
            title={isPlaying ? "Pause Auto-play" : "Play Slideshow"}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5 text-emerald-500" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="w-12 h-12 border-2 border-slate-300 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-zinc-900 rounded-2xl transition-all"
            title="Next Slide (Right Arrow / Space)"
          >
            <ChevronRight className="w-6 h-6" />
          </Button>
        </div>

        {/* Slide Indicator Pills */}
        <div className="flex gap-2 overflow-x-auto max-w-[320px] sm:max-w-lg pb-1 md:pb-0 scrollbar-hide items-center">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setDirection(i > currentSlide ? 1 : -1);
                setCurrentSlide(i);
                setShowAppendix(false);
              }}
              className={`h-2 transition-all rounded-full ${i === currentSlide
                  ? "w-10 bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"
                  : "w-3 bg-slate-300 dark:bg-zinc-800 hover:bg-slate-400 dark:hover:bg-zinc-600"
                }`}
              title={`Jump to Slide ${i + 1}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          {currentSlide === slides.length - 1 ? (
            <Link href="/register">
              <Button
                onClick={() => setShowConfetti(true)}
                className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white text-xs uppercase tracking-widest font-black flex items-center gap-2 rounded-2xl shadow-xl shadow-emerald-950/40 transition-all"
              >
                Claim 4-Month Trial <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          ) : (
            <Button
              onClick={handleNext}
              className="h-12 px-8 bg-slate-900 text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-zinc-200 text-xs uppercase tracking-widest font-black flex items-center gap-2 rounded-2xl transition-all shadow-md"
            >
              Next Slide <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
