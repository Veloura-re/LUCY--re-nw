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
  UserCheck, Calendar, Palette, Settings, MessageSquare
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { 
  ScanLines, CustomCursor, AnimatedGrid, HexGrid, 
  GlitchOverlay, ParticleField, TiltCard, Reveal, GlitchText,
  Counter, MatrixRain, Typewriter
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

    const colors = ["#a1a1aa", "#d4d4d8", "#71717a", "#ffffff", "#52525b"];
    const particles: Array<{
      x: number; y: number; size: number; color: string;
      speedX: number; speedY: number; rotation: number; rotationSpeed: number;
    }> = [];

    for (let i = 0; i < 100; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * -height - 20,
        size: Math.random() * 6 + 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.random() * 4 - 2,
        speedY: Math.random() * 3 + 2,
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
        ctx.shadowBlur = 8;
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

// ─── Scramble Text Hook ────────────────────────────────────────────────────────
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*<>/\\[]{}";
function useScramble(target: string, trigger: any) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    let frame: ReturnType<typeof setInterval>;
    let step = 0;
    const totalSteps = target.length * 4;
    frame = setInterval(() => {
      step++;
      setDisplay(
        target.split("").map((char, i) => {
          if (char === " ") return " ";
          if (char === "\n") return "\n";
          const revealAt = (i / target.length) * totalSteps * 0.8;
          if (step > revealAt) return char;
          return CHARS[Math.floor(Math.random() * CHARS.length)];
        }).join("")
      );
      if (step >= totalSteps) clearInterval(frame);
    }, 20);
    return () => clearInterval(frame);
  }, [target, trigger]);
  return display;
}

// ─── Animated Stat Counter Component ──────────────────────────────────────────
function StatBlock({ label, value, prefix = "", suffix = "", delay = 0 }: { label: string; value: number; prefix?: string; suffix?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false }}
      transition={{ delay, duration: 0.5 }}
      className="text-center space-y-1"
    >
      <div className="text-3xl md:text-4xl font-bold text-white font-mono flex items-center justify-center">
        {prefix && <span>{prefix}</span>}
        <Counter from={0} to={value} suffix={suffix} duration={2} />
      </div>
      <div className="text-[9px] text-zinc-500 uppercase tracking-widest">{label}</div>
    </motion.div>
  );
}

// ─── Animated Feature Row ─────────────────────────────────────────────────────
function FeatureItem({ icon: Icon, title, desc, delay = 0 }: { icon: any; title: string; desc: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: false }}
      transition={{ delay, duration: 0.4 }}
      whileHover={{ x: 4, borderColor: "rgba(255,255,255,0.2)" }}
      className="flex gap-4 items-start p-5 border border-white/10 bg-zinc-950/50 transition-all duration-300 group cursor-default"
    >
      <Icon className="w-5 h-5 text-zinc-400 shrink-0 mt-0.5 group-hover:text-white transition-colors" />
      <div className="space-y-1">
        <div className="text-xs font-bold text-white uppercase tracking-tight">{title}</div>
        <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">{desc}</p>
      </div>
    </motion.div>
  );
}

// ─── Presentation Slides Config ──────────────────────────────────────────────
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
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [showAppendix, setShowAppendix] = useState(false);

  const slides: Slide[] = [
    // ──────────────────── SLIDE 01: THE FLYWHEEL ────────────────────
    {
      id: "flywheel",
      tag: "strategic_core // concept",
      title: "the lucy flywheel effect",
      sub: "technology as a revenue-generating, time-saving asset that creates a continuous loop of institutional improvement.",
      content: (
        <div className="space-y-6 w-full text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { num: "01", title: "operational efficiency", desc: "automated billing and grading free up massive amounts of administrative time and capital." },
              { num: "02", title: "educator empowerment", desc: "the saved time is reinvested into teachers, reducing burnout and drastically improving instructional quality." },
              { num: "03", title: "unmatched parent trust", desc: "better teaching combined with total digital transparency creates highly engaged, loyal parents." },
              { num: "04", title: "premium brand growth", desc: "high parent satisfaction justifies premium tuition rates and drives rapid new student enrollment." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="p-6 border border-white/10 bg-zinc-950/50 space-y-4"
              >
                <div className="text-2xl font-bold text-white/20 font-mono">{item.num}</div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">{item.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ),
      technicalAppendix: [
        "Traditional administration views tech as a cost center.",
        "LUCY shifts the paradigm: automation feeds directly into brand growth."
      ]
    },

    // ──────────────────── FINANCIAL & OPERATIONAL SUPERIORITY ────────────────────
    {
      id: "finance_01",
      tag: "financial // superiority",
      title: "instant financial reconciliation",
      sub: "never manually cross-reference a bank slip again. automated ledgers via telebirr, cbe birr, or stripe.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">By eliminating manual ledger entry, finance teams reclaim up to 40 hours a week. This allows institutions to reallocate headcount from data entry to strategic financial planning.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="hours_saved_weekly" value={40} suffix="h" delay={0.1} />
            <StatBlock label="ledger_accuracy" value={99.99} suffix="%" delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Cryptographic webhooks connected directly to national payment gateways.",
        "USSD push authorization confirms transaction in milliseconds without duplicate billing."
      ]
    },
    {
      id: "finance_02",
      tag: "financial // superiority",
      title: "elimination of paper & printing",
      sub: "transitioning to digital permission slips, assignments, and electronic records saves massive amounts of capital.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Mid-sized institutions historically spend thousands of dollars annually on physical supplies. Digitizing workflows boosts bottom-line profitability and positions the school as an ESG leader.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={FileText} title="digital documents" desc="visually stunning, legally compliant digital documents generated on the fly." delay={0.1} />
            <FeatureItem icon={Lock} title="cryptographic signatures" desc="secure hashes bind parent identity to consent forms." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Built-in PDF rendering engine.",
        "Digital signatures captured via mobile app using secure cryptographic hashes."
      ]
    },
    {
      id: "finance_03",
      tag: "financial // superiority",
      title: "real-time profit & loss tracking",
      sub: "log daily expenses against incoming tuition revenue for a live view of the school's financial health.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Principals no longer wait for end-of-month reports. Immediate visibility prevents overspending and allows agile, data-driven campus management.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Activity} title="live dashboard" desc="instant visual charts." delay={0.1} />
            <FeatureItem icon={Database} title="query engine" desc="aggregates thousands of micro-transactions." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Powered by a high-performance analytics query engine on PostgreSQL cluster.",
        "Aggregates micro-transactions instantly via React/Next.js frontend."
      ]
    },
    {
      id: "finance_04",
      tag: "financial // superiority",
      title: "eradication of lost revenue",
      sub: "automated sms and push notification fee reminders drastically increase on-time payments.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Consistent cash flow is the lifeblood of any private institution. Automating collections avoids awkward phone calls and increases on-time payments by up to 25%.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="payment_increase" value={25} suffix="%" delay={0.1} />
            <FeatureItem icon={Bell} title="push & sms" desc="localized reminders straight to parent devices." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Automated background cron jobs running on edge servers.",
        "Programmatically fires personalized, localized SMS and push notifications to parent devices."
      ]
    },

    // ──────────────────── EMPOWERING EDUCATORS ────────────────────
    {
      id: "edu_05",
      tag: "empowering // educators",
      title: "ai-assisted exam generation",
      sub: "built-in AI assistant automatically generates high-fidelity, curriculum-aligned exam questions.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Teacher burnout is the highest hidden cost in education. State-of-the-art AI tools improve retention rates, reduce hiring costs, and elevate instructional quality.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Cpu} title="LLM integration" desc="generates pedagogy-aligned questions." delay={0.1} />
            <FeatureItem icon={Shield} title="zero data retention" desc="strict privacy APIs." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Integrates directly with enterprise LLMs via zero-data-retention APIs.",
        "Pre-configured prompt engineering aligned with national standards, exportable to PDF."
      ]
    },
    {
      id: "edu_06",
      tag: "empowering // educators",
      title: "lightning-fast digital roll call",
      sub: "take attendance in seconds from any phone or laptop. instantly synced to central database.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Reclaiming just 10 minutes per class equates to hundreds of hours of recovered instructional time per year. Classes start faster; front office is never bottlenecked.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="time_recovered_daily" value={10} suffix="m" delay={0.1} />
            <FeatureItem icon={Zap} title="offline-first sync" desc="works even if school Wi-Fi drops." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Offline-first Progressive Web App architecture.",
        "Local cache stores data and background-syncs the moment connectivity is restored."
      ]
    },
    {
      id: "edu_07",
      tag: "empowering // educators",
      title: "automated grade computation",
      sub: "engine automatically calculates weighted averages, curves, and updates database in real-time.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Automating the underlying mathematics eliminates friction, removes human error, and empowers teachers to finalize class scores effortlessly.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={BarChart3} title="dynamic curves" desc="mathematical uniformity across classrooms." delay={0.1} />
            <FeatureItem icon={Settings} title="algorithm builder" desc="flexible grading weight formulas." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Grading engine utilizes a highly flexible algorithm builder.",
        "Administrators pre-define formulas globally (e.g., 30% Assessment, 70% Final)."
      ]
    },
    {
      id: "edu_08",
      tag: "empowering // educators",
      title: "tamper-proof academic integrity",
      sub: "strict row-level security and immutable audit logs prevent unauthorized tampering of grades.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Guaranteeing that grades cannot be maliciously altered builds immense trust with accreditation bodies and university admissions boards.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Shield} title="row-level security" desc="blocked unauthorized queries." delay={0.1} />
            <FeatureItem icon={TerminalIcon} title="audit logs" desc="immutable forensic tracking." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Implemented natively at the PostgreSQL database kernel with RLS.",
        "Every mutation triggers an immutable audit log storing User ID, Timestamp, Old/New Value."
      ]
    },

    // ──────────────────── UNMATCHED PARENT ENGAGEMENT ────────────────────
    {
      id: "parent_09",
      tag: "parent // engagement",
      title: "real-time academic transparency",
      sub: "proactive visibility into current grades, assignments, and attendance via parent portal.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Continuous feedback loops result in home-based encouragement, drastically improving school pass rates, student confidence, and prestige.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Eye} title="live visibility" desc="grades pushed with zero delay." delay={0.1} />
            <FeatureItem icon={Database} title="unified database" desc="instant synchronization." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Operates on a single unified database.",
        "WebSocket connections push live data directly to the Parent's mobile dashboard."
      ]
    },
    {
      id: "parent_10",
      tag: "parent // engagement",
      title: "centralized, secure communication",
      sub: "secure internal messaging replaces chaotic WhatsApp groups, protecting teacher privacy.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Protecting off-hours peace of staff is crucial. Centralizing communication ensures professional, logged, and moderated interactions.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={MessageSquare} title="secure chat" desc="end-to-end encrypted protocols." delay={0.1} />
            <FeatureItem icon={Clock} title="do not disturb" desc="automated muting for off-hours." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "End-to-end encrypted chat protocols.",
        "High-level oversight capabilities and 'Do Not Disturb' hours."
      ]
    },
    {
      id: "parent_11",
      tag: "parent // engagement",
      title: "instant absence alerts",
      sub: "automated push notifications immediately inform parents if a student is absent or late.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Student safety is the ultimate liability. Instant alerts provide peace of mind, cementing long-term institutional loyalty.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="delivery_speed" value={3} suffix="s" delay={0.1} />
            <FeatureItem icon={Bell} title="FCM & SMS" desc="bypasses standard processing queues." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "High-priority queue architecture.",
        "Executes Firebase Cloud Messaging (FCM) and SMS gateways within 3 seconds of input."
      ]
    },
    {
      id: "parent_12",
      tag: "parent // engagement",
      title: "secure digital authorizations",
      sub: "legally sign field trip slips, medical waivers, and transport agreements directly via mobile.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Digital authorizations achieve 100% compliance in a fraction of the time, reducing legal and operational friction.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Lock} title="binding signatures" desc="exact UTC timestamps and IP records." delay={0.1} />
            <StatBlock label="compliance_rate" value={100} suffix="%" delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Legally binding digital signature protocols.",
        "Records exact UTC timestamp, IP address, and authenticated user token immutably."
      ]
    },

    // ──────────────────── STUDENT AGENCY ────────────────────
    {
      id: "student_13",
      tag: "student // agency",
      title: "the gamified student hub",
      sub: "beautifully designed dashboard for tracking gpa, assignments, and educational trajectory.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Gamification shifts the burden of motivation. App-like interfaces raise internal accountability and school-wide performance.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Palette} title="consumer UI" desc="fluid, engaging react/framer motion apps." delay={0.1} />
            <FeatureItem icon={BarChart3} title="data visualizers" desc="interactive timeline and grade charts." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Student UI built using React/Framer Motion.",
        "Data visualizers render complex grade arrays into highly readable, interactive mobile charts."
      ]
    },
    {
      id: "student_14",
      tag: "student // agency",
      title: "dynamic digital timetables",
      sub: "live timetables update instantly if a room changes or a substitute teacher is assigned.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Hallway confusion is eliminated. An informed student body moves efficiently, optimizing every minute of the school day.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Calendar} title="relational graph" desc="mutations propagate instantly." delay={0.1} />
            <FeatureItem icon={Zap} title="zero refresh" desc="UI updates without page reloads." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Scheduling engine uses a relational graph matrix.",
        "Mutations propagate instantly across the network updating UI without page refreshes."
      ]
    },

    // ──────────────────── ULTIMATE ADMIN CONTROL ────────────────────
    {
      id: "admin_15",
      tag: "administrative // control",
      title: "one-click report cards",
      sub: "standardized transcripts generated for the entire school instantly.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Eliminates three days of administrative overtime, wipes out transcription errors, and delivers flawless documents to parents.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="generation_time" value={60} suffix="s" delay={0.1} />
            <FeatureItem icon={FileText} title="vectorized PDFs" desc="compiles thousands of data points." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Scalable headless browser architecture on the server side.",
        "Compiles thousands of data points into perfectly formatted PDFs in parallel under 60 seconds."
      ]
    },
    {
      id: "admin_16",
      tag: "administrative // control",
      title: "total hardware agnosticism",
      sub: "modern cloud application runs flawlessly on any device with an internet connection.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">No need for expensive IT departments or server rooms. Capital expenditure on infrastructure drops to zero.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="infrastructure_cost" value={0} prefix="$" delay={0.1} />
            <FeatureItem icon={Globe} title="global edge network" desc="responsive on any device." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Deployed as a serverless web application via Vercel's global edge network.",
        "Serves optimized code directly to user browser across PC, Mac, iOS, Android."
      ]
    },
    {
      id: "admin_17",
      tag: "administrative // control",
      title: "granular staff accountability",
      sub: "microscopic visibility into staff performance, grading speeds, and attendance compliance.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Management transitions from reactive to proactive, identifying bottlenecks early to intervene before parent satisfaction is impacted.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Activity} title="telemetry data" desc="tracking exact API request timestamps." delay={0.1} />
            <FeatureItem icon={BarChart3} title="KPI visualizer" desc="indisputable compliance metrics." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Backend telemetry aggregates exact timestamps for API requests (grading, attendance).",
        "Data feeds into an objective KPI visualizer for leadership dashboards."
      ]
    },
    {
      id: "admin_18",
      tag: "administrative // control",
      title: "zero data loss & backups",
      sub: "heavily encrypted and backed up in real-time to enterprise-grade cloud databases.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Guaranteeing absolute permanence of decades of records protects the school from catastrophic liability and natural disasters.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Database} title="continuous PITR" desc="point-in-time recovery." delay={0.1} />
            <FeatureItem icon={Lock} title="geographic distribution" desc="survives regional failures." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "PostgreSQL backend utilizes continuous Point-in-Time Recovery (PITR).",
        "Automated hourly snapshots distributed across multiple geographic availability zones."
      ]
    },
    {
      id: "admin_19",
      tag: "administrative // control",
      title: "conflict-free timetables",
      sub: "digital scheduling engine prevents double-booking teachers or assigning two classes to one room.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Eliminates weeks of trial and error, optimizes campus space, and guarantees balanced and fair teacher workloads.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Calendar} title="constraint algorithm" desc="evaluates capacity and availability." delay={0.1} />
            <FeatureItem icon={Zap} title="instant flagging" desc="identifies impossible configurations." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Schedule builder incorporates a constraint-satisfaction algorithm.",
        "Evaluates hard constraints simultaneously to suggest optimal academic week routing."
      ]
    },
    {
      id: "admin_20",
      tag: "administrative // control",
      title: "premium brand perception",
      sub: "a state-of-the-art digital ecosystem elevates the status of the entire institution.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-white/10 bg-zinc-950/50">
            <h3 className="text-sm font-bold text-white uppercase mb-2">strategic business impact</h3>
            <p className="text-xs text-zinc-400">Technology is a massive differentiator. It justifies premium tuition rates and drives enrollment by signaling modern, secure excellence.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Palette} title="premium UI/UX" desc="silicon valley design standards." delay={0.1} />
            <FeatureItem icon={Eye} title="institutional prestige" desc="subconscious reinforcement of trust." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "UI/UX built on premium design systems used by Silicon Valley tech giants.",
        "Smooth animations and crystal-clear typography subconsciously reinforce quality."
      ]
    }
  ];

  const handleNext = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
    setShowAppendix(false);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
    setShowAppendix(false);
  }, [slides.length]);

  // Key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNext, handlePrev]);

  // Auto-play loop
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(handleNext, 8500);
    return () => clearInterval(interval);
  }, [isPlaying, handleNext]);

  // Confetti timeout
  useEffect(() => {
    if (!showConfetti) return;
    const timeout = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timeout);
  }, [showConfetti]);

  const slide = slides[currentSlide];
  const scrambledTitle = useScramble(slide.title, currentSlide);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-mono lowercase tracking-tight select-none overflow-x-hidden overflow-y-auto relative">
      
      {/* ── Visual Overlays ── */}
      <ScanLines />
      <CustomCursor />
      <AnimatedGrid />
      <HexGrid />
      <GlitchOverlay />
      <ParticleField count={45} />
      <PresentationConfetti trigger={showConfetti} />

      {/* ── Navbar ── */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between relative z-10 bg-black/85 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo className="w-8 h-8" />
          <span className="font-bold text-lg tracking-tighter text-white">LUCY OS</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest hidden md:flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            use [arrow keys] to navigate
          </div>
          <motion.span
            animate={{ borderColor: ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="px-3 py-1 border bg-zinc-950/50 text-[10px] text-zinc-400 uppercase font-bold font-mono"
          >
            slide_{String(currentSlide + 1).padStart(2, "0")}/{String(slides.length).padStart(2, "0")}
          </motion.span>
        </div>
      </nav>

      {/* ── Slide Progress Bar ── */}
      <div className="h-px bg-zinc-900 relative z-10">
        <motion.div
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-white/20 via-white/40 to-white/20"
        />
      </div>

      {/* ── Slide Frame ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10 max-w-[1400px] mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 30, filter: "blur(4px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: -30, filter: "blur(4px)" }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[55vh]"
          >
            {/* Left Side: Header & Context */}
            <div className="lg:col-span-5 space-y-6 text-left relative z-20">
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center gap-3 text-zinc-500 text-[10px] font-mono tracking-widest"
              >
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-white/50 rounded-full" />
                {slide.tag}
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-white pb-3"
              >
                <GlitchText>{scrambledTitle}</GlitchText>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="text-sm text-zinc-400 leading-relaxed max-w-lg font-sans font-light"
              >
                {slide.sub}
              </motion.p>

              {/* Technical Appendix toggler */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="pt-4">
                <Button 
                  onClick={() => setShowAppendix(!showAppendix)}
                  variant="ghost" 
                  className="p-0 h-auto text-[10px] uppercase text-zinc-400 hover:text-white flex items-center gap-2 group tracking-widest font-bold"
                >
                  <Info className="w-3.5 h-3.5" />
                  {showAppendix ? "close_specifications" : "view_system_specifications"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showAppendix ? "rotate-180" : ""}`} />
                </Button>
              </motion.div>

              {/* Expandable Appendix */}
              <AnimatePresence>
                {showAppendix && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-zinc-950/80 border border-white/5 p-6 mt-4 space-y-3 font-mono text-[11px] text-zinc-400"
                  >
                    <div className="text-white/70 font-bold uppercase border-b border-white/5 pb-1">system_appendix // specifications</div>
                    {slide.technicalAppendix.map((spec, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.08 }}
                        className="flex items-start gap-2"
                      >
                        <span className="text-zinc-500 font-bold shrink-0">&gt;</span>
                        <span className="leading-relaxed font-sans font-light">{spec}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Side: Content Card */}
            <div className="lg:col-span-7 relative z-10">
              <TiltCard className="w-full">
                <div className="relative group transition-all duration-500">
                  {/* Glow border effect */}
                  <motion.div
                    animate={{ opacity: [0.05, 0.15, 0.05] }}
                    transition={{ repeat: Infinity, duration: 4 }}
                    className="absolute -inset-0.5 bg-gradient-to-r from-white/10 to-white/5 rounded-none blur"
                  />
                  
                  <div className="relative bg-zinc-950/40 backdrop-blur-md border border-white/10 rounded-none p-8 shadow-[0_15px_35px_rgba(0,0,0,0.8)] overflow-hidden min-h-[350px] flex flex-col justify-center">
                    {slide.content}
                  </div>
                </div>
              </TiltCard>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Slide Controls ── */}
      <footer className="border-t border-white/5 py-6 px-6 flex items-center justify-between relative z-10 bg-black/85 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-none hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-white/60" /> : <Play className="w-4 h-4 text-white" />}
          </Button>
          <span className="text-[10px] text-zinc-600 font-mono hidden sm:inline">
            {isPlaying ? "[loop_active]" : "[loop_paused]"}
          </span>
        </div>

        {/* 3D Hover Navigation */}
        <div className="flex items-center gap-2 hidden lg:flex">
          {slides.map((_, i) => (
            <div
              key={i}
              onMouseEnter={() => {
                setCurrentSlide(i);
                setShowAppendix(false);
                setIsPlaying(false); // Pause auto-play on manual hover navigation
              }}
              className="cursor-default"
            >
              <TiltCard className="w-8 h-12 xl:w-10 xl:h-14">
                <div 
                  className={`w-full h-full border flex flex-col justify-end p-1.5 transition-all duration-300 relative overflow-hidden group ${
                    i === currentSlide 
                      ? "border-white/50 bg-zinc-800" 
                      : "border-white/10 bg-zinc-950/50 hover:bg-zinc-900/60"
                  }`}
                >
                  <div className={`absolute top-0 left-0 right-0 h-px transition-all duration-300 ${i === currentSlide ? "bg-cyan-400" : "bg-transparent group-hover:bg-white/20"}`} />
                  <span className={`text-[9px] font-mono font-bold leading-none transition-colors duration-300 ${i === currentSlide ? "text-white" : "text-zinc-600 group-hover:text-zinc-400"}`}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
              </TiltCard>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-3">
          <motion.div whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={handlePrev} className="w-12 h-12 bg-zinc-900 border border-white/5 hover:border-white/15 text-white rounded-none flex items-center justify-center transition-all">
              <ChevronLeft className="w-5 h-5" />
            </Button>
          </motion.div>
          <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={handleNext} className="w-12 h-12 bg-zinc-900 border border-white/5 hover:border-white/15 text-white rounded-none flex items-center justify-center transition-all">
              <ChevronRight className="w-5 h-5" />
            </Button>
          </motion.div>
        </div>
      </footer>
    </div>
  );
}
