"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Keyboard, Play, Pause, 
  Cpu, Shield, Terminal as TerminalIcon, Layers,
  ChevronDown 
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";

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

    const colors = ["#10b981", "#00f0ff", "#6366f1", "#f59e0b", "#ec4899"];
    const particles: Array<{
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
    }> = [];

    for (let i = 0; i < 80; i++) {
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

        if (p.y < height) {
          active = true;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        ctx.restore();
      });

      if (active) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [trigger]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-[50] w-full h-full" />;
}

// ─── Presentation Slides Config ──────────────────────────────────────────────
interface Slide {
  id: string;
  tag: string;
  title: string;
  sub: string;
  layout: "split" | "grid3" | "list" | "terminal" | "cards";
  content: React.ReactNode;
}

export default function PresentationDeck() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const slides: Slide[] = [
    {
      id: "initialize",
      tag: "initialize_node",
      title: "LUCY ACADEMIA",
      sub: "modular cognitive architecture for institutional synthesis.",
      layout: "split",
      content: (
        <div className="space-y-8">
          <p className="text-lg md:text-xl text-zinc-400 leading-relaxed font-sans font-light">
            the next-generation operating system for modern academic coordination. bridging school owners, directors, faculty, parents, and students under a secure, unified cryptographic ledger.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <Link href="/" target="_blank">
              <Button className="h-12 px-8 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest transition-all">
                explore_portal
              </Button>
            </Link>
            <div className="flex items-center gap-3 px-4 py-2 border border-white/5 bg-white/[0.01] rounded-xl text-[10px] text-zinc-500 font-mono">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              live node active at: https://5-cn.net/
            </div>
          </div>
        </div>
      )
    },
    {
      id: "friction",
      tag: "diagnostics // core_friction",
      title: "the fragmented institution",
      sub: "legacy educational infrastructure is broken.",
      layout: "grid3",
      content: (
        <>
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
            <div className="text-[10px] text-emerald-400 font-bold">[01] administrative lock</div>
            <h3 className="text-lg font-bold text-white uppercase">manual marking</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              administrators and faculty spend upwards of 45% of operational hours compiling grades, scaling marks, and mailing report sheets.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
            <div className="text-[10px] text-indigo-400 font-bold">[02] delivery gap</div>
            <h3 className="text-lg font-bold text-white uppercase">communication delay</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              parents remain alienated from student classroom performance. grade releases and attendance notifications take days to coordinate.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
            <div className="text-[10px] text-pink-400 font-bold">[03] structural risk</div>
            <h3 className="text-lg font-bold text-white uppercase">data leakage</h3>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              multi-school platforms lack strict cryptographic separation, risking database overlap and exposure of student identity records.
            </p>
          </div>
        </>
      )
    },
    {
      id: "isolation",
      tag: "architecture // data_isolation",
      title: "cryptographic isolation",
      sub: "row-level security enforces absolute data privacy.",
      layout: "split",
      content: (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex items-start gap-4">
            <Shield className="w-8 h-8 text-emerald-400 shrink-0 mt-1" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white uppercase">postgresql row-level security (rls)</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                every query executed by the database layer is programmatically restricted by tenant variables. cross-tenant database access is architecturally impossible.
              </p>
            </div>
          </div>
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] flex items-start gap-4">
            <Layers className="w-8 h-8 text-cyan-400 shrink-0 mt-1" />
            <div className="space-y-2">
              <h4 className="text-sm font-bold text-white uppercase">popia & gdpr operator compliance</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                defines the institution as the 'responsible party' (controller) and lucy_os strictly as the 'operator' (processor), minimizing platform exposure.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "ai_grading",
      tag: "engine // cognitive_evaluators",
      title: "ai-assisted auto-grading",
      sub: "evaluating student responses under zero data retention guidelines.",
      layout: "terminal",
      content: (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[10px] text-zinc-500">
            <span>[openai_api_stream]</span>
            <span className="text-emerald-400">status: active_zdr</span>
          </div>
          <div className="space-y-2 text-xs md:text-sm">
            <p className="text-zinc-600">&gt; executing student_submission_evaluation...</p>
            <div className="p-3 bg-zinc-900/40 rounded-lg border border-white/5 text-[11px]">
              <span className="text-indigo-400">question_type:</span> "short_answer" <br />
              <span className="text-indigo-400">student_response:</span> "photosynthesis converts carbon dioxide into glucose using sunlight." <br />
              <span className="text-indigo-400">correct_keywords:</span> ["photosynthesis", "glucose", "sunlight"]
            </div>
            <p className="text-zinc-600">&gt; scanning response tokens...</p>
            <p className="text-emerald-400 font-bold">&gt; match verified. points awarded: 10/10 [normalized score: 100%]</p>
            <p className="text-zinc-500 text-[10px]">&gt; notice: privacy prompt sanitized. zero data cached by openai.</p>
          </div>
        </div>
      )
    },
    {
      id: "parent_sync",
      tag: "communication // parent_link",
      title: "instant parent synchronization",
      sub: "connecting families to student progress automatically.",
      layout: "split",
      content: (
        <div className="space-y-6">
          <p className="text-zinc-400 text-sm leading-relaxed font-sans">
            the loop is closed immediately upon grade submission. the platform identifies linked parent emails and fires report credentials.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
              <div className="text-emerald-400 text-[10px] font-bold mb-1">⚡ real-time email dispatch</div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                powered by resend mail api. parents receive report cards containing attendance metrics, exact grades, and teacher remarks.
              </p>
            </div>
            <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01]">
              <div className="text-indigo-400 text-[10px] font-bold mb-1">🔒 verification verification</div>
              <p className="text-[10px] text-zinc-500 leading-relaxed font-sans">
                direct magic links allow parents to log in securely without managing complex password arrays.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "command_center",
      tag: "console // superadmin_dashboard",
      title: "institutional command center",
      sub: "superadmins control the entire educational node landscape.",
      layout: "split",
      content: (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
            <div className="flex items-center gap-3">
              <Cpu className="w-5 h-5 text-emerald-400" />
              <h4 className="text-sm font-bold text-white uppercase">school registry manager</h4>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              superadmins can instantly provision, suspend, or delete entire school environments, regulating platform subscription states dynamically.
            </p>
          </div>
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h4 className="text-sm font-bold text-white uppercase">integrated audit ledgers</h4>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">
              central logs capture wants-access enrollment requests and security vulnerability reports directly within a single operational console.
            </p>
          </div>
        </div>
      )
    },
    {
      id: "wants_access",
      tag: "intake // wants_access_database",
      title: "the wants-access ledger",
      sub: "managing inbound coordinate registrations securely.",
      layout: "split",
      content: (
        <div className="space-y-6">
          <p className="text-zinc-400 text-sm leading-relaxed font-sans">
            onboarding requests submitted via the contact system bypass external email boxes and log directly into the database.
          </p>
          <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] space-y-3">
            <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between">
              <span>[incoming_transmissions]</span>
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>
            <div className="text-xs space-y-1.5 font-mono">
              <p><span className="text-emerald-400">callsign:</span> "vanguard_academy"</p>
              <p><span className="text-emerald-400">comm_link:</span> "director@vanguard.edu"</p>
              <p><span className="text-emerald-400">payload:</span> "initialize pilot node for 800 student terminals."</p>
            </div>
            <div className="pt-2">
              <span className="inline-block px-3 py-1 border border-emerald-500/20 bg-emerald-950/20 text-[9px] text-emerald-400 uppercase font-bold rounded-lg">
                ready to authorize →
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      id: "security_vault",
      tag: "vault // security_reports",
      title: "vulnerability vault",
      sub: "securing the ecosystem with zero-day disclosures.",
      layout: "split",
      content: (
        <div className="space-y-6">
          <p className="text-zinc-400 text-sm leading-relaxed font-sans">
            a dedicated submission route (/security) allows white-hat penetration testers to safely submit vulnerability disclosures directly to superadmins.
          </p>
          <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] space-y-2 font-mono text-xs">
            <div className="text-pink-400 font-bold">[security_report_received]</div>
            <p className="text-zinc-500">category: "authentication_bypass_attempt"</p>
            <p className="text-zinc-500">severity: "CRITICAL"</p>
            <p className="text-zinc-500">hash: "sha256_bf9a7244dc..."</p>
            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden relative mt-3">
              <div className="absolute left-0 top-0 h-full w-[80%] bg-pink-500" />
            </div>
            <p className="text-[9px] text-zinc-600 mt-1">status: mitigated // patch deployed</p>
          </div>
        </div>
      )
    },
    {
      id: "roles",
      tag: "access_control // rbac_mapping",
      title: "unified role hierarchy",
      sub: "granular permission layers protect the institutional matrix.",
      layout: "cards",
      content: (
        <>
          <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
            <div className="text-[10px] text-zinc-500 font-bold">01 // OWNER</div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">manage school configuration, logo, and core matrix parameters.</p>
          </div>
          <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
            <div className="text-[10px] text-zinc-500 font-bold">02 // PRINCIPAL</div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">access grading sheets, manage student roster, and regulate billing.</p>
          </div>
          <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
            <div className="text-[10px] text-zinc-500 font-bold">03 // TEACHER</div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">conduct classes, build exams, log student attendance, and assign marks.</p>
          </div>
          <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] space-y-2">
            <div className="text-[10px] text-zinc-500 font-bold">04 // PARENT</div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">view child report cards, check live attendance logs, and contact teachers.</p>
          </div>
        </>
      )
    },
    {
      id: "billing",
      tag: "ledger // school_finance",
      title: "automated billing matrix",
      sub: "invoice tracking, expense management, and status updates.",
      layout: "split",
      content: (
        <div className="space-y-6">
          <p className="text-zinc-400 text-sm leading-relaxed font-sans">
            financial layers are built directly into the student registry, allowing directors to invoice parents automatically based on class tiers.
          </p>
          <div className="p-5 rounded-2xl border border-white/5 bg-white/[0.01] space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-zinc-400">INVOICE_ID // 9872</span>
              <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded">PAID</span>
            </div>
            <div className="flex justify-between">
              <span>student: "liora_van_zyl"</span>
              <span>total: $1,250.00</span>
            </div>
            <div className="text-[10px] text-zinc-600">payment verified via webhook // ledger synchronized</div>
          </div>
        </div>
      )
    },
    {
      id: "telemetry",
      tag: "telemetry // active_endpoints",
      title: "live system telemetry",
      sub: "inspect the operational live nodes of our production environment.",
      layout: "terminal",
      content: (
        <div className="space-y-4 font-mono text-xs md:text-sm">
          <p className="text-zinc-500">&gt; querying system endpoints...</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <a href="https://5-cn.net" target="_blank" className="p-3 border border-white/5 bg-white/[0.01] rounded-lg hover:border-emerald-500/30 transition-all">
              <span className="text-emerald-400">core_portal</span> <br />
              <span className="text-[10px] text-zinc-600">https://5-cn.net/</span>
            </a>
            <a href="https://5-cn.net/register" target="_blank" className="p-3 border border-white/5 bg-white/[0.01] rounded-lg hover:border-indigo-500/30 transition-all">
              <span className="text-indigo-400">register_node</span> <br />
              <span className="text-[10px] text-zinc-600">https://5-cn.net/register</span>
            </a>
            <a href="https://5-cn.net/security" target="_blank" className="p-3 border border-white/5 bg-white/[0.01] rounded-lg hover:border-pink-500/30 transition-all">
              <span className="text-pink-400">security_vault</span> <br />
              <span className="text-[10px] text-zinc-600">https://5-cn.net/security</span>
            </a>
            <a href="https://5-cn.net/contact" target="_blank" className="p-3 border border-white/5 bg-white/[0.01] rounded-lg hover:border-cyan-400/30 transition-all">
              <span className="text-cyan-400">wants_access_contact</span> <br />
              <span className="text-[10px] text-zinc-600">https://5-cn.net/contact</span>
            </a>
          </div>
        </div>
      )
    },
    {
      id: "pricing",
      tag: "pricing // subscription_tiers",
      title: "scalable saas economics",
      sub: "flexible tiers for individual nodes up to enterprise networks.",
      layout: "cards",
      content: (
        <>
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
            <div className="text-[10px] text-zinc-500">tier_01</div>
            <h3 className="text-lg font-bold text-white uppercase">pilot node</h3>
            <p className="text-2xl font-bold text-zinc-400">free</p>
            <p className="text-xs text-zinc-600 leading-relaxed font-sans">3-month evaluation environment for test schools.</p>
          </div>
          <div className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-950/5 space-y-4 relative">
            <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-600 text-white text-[8px] font-bold uppercase rounded-bl-xl font-mono">recommended</div>
            <div className="text-[10px] text-emerald-400">tier_02</div>
            <h3 className="text-lg font-bold text-white uppercase">core matrix</h3>
            <p className="text-2xl font-bold text-emerald-400">$250<span className="text-xs text-zinc-500">/mo</span></p>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">full administrative, grading, and parent portal infrastructure.</p>
          </div>
          <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.01] space-y-4">
            <div className="text-[10px] text-zinc-500">tier_03</div>
            <h3 className="text-lg font-bold text-white uppercase">enterprise</h3>
            <p className="text-2xl font-bold text-zinc-400">custom</p>
            <p className="text-xs text-zinc-600 leading-relaxed font-sans">dedicated server, custom api plugins, and multi-school networking.</p>
          </div>
        </>
      )
    },
    {
      id: "cta",
      tag: "initialize_session // deployment",
      title: "initialize your node",
      sub: "deploy the future of academic management today.",
      layout: "split",
      content: (
        <div className="space-y-8">
          <p className="text-zinc-400 text-base leading-relaxed font-sans">
            connect with a vanguard representative, secure your custom portal, and provision your student terminals.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button 
              onClick={() => setShowConfetti(true)}
              className="h-12 px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs uppercase tracking-widest shadow-lg shadow-emerald-950/20 transition-all"
            >
              deploy_matrix_now
            </Button>
            <Link href="/contact" target="_blank">
              <Button variant="outline" className="h-12 px-8 rounded-xl border-white/10 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all font-bold">
                schedule_consultation
              </Button>
            </Link>
          </div>
        </div>
      )
    }
  ];

  const handleNext = useCallback(() => {
    setCurrentSlide(prev => (prev + 1) % slides.length);
  }, [slides.length]);

  const handlePrev = useCallback(() => {
    setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length);
  }, [slides.length]);

  // Key navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Space") {
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
    const interval = setInterval(handleNext, 8000);
    return () => clearInterval(interval);
  }, [isPlaying, handleNext]);

  // Confetti timeout resets
  useEffect(() => {
    if (!showConfetti) return;
    const timeout = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timeout);
  }, [showConfetti]);

  const slide = slides[currentSlide];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-mono lowercase tracking-tight select-none overflow-hidden relative">
      <PresentationConfetti trigger={showConfetti} />
      
      {/* ── Background Grid ── */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808005_1px,transparent_1px),linear-gradient(to_bottom,#80808005_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* ── Navbar ── */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between relative z-10 bg-black/50 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo className="w-8 h-8" />
          <span className="font-bold text-lg tracking-tighter text-white">lucy_academia</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest hidden md:flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            use [arrow keys] to navigate
          </div>
          <span className="px-3 py-1 border border-cyan-500/20 bg-cyan-950/20 text-[10px] text-cyan-400 uppercase font-bold rounded-lg font-mono">
            slide_{String(currentSlide + 1).padStart(2, "0")}/{String(slides.length).padStart(2, "0")}
          </span>
        </div>
      </nav>

      {/* ── Slide Frame ── */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 relative z-10 max-w-[1400px] mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide.id}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[50vh]"
          >
            {/* Left Side: Header & Context */}
            <div className="lg:col-span-6 space-y-6 text-left">
              <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-mono tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                {slide.tag}
              </div>
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-white">
                {slide.title}
              </h1>
              <p className="text-xs md:text-sm text-zinc-500 leading-relaxed max-w-lg font-sans">
                {slide.sub}
              </p>
            </div>

            {/* Right Side: Render Dynamic Layout */}
            <div className="lg:col-span-6">
              {slide.layout === "split" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {slide.content}
                </motion.div>
              )}

              {slide.layout === "grid3" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4 text-left">
                  {slide.content}
                </div>
              )}

              {slide.layout === "cards" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                  {slide.content}
                </div>
              )}

              {slide.layout === "terminal" && (
                <div className="p-5 bg-zinc-950 border border-white/10 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] font-mono text-left relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-indigo-500" />
                  {slide.content}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Slide Controls ── */}
      <footer className="border-t border-white/5 py-6 px-6 flex items-center justify-between relative z-10 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-xl hover:bg-white/5 text-zinc-500 hover:text-white transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4 text-emerald-400" /> : <Play className="w-4 h-4 text-white" />}
          </Button>
          <span className="text-[10px] text-zinc-600 font-mono hidden sm:inline">
            {isPlaying ? "[loop_active]" : "[loop_paused]"}
          </span>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handlePrev}
            className="w-12 h-12 bg-zinc-900 border border-white/5 hover:border-white/10 text-white rounded-xl flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleNext}
            className="w-12 h-12 bg-zinc-900 border border-white/5 hover:border-white/10 text-white rounded-xl flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="text-[9px] text-zinc-700 hidden md:block">
          lucy_system_architecture // pptx_override
        </div>
      </footer>
    </div>
  );
}
