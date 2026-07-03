"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, ChevronRight, Keyboard, Play, Pause, 
  Cpu, Shield, Terminal as TerminalIcon, Layers,
  ChevronDown, ArrowUpRight, Info, CheckCircle2,
  AlertTriangle, Database, Activity, Mail, CreditCard, Users
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { 
  ScanLines, CustomCursor, AnimatedGrid, HexGrid, 
  GlitchOverlay, ParticleField, TiltCard, Reveal, GlitchText 
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
        target
          .split("")
          .map((char, i) => {
            if (char === " ") return " ";
            if (char === "\n") return "\n";
            const revealAt = (i / target.length) * totalSteps * 0.8;
            if (step > revealAt) return char;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("")
      );
      if (step >= totalSteps) clearInterval(frame);
    }, 20);

    return () => clearInterval(frame);
  }, [target, trigger]);
  return display;
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
    {
      id: "initialize",
      tag: "initialize_node",
      title: "LUCY ACADEMIA",
      sub: "modular cognitive architecture for institutional synthesis.",
      content: (
        <div className="space-y-8 max-w-2xl">
          <p className="text-xl md:text-2xl text-zinc-300 leading-relaxed font-sans font-light">
            the next-generation operating system for modern academic coordination. bridging school owners, directors, faculty, parents, and students under a secure, unified cryptographic ledger.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-6">
            <Link href="/" target="_blank">
              <Button className="h-12 px-10 bg-white text-black hover:bg-zinc-200 font-bold rounded-none text-xs uppercase tracking-widest transition-all">
                explore_portal
              </Button>
            </Link>
            <div className="flex items-center gap-3 px-5 py-3 border border-white/10 bg-white/[0.02] rounded-none text-[11px] text-zinc-400 font-mono">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              live node active at: https://5-cn.net/
            </div>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Core stack: Next.js 15, React 19, TypeScript, TailwindCSS",
        "Edge-native execution model with regional routing latency under 45ms",
        "Full support for custom domain aliasing and SSL auto-provisioning",
        "Database: PostgreSQL with Prisma ORM layer"
      ]
    },
    {
      id: "friction",
      tag: "diagnostics // core_friction",
      title: "the fragmented institution",
      sub: "legacy educational infrastructure is broken.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-8 border border-white/10 bg-zinc-950/50 space-y-4 hover:border-cyan-500/20 transition-all duration-300">
            <div className="text-xs text-emerald-400 font-bold font-mono">[01] administrative lock</div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">manual marking</h3>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans font-light">
              administrators and faculty spend upwards of 45% of operational hours compiling grades, scaling marks, and mailing report sheets.
            </p>
          </div>
          <div className="p-8 border border-white/10 bg-zinc-950/50 space-y-4 hover:border-cyan-500/20 transition-all duration-300">
            <div className="text-xs text-indigo-400 font-bold font-mono">[02] delivery gap</div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">communication delay</h3>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans font-light">
              parents remain alienated from student classroom performance. grade releases and attendance notifications take days to coordinate.
            </p>
          </div>
          <div className="p-8 border border-white/10 bg-zinc-950/50 space-y-4 hover:border-cyan-500/20 transition-all duration-300">
            <div className="text-xs text-pink-400 font-bold font-mono">[03] structural risk</div>
            <h3 className="text-xl font-bold text-white uppercase tracking-tighter">data leakage</h3>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans font-light">
              multi-school platforms lack strict cryptographic separation, risking database overlap and exposure of student identity records.
            </p>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Typical administrative waste: 18-24 working hours per teacher per month",
        "EAS build errors and platform downtime compound operational losses",
        "Information silos result in average parent engagement metrics under 30%"
      ]
    },
    {
      id: "isolation",
      tag: "architecture // data_isolation",
      title: "cryptographic isolation",
      sub: "row-level security enforces absolute data privacy.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          <div className="p-8 border border-white/10 bg-zinc-950/50 flex items-start gap-5 text-left">
            <Shield className="w-10 h-10 text-emerald-400 shrink-0 mt-1" />
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-white uppercase tracking-tighter">postgresql row-level security (rls)</h4>
              <p className="text-sm text-zinc-400 leading-relaxed font-sans font-light">
                every query executed by the database layer is programmatically restricted by tenant variables. cross-tenant database access is architecturally impossible.
              </p>
            </div>
          </div>
          <div className="p-8 border border-white/10 bg-zinc-950/50 flex items-start gap-5 text-left">
            <Layers className="w-10 h-10 text-cyan-400 shrink-0 mt-1" />
            <div className="space-y-3">
              <h4 className="text-lg font-bold text-white uppercase tracking-tighter">popia & gdpr operator compliance</h4>
              <p className="text-sm text-zinc-400 leading-relaxed font-sans font-light">
                defines the institution as the 'responsible party' (controller) and lucy_academia strictly as the 'operator' (processor), minimizing platform exposure.
              </p>
            </div>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Implementation: Prisma multi-tenant client schema partitioning",
        "Enforces RLS at the connection layer using `SET LOCAL app.current_tenant` session tokens",
        "AES-256 field-level encryption for sensitive security hashes and student records"
      ]
    },
    {
      id: "ai_grading",
      tag: "engine // cognitive_evaluators",
      title: "ai-assisted auto-grading",
      sub: "evaluating student responses under zero data retention guidelines.",
      content: (
        <div className="p-6 bg-black border border-white/10 font-mono text-left w-full relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-cyan-500" />
          <div className="flex items-center justify-between border-b border-white/5 pb-3 text-xs text-zinc-500">
            <span>[openai_api_stream]</span>
            <span className="text-emerald-400">status: active_zdr</span>
          </div>
          <div className="space-y-3 text-xs md:text-sm mt-4">
            <p className="text-zinc-500">&gt; executing student_submission_evaluation...</p>
            <div className="p-4 bg-zinc-950 rounded-none border border-white/5 text-[12px] leading-relaxed">
              <span className="text-indigo-400">question_type:</span> "short_answer" <br />
              <span className="text-indigo-400">student_response:</span> "photosynthesis converts carbon dioxide into glucose using sunlight." <br />
              <span className="text-indigo-400">correct_keywords:</span> ["photosynthesis", "glucose", "sunlight"]
            </div>
            <p className="text-zinc-500">&gt; scanning response tokens...</p>
            <p className="text-emerald-400 font-bold">&gt; match verified. points awarded: 10/10 [normalized score: 100%]</p>
            <p className="text-zinc-500 text-[10.5px]">&gt; notice: privacy prompt sanitized. zero data cached by openai.</p>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Uses GPT-4o-mini endpoints with system instruction sets for prompt validation",
        "Zero-Data-Retention (ZDR) policy enabled via organization dashboard agreements",
        "Automated fallback to exact keyword-matching heuristics on API latency"
      ]
    },
    {
      id: "parent_sync",
      tag: "communication // parent_link",
      title: "instant parent synchronization",
      sub: "connecting families to student progress automatically.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-left">
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-sans font-light">
              the loop is closed immediately upon grade submission. the platform identifies linked parent emails and fires report credentials.
            </p>
            <div className="p-5 border border-white/10 bg-white/[0.01] rounded-none">
              <div className="text-emerald-400 text-xs font-mono font-bold mb-2">⚡ real-time email dispatch</div>
              <p className="text-xs text-zinc-500 leading-relaxed font-sans">
                powered by resend mail api. parents receive report cards containing attendance metrics, exact grades, and teacher remarks.
              </p>
            </div>
          </div>
          <div className="p-6 border border-white/10 bg-zinc-950/50 flex flex-col justify-center">
            <div className="text-indigo-400 text-xs font-mono font-bold mb-2">🔒 verification verification</div>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans mb-4">
              direct magic links allow parents to log in securely without managing complex password arrays.
            </p>
            <div className="p-4 bg-black border border-white/5 font-mono text-[11px] text-zinc-400">
              [magic_token]: active <br />
              [expiration]: 48_hours
            </div>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Email engine powered by Resend (SMTP configuration utilizing domain verification keys)",
        "Direct link login relies on signed JWT magic tokens expiring in 48 hours",
        "Integrated rate limiting: maximum 5 notifications per parent node per hour"
      ]
    },
    {
      id: "command_center",
      tag: "console // superadmin_dashboard",
      title: "institutional command center",
      sub: "superadmins control the entire educational node landscape.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-left">
          <div className="p-8 border border-white/10 bg-zinc-950/50 space-y-4">
            <div className="flex items-center gap-3">
              <Cpu className="w-6 h-6 text-emerald-400" />
              <h4 className="text-md font-bold text-white uppercase tracking-tighter">school registry manager</h4>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans font-light">
              superadmins can instantly provision, suspend, or delete entire school environments, regulating platform subscription states dynamically.
            </p>
          </div>
          <div className="p-8 border border-white/10 bg-zinc-950/50 space-y-4">
            <div className="flex items-center gap-3">
              <Layers className="w-6 h-6 text-indigo-400" />
              <h4 className="text-md font-bold text-white uppercase tracking-tighter">integrated audit ledgers</h4>
            </div>
            <p className="text-sm text-zinc-400 leading-relaxed font-sans font-light">
              central logs capture wants-access enrollment requests and security vulnerability reports directly within a single operational console.
            </p>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Consolidated SuperAdmin view is protected by server middleware and JSON Web Tokens",
        "Includes real-time system performance telemetry and CPU/Memory statistics",
        "Database backup lifecycle: automated dumps synced to private cloud buckets every 24 hours"
      ]
    },
    {
      id: "wants_access",
      tag: "intake // wants_access_database",
      title: "the wants-access ledger",
      sub: "managing inbound coordinate registrations securely.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-left">
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-sans font-light">
              onboarding requests submitted via the contact system bypass external email boxes and log directly into the database.
            </p>
            <p className="text-xs text-zinc-500 font-sans font-light leading-relaxed">
              this intake flow protects communications channels, tracking lead lifecycle vectors from coordinate contact form submissions.
            </p>
          </div>
          <div className="p-6 border border-white/10 bg-zinc-950/50 space-y-3">
            <div className="text-[10px] text-zinc-500 font-mono flex items-center justify-between border-b border-white/5 pb-2">
              <span>[incoming_transmissions]</span>
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
            </div>
            <div className="text-xs space-y-2 font-mono leading-relaxed">
              <p><span className="text-emerald-400">callsign:</span> "vanguard_academy"</p>
              <p><span className="text-emerald-400">comm_link:</span> "director@vanguard.edu"</p>
              <p><span className="text-emerald-400">payload:</span> "initialize pilot node for 800 student terminals."</p>
            </div>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Endpoint: POST `/api/admin/wants-access`",
        "Inserts structured payloads into the SQLite/PostgreSQL operational ledger",
        "Fires direct webhooks to slack/discord coordinate networks on request arrival"
      ]
    },
    {
      id: "security_vault",
      tag: "vault // security_reports",
      title: "vulnerability vault",
      sub: "securing the ecosystem with zero-day disclosures.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-left">
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-sans font-light">
              a dedicated submission route (/security) allows white-hat penetration testers to safely submit vulnerability disclosures directly to superadmins.
            </p>
            <p className="text-xs text-zinc-500 font-sans font-light leading-relaxed">
              securing the perimeter through collaborative, public researcher engagement pipelines.
            </p>
          </div>
          <div className="p-6 border border-white/10 bg-zinc-950/50 space-y-2 font-mono text-xs leading-relaxed">
            <div className="text-pink-400 font-bold">[security_report_received]</div>
            <p className="text-zinc-500">category: "authentication_bypass_attempt"</p>
            <p className="text-zinc-500">severity: "CRITICAL"</p>
            <p className="text-zinc-500">hash: "sha256_bf9a7244dc..."</p>
            <div className="w-full h-1 bg-zinc-900 rounded-full overflow-hidden relative mt-3">
              <div className="absolute left-0 top-0 h-full w-[80%] bg-pink-500" />
            </div>
            <p className="text-[9.5px] text-zinc-600 mt-1">status: mitigated // patch deployed</p>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Endpoint: `/api/public/security-report`",
        "Payload limits: max 5MB attachments containing logs or proof-of-concept files",
        "Automated cryptographic fingerprinting (SHA-256) of every disclosure ticket"
      ]
    },
    {
      id: "roles",
      tag: "access_control // rbac_mapping",
      title: "unified role hierarchy",
      sub: "granular permission layers protect the institutional matrix.",
      content: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left">
          <div className="p-5 border border-white/10 bg-zinc-950/50 space-y-2 hover:border-emerald-500/20 transition-all duration-300">
            <div className="text-[10px] text-zinc-500 font-mono font-bold">01 // OWNER</div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">manage school configuration, logo, and core matrix parameters.</p>
          </div>
          <div className="p-5 border border-white/10 bg-zinc-950/50 space-y-2 hover:border-emerald-500/20 transition-all duration-300">
            <div className="text-[10px] text-zinc-500 font-mono font-bold">02 // PRINCIPAL</div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">access grading sheets, manage student roster, and regulate billing.</p>
          </div>
          <div className="p-5 border border-white/10 bg-zinc-950/50 space-y-2 hover:border-emerald-500/20 transition-all duration-300">
            <div className="text-[10px] text-zinc-500 font-mono font-bold">03 // TEACHER</div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">conduct classes, build exams, log student attendance, and assign marks.</p>
          </div>
          <div className="p-5 border border-white/10 bg-zinc-950/50 space-y-2 hover:border-emerald-500/20 transition-all duration-300">
            <div className="text-[10px] text-zinc-500 font-mono font-bold">04 // PARENT</div>
            <p className="text-xs text-zinc-400 leading-relaxed font-sans">view child report cards, check live attendance logs, and contact teachers.</p>
          </div>
        </div>
      ),
      technicalAppendix: [
        "RBAC strategy: Next.js middleware token checks and database-level role claims",
        "Access tokens: JWT containing tenant ID, user role, and session expiration",
        "API rate limiting scales based on role type (SuperAdmin has absolute capacity)"
      ]
    },
    {
      id: "billing",
      tag: "ledger // school_finance",
      title: "automated billing matrix",
      sub: "invoice tracking, expense management, and status updates.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full text-left">
          <div className="space-y-4">
            <p className="text-zinc-400 text-sm md:text-base leading-relaxed font-sans font-light">
              financial layers are built directly into the student registry, allowing directors to invoice parents automatically based on class tiers.
            </p>
            <p className="text-xs text-zinc-500 font-sans font-light leading-relaxed">
              real-time synchronization ensures transparent invoicing pipelines and automatic balance tracking.
            </p>
          </div>
          <div className="p-6 border border-white/10 bg-zinc-950/50 space-y-3 font-mono text-xs">
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
              <span className="text-zinc-400 font-bold">INVOICE_ID // 9872</span>
              <span className="px-2 py-0.5 bg-emerald-950/50 text-emerald-400 border border-emerald-500/20 text-[9px] font-bold rounded">PAID</span>
            </div>
            <div className="flex justify-between font-mono">
              <span>student: "liora_van_zyl"</span>
              <span>total: $1,250.00</span>
            </div>
            <div className="text-[10px] text-zinc-600">payment verified via webhook // ledger synchronized</div>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Support categories: tuition fees, study materials, transport, extracurricular activities",
        "Expense ledger records category, raw amount, date, and invoice references",
        "Audit trail: edits to logs trigger system warnings and record the updating principal ID"
      ]
    },
    {
      id: "telemetry",
      tag: "telemetry // active_endpoints",
      title: "live system telemetry",
      sub: "inspect the operational live nodes of our production environment.",
      content: (
        <div className="space-y-4 font-mono text-xs md:text-sm w-full text-left">
          <p className="text-zinc-500 font-mono">&gt; querying system endpoints...</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <a href="https://5-cn.net" target="_blank" className="p-4 border border-white/10 bg-zinc-950/30 hover:border-emerald-500/30 transition-all flex items-center justify-between">
              <div>
                <span className="text-emerald-400 font-bold">core_portal</span> <br />
                <span className="text-[10px] text-zinc-600">https://5-cn.net/</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600" />
            </a>
            <a href="https://5-cn.net/register" target="_blank" className="p-4 border border-white/10 bg-zinc-950/30 hover:border-indigo-500/30 transition-all flex items-center justify-between">
              <div>
                <span className="text-indigo-400 font-bold">register_node</span> <br />
                <span className="text-[10px] text-zinc-600">https://5-cn.net/register</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600" />
            </a>
            <a href="https://5-cn.net/security" target="_blank" className="p-4 border border-white/10 bg-zinc-950/30 hover:border-pink-500/30 transition-all flex items-center justify-between">
              <div>
                <span className="text-pink-400 font-bold">security_vault</span> <br />
                <span className="text-[10px] text-zinc-600">https://5-cn.net/security</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600" />
            </a>
            <a href="https://5-cn.net/contact" target="_blank" className="p-4 border border-white/10 bg-zinc-950/30 hover:border-cyan-400/30 transition-all flex items-center justify-between">
              <div>
                <span className="text-cyan-400 font-bold">wants_access_contact</span> <br />
                <span className="text-[10px] text-zinc-600">https://5-cn.net/contact</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-zinc-600" />
            </a>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Deployment framework: Vercel serverless nodes with globally distributed static assets",
        "Edge route middleware filters incoming requests based on source country codes",
        "DNS configuration: custom root mapping utilizing Cloudflare edge routing protocols"
      ]
    },
    {
      id: "pricing",
      tag: "pricing // subscription_tiers",
      title: "scalable saas economics",
      sub: "flexible tiers for individual nodes up to enterprise networks.",
      content: (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-6 border border-white/10 bg-zinc-950/50 space-y-4 hover:border-cyan-500/20 transition-all duration-300">
            <div className="text-[10px] text-zinc-500">tier_01</div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tighter">pilot node</h3>
            <p className="text-2xl font-bold text-zinc-400">free</p>
            <p className="text-xs text-zinc-600 leading-relaxed font-sans">3-month evaluation environment for test schools.</p>
          </div>
          <div className="p-6 border border-emerald-500/20 bg-emerald-950/5 space-y-4 relative hover:border-emerald-500/30 transition-all duration-300">
            <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-600 text-white text-[8px] font-bold uppercase rounded-bl-xl font-mono">recommended</div>
            <div className="text-[10px] text-emerald-400">tier_02</div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tighter">core matrix</h3>
            <p className="text-2xl font-bold text-emerald-400">$250<span className="text-xs text-zinc-500">/mo</span></p>
            <p className="text-xs text-zinc-500 leading-relaxed font-sans">full administrative, grading, and parent portal infrastructure.</p>
          </div>
          <div className="p-6 border border-white/10 bg-zinc-950/50 space-y-4 hover:border-cyan-500/20 transition-all duration-300">
            <div className="text-[10px] text-zinc-500">tier_03</div>
            <h3 className="text-lg font-bold text-white uppercase tracking-tighter">enterprise</h3>
            <p className="text-2xl font-bold text-zinc-400">custom</p>
            <p className="text-xs text-zinc-600 leading-relaxed font-sans">dedicated server, custom api plugins, and multi-school networking.</p>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Core Matrix: includes all resend integrations, PostgreSQL isolated backups, and standard support channels",
        "Enterprise Tiers: SLA commitment of 99.99% monthly availability with service credit remedies",
        "Custom billing cycles (quarterly/annually) can be coordinated with the operations team"
      ]
    },
    {
      id: "cta",
      tag: "initialize_session // deployment",
      title: "initialize your node",
      sub: "deploy the future of academic management today.",
      content: (
        <div className="space-y-8 max-w-xl">
          <p className="text-zinc-300 text-base md:text-lg leading-relaxed font-sans font-light">
            connect with a vanguard representative, secure your custom portal, and provision your student terminals.
          </p>
          <div className="flex flex-wrap gap-4 pt-4">
            <Button 
              onClick={() => setShowConfetti(true)}
              className="h-12 px-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-none text-xs uppercase tracking-widest shadow-lg shadow-emerald-950/20 transition-all"
            >
              deploy_matrix_now
            </Button>
            <Link href="/contact" target="_blank">
              <Button variant="outline" className="h-12 px-8 rounded-none border border-white/10 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all font-bold">
                schedule_consultation
              </Button>
            </Link>
          </div>
        </div>
      ),
      technicalAppendix: [
        "Self-provisioning portal completes database schema initialization in 90 seconds",
        "Customer success coordinator will schedule a training walkthrough for school directors",
        "Vulnerability portal available for incident alerts post-deployment"
      ]
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
    const interval = setInterval(handleNext, 8500);
    return () => clearInterval(interval);
  }, [isPlaying, handleNext]);

  // Confetti timeout resets
  useEffect(() => {
    if (!showConfetti) return;
    const timeout = setTimeout(() => setShowConfetti(false), 5000);
    return () => clearTimeout(timeout);
  }, [showConfetti]);

  const slide = slides[currentSlide];

  // Scrambled heading effect on slide change
  const scrambledTitle = useScramble(slide.title, currentSlide);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-mono lowercase tracking-tight select-none overflow-hidden relative">
      
      {/* ── Visual Overlays matching the Home Page ── */}
      <ScanLines />
      <CustomCursor />
      <AnimatedGrid />
      <HexGrid />
      <GlitchOverlay />
      
      {/* Floating Particle Field background */}
      <ParticleField count={45} />
      
      <PresentationConfetti trigger={showConfetti} />

      {/* ── Navbar ── */}
      <nav className="border-b border-white/5 px-6 py-4 flex items-center justify-between relative z-10 bg-black/85 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo className="w-8 h-8" />
          <span className="font-bold text-lg tracking-tighter text-white">lucy_academia</span>
        </Link>
        <div className="flex items-center gap-4">
          <div className="text-[10px] text-zinc-500 uppercase tracking-widest hidden md:flex items-center gap-2">
            <Keyboard className="w-4 h-4" />
            use [arrow keys] to navigate
          </div>
          <span className="px-3 py-1 border border-cyan-500/20 bg-cyan-950/20 text-[10px] text-cyan-400 uppercase font-bold rounded-lg font-mono shadow-[0_0_15px_rgba(6,182,212,0.15)]">
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
            className="w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center min-h-[55vh]"
          >
            {/* Left Side: Header & Context */}
            <div className="lg:col-span-6 space-y-6 text-left relative z-20">
              <div className="flex items-center gap-3 text-zinc-500 text-[10px] font-mono tracking-widest">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                {slide.tag}
              </div>
              
              <h1 className="text-4xl md:text-6xl font-black uppercase tracking-tighter leading-none text-white min-h-[70px] md:min-h-[120px]">
                <GlitchText>{scrambledTitle}</GlitchText>
              </h1>
              
              <p className="text-sm md:text-base text-zinc-400 leading-relaxed max-w-lg font-sans font-light">
                {slide.sub}
              </p>

              {/* Technical Appendix toggler (The "More Info" drawer) */}
              <div className="pt-4">
                <Button 
                  onClick={() => setShowAppendix(!showAppendix)}
                  variant="ghost" 
                  className="p-0 h-auto text-[10px] uppercase text-zinc-400 hover:text-emerald-400 flex items-center gap-2 group tracking-widest font-bold"
                >
                  <Info className="w-3.5 h-3.5" />
                  {showAppendix ? "close_specifications" : "view_system_specifications"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showAppendix ? "rotate-180" : ""}`} />
                </Button>
              </div>

              {/* Expandable Appendix specs */}
              <AnimatePresence>
                {showAppendix && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-zinc-950/80 border border-white/5 rounded-none p-6 mt-4 space-y-3 font-mono text-[11px] text-zinc-400"
                  >
                    <div className="text-emerald-400 font-bold uppercase border-b border-white/5 pb-1 font-mono">system_appendix // specifications</div>
                    {slide.technicalAppendix.map((spec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <span className="text-emerald-500 font-bold shrink-0 font-mono">&gt;</span>
                        <span className="leading-relaxed font-sans font-light">{spec}</span>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Side: 3D TiltCard Wrapping Content */}
            <div className="lg:col-span-6 relative z-10">
              <TiltCard className="w-full">
                <div className="relative group transition-all duration-500">
                  {/* Neon border glow effect */}
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-none opacity-10 group-hover:opacity-20 blur transition duration-1000 group-hover:duration-200" />
                  
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
            className="w-12 h-12 bg-zinc-900 border border-white/5 hover:border-white/10 text-white rounded-none flex items-center justify-center transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleNext}
            className="w-12 h-12 bg-zinc-900 border border-white/5 hover:border-white/10 text-white rounded-none flex items-center justify-center transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="text-[9px] text-zinc-700 hidden md:block">
          lucy_academia // presentation_node
        </div>
      </footer>
    </div>
  );
}
