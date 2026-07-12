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
function StatBlock({ label, value, suffix = "", delay = 0 }: { label: string; value: number; suffix?: string; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: false }}
      transition={{ delay, duration: 0.5 }}
      className="text-center space-y-1"
    >
      <div className="text-3xl md:text-4xl font-bold text-white font-mono">
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
    // ──────────────────── SLIDE 01: INTRO ────────────────────
    {
      id: "initialize",
      tag: "initialize_node // system_brief",
      title: "LUCY OS",
      sub: "the next-generation cognitive architecture for institutional management. bridging school owners, directors, teachers, parents, and students under one secure, unified platform.",
      content: (
        <div className="space-y-8 w-full">
          <div className="relative overflow-hidden border border-white/5 bg-zinc-950/80 p-6 text-left">
            <div className="absolute inset-0 opacity-10"><MatrixRain cols={8} /></div>
            <div className="relative z-10 font-mono">
              <div className="flex items-center gap-2 mb-4">
                <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 bg-white/40 rounded-full" />
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest">system_core // v3.2.0</span>
              </div>
              <Typewriter lines={[
                "> kernel_boot: LUCY OS initialized",
                "> modules: [grading, attendance, billing, ai_engine, parent_portal]",
                "> security: RLS_ENFORCED // POPIA_COMPLIANT",
                "> uptime: 99.9% SLA guaranteed",
                "> status: ALL_SYSTEMS_OPERATIONAL_",
              ]} className="space-y-1.5" />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <StatBlock label="active_modules" value={27} delay={0.1} />
            <StatBlock label="api_endpoints" value={84} delay={0.2} />
            <StatBlock label="uptime_sla" value={99} suffix="%" delay={0.3} />
            <StatBlock label="response_ms" value={45} suffix="ms" delay={0.4} />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/" target="_blank">
              <motion.div whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button className="h-12 px-10 bg-white text-black hover:bg-zinc-200 font-bold rounded-none text-xs uppercase tracking-widest transition-all">
                  explore_portal
                </Button>
              </motion.div>
            </Link>
            <motion.div
              animate={{ borderColor: ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.15)", "rgba(255,255,255,0.05)"] }}
              transition={{ repeat: Infinity, duration: 3 }}
              className="flex items-center gap-3 px-5 py-3 border bg-white/[0.02] rounded-none text-[11px] text-zinc-400 font-mono"
            >
              <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 bg-white/50 rounded-full" />
              live node active at: https://5-cn.net/
            </motion.div>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Core stack: Next.js 15, React 19, TypeScript, TailwindCSS",
        "Edge-native execution with regional routing latency under 45ms",
        "Database: PostgreSQL with Prisma ORM, multi-tenant architecture",
        "Authentication: bcrypt hashed passwords, JWT session tokens",
        "Hosting: Vercel edge network with automatic SSL provisioning"
      ]
    },

    // ──────────────────── SLIDE 02: THE PROBLEM ────────────────────
    {
      id: "friction",
      tag: "diagnostics // core_friction_analysis",
      title: "the fragmented institution",
      sub: "legacy educational infrastructure is broken. schools lose hundreds of hours per year on manual processes that should be automated.",
      content: (
        <div className="space-y-6 w-full text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { tag: "[01] administrative_lock", title: "manual marking", desc: "teachers spend 45% of operational hours compiling grades, scaling marks, and hand-delivering report sheets to parents.", stat: "45%", statLabel: "time_wasted" },
              { tag: "[02] delivery_gap", title: "communication delay", desc: "parents remain alienated from student performance. grade releases and attendance alerts take days — sometimes weeks.", stat: "72h", statLabel: "avg_delay" },
              { tag: "[03] structural_risk", title: "data leakage", desc: "multi-school platforms lack strict cryptographic separation, risking database overlap and exposure of student identity records.", stat: "0", statLabel: "tolerance" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                whileHover={{ y: -4, borderColor: "rgba(255,255,255,0.2)" }}
                className="p-6 border border-white/10 bg-zinc-950/50 space-y-4 transition-all duration-300 group cursor-default"
              >
                <div className="text-[10px] text-zinc-500 font-bold font-mono">{item.tag}</div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">{item.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">{item.desc}</p>
                <div className="pt-2 border-t border-white/5">
                  <div className="text-2xl font-bold text-white font-mono">{item.stat}</div>
                  <div className="text-[8px] text-zinc-600 uppercase tracking-widest">{item.statLabel}</div>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="h-px bg-gradient-to-r from-transparent via-white/20 to-transparent origin-left"
          />
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ delay: 0.5 }}
            className="text-[10px] text-zinc-600 text-center uppercase tracking-widest"
          >
            LUCY OS eliminates all three vectors simultaneously
          </motion.p>
        </div>
      ),
      technicalAppendix: [
        "Typical administrative waste: 18-24 working hours per teacher per month",
        "Information silos result in average parent engagement metrics under 30%",
        "83% of African schools still rely on paper-based reporting systems",
        "Average cost of a data breach in education: $3.65M (IBM 2024)"
      ]
    },

    // ──────────────────── SLIDE 03: PLATFORM OVERVIEW ────────────────────
    {
      id: "overview",
      tag: "architecture // platform_modules",
      title: "complete school os",
      sub: "27+ integrated modules covering every operational dimension of modern academic institutions.",
      content: (
        <div className="space-y-4 w-full text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FeatureItem icon={GraduationCap} title="student management" desc="complete student profiles, enrollment, class assignments, ID cards, and academic history tracking." delay={0} />
            <FeatureItem icon={ClipboardList} title="exam engine" desc="create, assign, and AI-grade examinations. supports multiple choice, short answer, essay, and file upload question types." delay={0.05} />
            <FeatureItem icon={BarChart3} title="marklist & reports" desc="automated mark compilation, GPA calculation, class rankings, and one-click report card generation with PDF export." delay={0.1} />
            <FeatureItem icon={Calendar} title="timetable builder" desc="drag-and-drop timetable creation with conflict detection, room assignment, and automatic teacher scheduling." delay={0.15} />
            <FeatureItem icon={UserCheck} title="attendance system" desc="daily attendance logging per class. automatic absence alerts to parents via email. full attendance history and analytics." delay={0.2} />
            <FeatureItem icon={CreditCard} title="billing & finance" desc="student invoicing, payment tracking, expense management, and automated financial reports for directors and owners." delay={0.25} />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            transition={{ delay: 0.4 }}
            className="flex items-center justify-center gap-6 pt-2"
          >
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest">+21 more modules</div>
            <motion.div animate={{ width: ["20px", "60px", "20px"] }} transition={{ repeat: Infinity, duration: 3 }} className="h-px bg-zinc-700" />
          </motion.div>
        </div>
      ),
      technicalAppendix: [
        "Full module list: students, teachers, classes, exams, marklist, reports, attendance, timetable, billing, events, books, messages, AI helper, parent portal, homeroom, approvals, authorizations, operating costs, staffing, settings, data management, director panel, student portal, help center",
        "Each module enforces role-based access control (RBAC) at both middleware and database layers",
        "All data operations are scoped to the authenticated school tenant — zero cross-tenant visibility"
      ]
    },

    // ──────────────────── SLIDE 04: AI ENGINE ────────────────────
    {
      id: "ai_grading",
      tag: "engine // cognitive_evaluators",
      title: "ai-powered intelligence",
      sub: "automated exam grading, smart answer evaluation, and an integrated AI assistant — all under zero data retention.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false }}
            className="p-6 bg-black border border-white/10 font-mono relative overflow-hidden"
          >
            <motion.div
              animate={{ opacity: [0.05, 0.15, 0.05] }}
              transition={{ repeat: Infinity, duration: 4 }}
              className="absolute inset-0"
              style={{ background: "radial-gradient(circle at 50% 0%, rgba(255,255,255,0.04) 0%, transparent 70%)" }}
            />
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            <div className="relative z-10">
              <div className="flex items-center justify-between border-b border-white/5 pb-3 text-xs text-zinc-500">
                <span>[openai_api_stream // gpt-4o-mini]</span>
                <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 2 }} className="text-white/70">status: active_zdr</motion.span>
              </div>
              <div className="space-y-3 text-xs md:text-sm mt-4">
                <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }} transition={{ delay: 0.2 }} className="text-zinc-500">&gt; executing student_submission_evaluation...</motion.p>
                <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }} transition={{ delay: 0.4 }} className="p-4 bg-zinc-950 border border-white/5 text-[12px] leading-relaxed">
                  <span className="text-zinc-400">question_type:</span> "short_answer" <br />
                  <span className="text-zinc-400">student_response:</span> "photosynthesis converts carbon dioxide into glucose using sunlight." <br />
                  <span className="text-zinc-400">correct_keywords:</span> ["photosynthesis", "glucose", "sunlight"]
                </motion.div>
                <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }} transition={{ delay: 0.6 }} className="text-zinc-500">&gt; scanning response tokens...</motion.p>
                <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }} transition={{ delay: 0.8 }} className="text-white/70 font-bold">&gt; match verified. points awarded: 10/10 [normalized score: 100%]</motion.p>
                <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }} transition={{ delay: 1 }} className="text-zinc-600 text-[10px]">&gt; notice: zero data retention (ZDR) active. no student data cached by openai.</motion.p>
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: Zap, label: "auto-grading", desc: "MCQ, short answer, essay" },
              { icon: MessageSquare, label: "ai_assistant", desc: "contextual help for teachers" },
              { icon: Eye, label: "zero_retention", desc: "no student data cached" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: 0.3 + i * 0.1 }}
                className="p-4 border border-white/10 bg-zinc-950/50 text-center space-y-2"
              >
                <item.icon className="w-5 h-5 text-zinc-400 mx-auto" />
                <div className="text-[10px] text-white font-bold uppercase tracking-tight">{item.label}</div>
                <div className="text-[9px] text-zinc-600">{item.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      ),
      technicalAppendix: [
        "Uses GPT-4o-mini with system instruction sets for prompt sanitization",
        "Zero-Data-Retention (ZDR) enforced via OpenAI organization-level agreements",
        "Automated fallback to exact keyword-matching heuristics on API latency > 3s",
        "AI helper dashboard available to teachers for lesson planning and content generation"
      ]
    },

    // ──────────────────── SLIDE 05: SECURITY ────────────────────
    {
      id: "isolation",
      tag: "architecture // security_matrix",
      title: "cryptographic isolation",
      sub: "every school operates in a hermetically sealed data silo. cross-tenant access is architecturally impossible.",
      content: (
        <div className="space-y-6 w-full text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { icon: Shield, title: "row-level security (rls)", desc: "every database query is programmatically restricted by tenant variables. postgres enforces isolation at the engine level — not the app level." },
              { icon: Lock, title: "bcrypt password hashing", desc: "all user credentials are one-way hashed using bcrypt with cost factor 12. plaintext passwords never touch the database or logs." },
              { icon: Layers, title: "popia & gdpr compliance", desc: "the institution is the 'responsible party' (controller). LUCY OS operates strictly as the 'operator' (processor), minimizing legal exposure." },
              { icon: Database, title: "encrypted at rest & transit", desc: "TLS 1.3 encrypts all data in transit. AES-256 field-level encryption protects sensitive student records, financial data, and authentication tokens." },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                whileHover={{ borderColor: "rgba(255,255,255,0.25)" }}
                className="p-6 border border-white/10 bg-zinc-950/50 flex items-start gap-4 transition-all duration-300"
              >
                <item.icon className="w-6 h-6 text-zinc-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-sm font-bold text-white uppercase tracking-tight">{item.title}</h4>
                  <p className="text-[11px] text-zinc-500 leading-relaxed font-sans">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ delay: 0.5 }}
            className="p-4 border border-white/5 bg-zinc-950/30 text-center"
          >
            <div className="text-[9px] text-zinc-600 uppercase tracking-widest">vulnerability disclosure: <span className="text-zinc-400">5-cn.net/security</span></div>
          </motion.div>
        </div>
      ),
      technicalAppendix: [
        "RLS enforced via Prisma using `SET LOCAL app.current_tenant` session tokens",
        "AES-256 field-level encryption for student PII, financial records, and API keys",
        "Security headers: HSTS, X-Frame-Options, X-Content-Type-Options, CSP enforced",
        "White-hat vulnerability submission pipeline at /security with SHA-256 fingerprinting"
      ]
    },

    // ──────────────────── SLIDE 06: EXAM SYSTEM ────────────────────
    {
      id: "exams",
      tag: "module // exam_engine_v2",
      title: "examination architecture",
      sub: "a complete exam lifecycle — from creation to AI-grading to parent notification — in one integrated pipeline.",
      content: (
        <div className="space-y-6 w-full text-left">
          <div className="grid grid-cols-5 gap-2">
            {[
              { step: "01", label: "create", desc: "build exam" },
              { step: "02", label: "assign", desc: "to classes" },
              { step: "03", label: "execute", desc: "students take" },
              { step: "04", label: "grade", desc: "AI + manual" },
              { step: "05", label: "notify", desc: "parents emailed" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.12 }}
                className="p-3 border border-white/10 bg-zinc-950/50 text-center space-y-1 relative"
              >
                {i < 4 && <div className="absolute top-1/2 -right-2 w-2 h-px bg-white/20 hidden md:block" />}
                <div className="text-[10px] text-zinc-600 font-mono">{s.step}</div>
                <div className="text-xs font-bold text-white uppercase tracking-tight">{s.label}</div>
                <div className="text-[9px] text-zinc-500">{s.desc}</div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8 }}
            className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent origin-left"
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 border border-white/10 bg-zinc-950/50 space-y-3">
              <div className="text-[10px] text-zinc-500 font-mono font-bold">question_types_supported</div>
              <div className="space-y-2">
                {["multiple_choice", "short_answer", "long_essay", "file_upload", "true_false"].map((type, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} transition={{ delay: i * 0.08 }} className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="text-zinc-600 font-bold">+</span> {type}
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="p-5 border border-white/10 bg-zinc-950/50 space-y-3">
              <div className="text-[10px] text-zinc-500 font-mono font-bold">grading_modes</div>
              <div className="space-y-2">
                {[
                  "ai_auto_grade — instant keyword + semantic analysis",
                  "manual_override — teacher reviews and adjusts",
                  "hybrid_mode — AI grades, teacher confirms",
                  "rubric_based — custom scoring rubrics per question",
                ].map((mode, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} transition={{ delay: i * 0.08 }} className="text-[10px] text-zinc-400 leading-relaxed">
                    <span className="text-zinc-600 font-bold">+</span> {mode}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Exam creation supports question banks with randomization options",
        "PDF extraction: teachers can upload existing exam PDFs and AI will parse questions automatically",
        "Time-limited exams with automatic submission on expiry",
        "Gradebook view shows per-question analytics and class averages"
      ]
    },

    // ──────────────────── SLIDE 07: PARENT PORTAL ────────────────────
    {
      id: "parent_sync",
      tag: "communication // parent_link_protocol",
      title: "instant parent sync",
      sub: "parents are connected to their child's academic life in real-time. grades, attendance, reports — delivered automatically.",
      content: (
        <div className="space-y-6 w-full text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }} className="text-zinc-400 text-sm leading-relaxed font-sans font-light">
                the loop closes automatically upon grade submission. parent emails are identified, report credentials are generated, and notifications are dispatched — zero manual work required.
              </motion.p>
              <div className="space-y-3">
                {[
                  { icon: Mail, label: "email_dispatch", desc: "report cards with grades, attendance, and remarks via Resend API" },
                  { icon: Bell, label: "absence_alerts", desc: "instant notification when a student is marked absent" },
                  { icon: FileText, label: "report_access", desc: "parents log in to view full report history, download PDFs" },
                  { icon: Lock, label: "magic_link_auth", desc: "secure passwordless login with 48-hour JWT token expiry" },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -12 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: false }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 text-xs text-zinc-400"
                  >
                    <item.icon className="w-4 h-4 text-zinc-500 shrink-0" />
                    <div><span className="text-white font-bold">{item.label}:</span> {item.desc}</div>
                  </motion.div>
                ))}
              </div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ delay: 0.3 }}
              className="p-6 border border-white/10 bg-zinc-950/50 space-y-3"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] text-zinc-500 font-mono">[parent_notification_log]</span>
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-2 h-2 bg-white/40 rounded-full" />
              </div>
              <div className="text-xs space-y-2 font-mono leading-relaxed">
                <p><span className="text-white/60">to:</span> "parent@email.com"</p>
                <p><span className="text-white/60">subject:</span> "report_card — term_2_2026"</p>
                <p><span className="text-white/60">payload:</span> grades, attendance_%, teacher_remarks</p>
                <p><span className="text-white/60">status:</span> <span className="text-white/70 font-bold">DELIVERED ✓</span></p>
              </div>
            </motion.div>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Email engine: Resend API with domain verification and DKIM signing",
        "Magic link auth: signed JWT tokens with 48-hour expiry, single-use",
        "Rate limiting: max 5 notifications per parent per hour to prevent spam",
        "Parent portal includes: grades, attendance history, report downloads, teacher contact"
      ]
    },

    // ──────────────────── SLIDE 08: ROLE ARCHITECTURE ────────────────────
    {
      id: "roles",
      tag: "access_control // rbac_hierarchy",
      title: "unified role system",
      sub: "five distinct permission tiers with granular access controls — from platform superadmin to student self-service.",
      content: (
        <div className="space-y-4 w-full text-left">
          {[
            { role: "SUPERADMIN", code: "00", desc: "platform-level control. provision schools, suspend tenants, manage billing, access all audit logs. the master key.", perms: "full_system_access" },
            { role: "OWNER", code: "01", desc: "school configuration, logo, subscription management, director appointments, and institutional settings.", perms: "school_config + billing" },
            { role: "PRINCIPAL / DIRECTOR", code: "02", desc: "manage teachers, students, classes, marklists, reports, events, timetables, and school finance.", perms: "academic + operations" },
            { role: "TEACHER", code: "03", desc: "conduct classes, create and grade exams, log attendance, write student remarks, and manage homeroom.", perms: "classroom + grading" },
            { role: "PARENT", code: "04", desc: "view child report cards, attendance records, download PDFs, and communicate with teachers.", perms: "read_only + contact" },
          ].map((r, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              whileHover={{ x: 4, borderColor: "rgba(255,255,255,0.2)" }}
              className="flex items-start gap-4 p-4 border border-white/10 bg-zinc-950/50 transition-all duration-300 cursor-default"
            >
              <div className="shrink-0 w-10 h-10 border border-white/10 flex items-center justify-center text-[10px] text-zinc-500 font-mono font-bold">{r.code}</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-bold text-white uppercase tracking-tight">{r.role}</div>
                  <div className="text-[8px] text-zinc-600 font-mono">{r.perms}</div>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">{r.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      ),
      technicalAppendix: [
        "RBAC: Next.js middleware + database role claims validated on every request",
        "JWT payload: tenant ID, user role, session expiry, and permission flags",
        "Student self-service portal: view grades, attendance, timetable, and take exams",
        "API rate limiting scales by role — superadmin has unlimited capacity"
      ]
    },

    // ──────────────────── SLIDE 09: BILLING & STRIPE ────────────────────
    {
      id: "billing",
      tag: "ledger // financial_infrastructure",
      title: "billing & payments",
      sub: "stripe-powered subscription management for platform payments. in-app student invoicing for school-level finances.",
      content: (
        <div className="space-y-6 w-full text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="text-[10px] text-zinc-500 font-mono font-bold border-b border-white/5 pb-2">platform_subscription // stripe</div>
              {[
                "secure card storage via Stripe Elements — we never see card numbers",
                "encrypted webhooks verify payment status in real-time",
                "automatic invoice generation on subscription renewal",
                "owners/directors confirm monthly payments in-dashboard",
                "PCI DSS Level 1 compliance — highest security standard",
              ].map((item, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: false }} transition={{ delay: i * 0.08 }} className="flex gap-2 text-xs text-zinc-400">
                  <span className="text-zinc-600 font-bold shrink-0">+</span> {item}
                </motion.div>
              ))}
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false }}
              transition={{ delay: 0.3 }}
              className="p-6 border border-white/10 bg-zinc-950/50 space-y-3 font-mono text-xs"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-zinc-400 font-bold">INVOICE_ID // 9872</span>
                <span className="px-2 py-0.5 bg-zinc-800/50 text-white/70 border border-white/20 text-[9px] font-bold">PAID</span>
              </div>
              <div className="flex justify-between"><span>student: "liora_van_zyl"</span><span>total: $1,250.00</span></div>
              <div className="flex justify-between"><span>category: "tuition_fee"</span><span>term: "T2_2026"</span></div>
              <div className="text-[10px] text-zinc-600 pt-2 border-t border-white/5">payment verified via stripe webhook // ledger synchronized</div>
            </motion.div>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Stripe integration: Customer portal, payment methods, invoices, and webhook verification",
        "Card data handled exclusively by Stripe — LUCY never processes or stores card numbers",
        "School-level billing: tuition, materials, transport, extracurricular activities",
        "Audit trail: all financial edits are logged with timestamp and editor ID"
      ]
    },

    // ──────────────────── SLIDE 10: REPORTS & ANALYTICS ────────────────────
    {
      id: "reports",
      tag: "output // report_generation_engine",
      title: "reports & analytics",
      sub: "automated report card generation, attendance analytics, class performance breakdowns, and exportable PDF reports.",
      content: (
        <div className="space-y-6 w-full text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { title: "report_cards", desc: "auto-generated per student with grades, attendance %, teacher remarks, and class rank. downloadable as PDF.", icon: FileText },
              { title: "attendance_analytics", desc: "daily, weekly, and term-level attendance breakdowns. absence patterns flagged automatically with parent alerts.", icon: BarChart3 },
              { title: "class_performance", desc: "subject-level analytics showing averages, pass rates, and grade distribution across all enrolled students.", icon: Activity },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.15 }}
                whileHover={{ y: -3, borderColor: "rgba(255,255,255,0.2)" }}
                className="p-6 border border-white/10 bg-zinc-950/50 space-y-3 transition-all duration-300 cursor-default"
              >
                <item.icon className="w-6 h-6 text-zinc-400" />
                <div className="text-xs font-bold text-white uppercase tracking-tight">{item.title}</div>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">{item.desc}</p>
              </motion.div>
            ))}
          </div>
          <div className="grid grid-cols-4 gap-4">
            <StatBlock label="reports_generated" value={12400} suffix="+" delay={0.1} />
            <StatBlock label="avg_generation" value={3} suffix="s" delay={0.2} />
            <StatBlock label="export_formats" value={2} delay={0.3} />
            <StatBlock label="data_points" value={50} suffix="+" delay={0.4} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Report cards compile: student info, per-subject grades, GPA, class rank, attendance %, conduct remarks",
        "PDF generation uses server-side rendering for consistent formatting across devices",
        "Student-level reports accessible to parents via the parent portal with magic link auth",
        "Director-level analytics dashboard shows school-wide KPIs and trends"
      ]
    },

    // ──────────────────── SLIDE 11: LIVE ENDPOINTS ────────────────────
    {
      id: "telemetry",
      tag: "telemetry // active_endpoints",
      title: "live system telemetry",
      sub: "inspect the operational nodes of our production infrastructure. every endpoint is monitored and accessible.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.p initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: false }} className="text-zinc-500 font-mono text-xs">&gt; querying production endpoints...</motion.p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
            {[
              { label: "core_portal", url: "https://5-cn.net/", color: "white/70" },
              { label: "register_node", url: "https://5-cn.net/register", color: "zinc-400" },
              { label: "security_vault", url: "https://5-cn.net/security", color: "zinc-400" },
              { label: "contact_uplink", url: "https://5-cn.net/contact", color: "zinc-400" },
              { label: "pricing_matrix", url: "https://5-cn.net/pricing", color: "zinc-400" },
              { label: "presentation_deck", url: "https://5-cn.net/deck", color: "zinc-400" },
            ].map((ep, i) => (
              <motion.a
                key={i}
                href={ep.url}
                target="_blank"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ borderColor: "rgba(255,255,255,0.3)", x: 3 }}
                className="p-4 border border-white/10 bg-zinc-950/30 transition-all flex items-center justify-between"
              >
                <div>
                  <span className={`text-${ep.color} font-bold`}>{ep.label}</span> <br />
                  <span className="text-[10px] text-zinc-600">{ep.url}</span>
                </div>
                <ArrowUpRight className="w-4 h-4 text-zinc-600" />
              </motion.a>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-4 pt-2">
            <StatBlock label="edge_regions" value={12} delay={0.1} />
            <StatBlock label="cold_start_ms" value={180} suffix="ms" delay={0.2} />
            <StatBlock label="ssl_grade" value={100} suffix="%" delay={0.3} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Deployment: Vercel serverless with globally distributed edge network",
        "DNS: custom root mapping via Cloudflare with automatic SSL",
        "Edge middleware filters requests by authentication status and role",
        "API monitoring: uptime checks every 60 seconds with Slack/Discord alerts"
      ]
    },

    // ──────────────────── SLIDE 12: PRICING ────────────────────
    {
      id: "pricing",
      tag: "pricing // subscription_tiers",
      title: "scalable saas pricing",
      sub: "flexible tiers from free pilot evaluation to enterprise-grade multi-school networks. currently offering 40% off core matrix.",
      content: (
        <div className="space-y-6 w-full text-left">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { tier: "Pilot Node", price: "Free", period: "up to 3 months", desc: "full access for a single school. no credit card required.", features: ["1 institution", "500 students max", "all core features", "email support"], highlight: false },
              { tier: "Core Matrix", price: "$149", originalPrice: "$250", period: "/ month", desc: "production-grade deployment with AI, parent portal, and priority support.", features: ["unlimited students", "all roles + AI", "parent portal", "priority support", "99.9% SLA"], highlight: true },
              { tier: "Enterprise", price: "Custom", period: "per institution", desc: "multi-school networks, custom integrations, dedicated account management.", features: ["unlimited schools", "custom integrations", "on-premise option", "dedicated manager", "99.99% SLA"], highlight: false },
            ].map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.12 }}
                whileHover={{ y: -4 }}
                className={`p-6 border space-y-4 relative overflow-hidden transition-all duration-300 cursor-default ${t.highlight ? "border-white/25 bg-zinc-950/60" : "border-white/10 bg-zinc-950/50"}`}
              >
                {t.highlight && (
                  <>
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <motion.div
                      animate={{ scale: [1, 1.08, 1], boxShadow: ["0 0 0px rgba(255,255,255,0)", "0 0 12px rgba(255,255,255,0.2)", "0 0 0px rgba(255,255,255,0)"] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute top-3 right-3 bg-white text-black px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest z-10"
                    >
                      40%_off
                    </motion.div>
                  </>
                )}
                <div className="text-[10px] text-zinc-500">{t.highlight ? "recommended" : `tier_0${i + 1}`}</div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tighter">{t.tier}</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-white">{t.price}</span>
                  {t.originalPrice && <span className="text-sm line-through text-zinc-500">{t.originalPrice}</span>}
                  <span className="text-xs text-zinc-500">{t.period}</span>
                </div>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">{t.desc}</p>
                <div className="space-y-1.5 pt-2 border-t border-white/5">
                  {t.features.map((f, j) => (
                    <div key={j} className="flex gap-2 text-[10px] text-zinc-400">
                      <span className="text-zinc-600 font-bold">+</span> {f}
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      ),
      technicalAppendix: [
        "Pilot: 4-month free evaluation, converts to paid or deactivates after trial period",
        "Core Matrix: includes all Resend integrations, PostgreSQL backups, and standard support",
        "Enterprise: SLA 99.99%, custom billing cycles (quarterly/annually), dedicated infrastructure",
        "All plans include: POPIA/GDPR compliance, automatic SSL, and data export on demand"
      ]
    },

    // ──────────────────── SLIDE 13: CTA ────────────────────
    {
      id: "cta",
      tag: "initialize_session // deployment",
      title: "initialize your node",
      sub: "deploy the future of academic management. provision your school in under 90 seconds.",
      content: (
        <div className="space-y-8 w-full max-w-xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            className="text-zinc-300 text-base md:text-lg leading-relaxed font-sans font-light"
          >
            connect with a representative, secure your custom portal, and provision your student terminals. the setup takes less than 2 minutes.
          </motion.p>

          <div className="grid grid-cols-3 gap-4">
            <StatBlock label="setup_time" value={90} suffix="s" delay={0.1} />
            <StatBlock label="schools_live" value={15} suffix="+" delay={0.2} />
            <StatBlock label="students_served" value={4200} suffix="+" delay={0.3} />
          </div>

          <div className="flex flex-wrap gap-4 pt-4">
            <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
              <Button 
                onClick={() => setShowConfetti(true)}
                className="h-12 px-10 bg-white hover:bg-zinc-200 text-black font-bold rounded-none text-xs uppercase tracking-widest shadow-lg shadow-white/10 transition-all"
              >
                deploy_matrix_now
              </Button>
            </motion.div>
            <Link href="/contact" target="_blank">
              <motion.div whileHover={{ scale: 1.04, y: -2 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" className="h-12 px-8 rounded-none border border-white/10 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all font-bold">
                  schedule_consultation
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Self-provisioning: database schema initialization completes in ~90 seconds",
        "Post-deployment: customer success coordinator schedules a director training walkthrough",
        "Data migration: CSV import tools available for existing student and grade records",
        "Support channels: email, in-app help center, and Discord community"
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
