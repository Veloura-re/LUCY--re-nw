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
  Counter, SystemRain, Typewriter, InteractiveParticleSimulation
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

    const colors = ["#a1a1aa", "#d4d4d8", "#71717a", "#cbd5e1", "#52525b"];
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
      <div className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white font-mono flex items-center justify-center">
        {prefix && <span>{prefix}</span>}
        <Counter from={0} to={value} suffix={suffix} duration={2} />
      </div>
      <div className="text-[9px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest font-bold">{label}</div>
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
      whileHover={{ x: 4, borderColor: "rgba(100,116,139,0.5)" }}
      className="flex gap-4 items-start p-5 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-950/50 transition-all duration-300 group cursor-default rounded-xl dark:rounded-none shadow-sm dark:shadow-none"
    >
      <Icon className="w-5 h-5 text-slate-400 dark:text-zinc-400 shrink-0 mt-0.5 group-hover:text-emerald-500 dark:group-hover:text-white transition-colors" />
      <div className="space-y-1">
        <div className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{title}</div>
        <p className="text-[11px] text-slate-500 dark:text-zinc-500 leading-relaxed font-sans">{desc}</p>
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
    // ──────────────────── 1. THE BIG PICTURE ────────────────────
    {
      id: "flywheel",
      tag: "How Lucy Helps Your School",
      title: "Everything Your School Needs In One Place",
      sub: "Save hours every week, stop losing fee money, and make parents love your school.",
      content: (
        <div className="space-y-6 w-full text-left">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { num: "01", title: "Less Paperwork", desc: "Teachers and office staff save up to 40 hours a week on grading, fees, and attendance." },
              { num: "02", title: "Happy Teachers", desc: "Teachers spend more time helping students instead of doing boring manual paperwork." },
              { num: "03", title: "Happy Parents", desc: "Parents see grades and attendance on their phones right away. No surprises." },
              { num: "04", title: "More Students", desc: "A modern, well-run school attracts more families and grows faster every year." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 space-y-4 rounded-2xl shadow-sm"
              >
                <div className="text-2xl font-bold text-slate-300 dark:text-white/20 font-mono">{item.num}</div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">{item.title}</h3>
                <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed font-sans">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      ),
      technicalAppendix: [
        "Old way: Lost paper sheets, endless phone calls, and messy spreadsheets.",
        "Lucy way: Everything runs smoothly in one simple, easy app."
      ]
    },

    // ──────────────────── 2. SIMPLE FEE PAYMENTS ────────────────────
    {
      id: "finance_01",
      tag: "Simple Fee Payments",
      title: "No More Chasing Bank Slips",
      sub: "Parents pay school fees straight from their phones. Money goes directly to the school account.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Parents pay in 10 seconds from home using Telebirr, CBE Birr, or bank card. The school gets paid on time with zero calculation errors.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="Hours Saved Weekly" value={40} suffix="h" delay={0.1} />
            <StatBlock label="Payment Accuracy" value={100} suffix="%" delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Works directly with major mobile money and bank services.",
        "Sends a clean digital receipt to parents as soon as they pay."
      ]
    },
    {
      id: "finance_02",
      tag: "Save Money On Paper",
      title: "Say Goodbye To Piles Of Paper",
      sub: "Permission slips, report cards, and forms are all digital and signed on mobile.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Stop spending thousands of dollars on paper, forms, and printer ink every year. Everything is safely stored and easy to find.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={FileText} title="Sign On Phone" desc="Parents sign permission slips with one simple tap on their phone." delay={0.1} />
            <FeatureItem icon={Lock} title="Never Lost" desc="No more lost homework papers or crumpled permission forms in backpacks." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Creates clean digital PDF forms for parents.",
        "Saves exact signature time and date so records are always safe."
      ]
    },
    {
      id: "finance_03",
      tag: "Financial Clarity // Executive View",
      title: "Real-Time Financial Visibility",
      sub: "Monitor tuition revenue, outstanding balances, and daily expenses live in one place.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Directors and board members get immediate clarity on cash flow and budgets without waiting for delayed month-end reports.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Activity} title="Executive Dashboard" desc="Track incoming tuition, pending fees, and operational costs on clean charts." delay={0.1} />
            <FeatureItem icon={Database} title="Zero Financial Leakage" desc="Every transaction, receipt, and expense is securely audited and accounted for." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Live telemetry on tuition revenue, pending balances, and expenses.",
        "Reconciles accounts automatically with zero spreadsheet errors."
      ]
    },
    {
      id: "finance_04",
      tag: "On-Time Payments",
      title: "Friendly Auto Reminders For Parents",
      sub: "Automatic text messages remind parents before fee deadlines so you don't have to make awkward phone calls.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Gentle automated text reminders help parents pay on time, increasing fee collection by 25% without staff having to call families.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="Faster Fee Payments" value={25} suffix="%" delay={0.1} />
            <FeatureItem icon={Bell} title="Direct Text Alerts" desc="Sent straight to mom or dad's phone with a quick pay link." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Sends polite text reminders before payment deadlines.",
        "Parents can tap a link in the message to pay immediately."
      ]
    },

    // ──────────────────── 3. EMPOWERING TEACHERS ────────────────────
    {
      id: "edu_05",
      tag: "AI Exam Helper",
      title: "Make Tests In Minutes, Not Weekends",
      sub: "Our smart assistant helps teachers write great quiz and exam questions in seconds.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Teachers don't have to stay up all night writing tests. Pick a subject and grade level, and get ready-to-print questions immediately.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Cpu} title="Ready Questions" desc="Multiple choice, short answers, and full answer keys." delay={0.1} />
            <FeatureItem icon={Shield} title="Print Ready" desc="Download clean test papers ready for class in one click." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Creates tests tailored to the curriculum for any grade level.",
        "Exports neat, printable exam sheets ready for the classroom."
      ]
    },
    {
      id: "edu_06",
      tag: "Fast Attendance",
      title: "Take Roll Call In 10 Seconds",
      sub: "Teachers tap Present or Absent on their phone. Works even when the internet is down.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Classes start right away without wasting 10 minutes calling names. The main office knows who is in school instantly.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="Class Time Saved" value={10} suffix="m/day" delay={0.1} />
            <FeatureItem icon={Zap} title="Works Offline" desc="Take attendance even with no Wi-Fi. It syncs when you're back online." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Saves data on the phone so you never lose attendance if Wi-Fi drops.",
        "Syncs with the main school office the moment the connection returns."
      ]
    },
    {
      id: "edu_07",
      tag: "Easy Grading",
      title: "Grades Calculated Automatically",
      sub: "Just type the scores. Lucy calculates the totals, averages, and ranks for you.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">No more calculator mistakes or broken Excel formulas. Grades and student rankings are ready in seconds.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={BarChart3} title="Auto Math" desc="Averages, test weights, and curves done automatically." delay={0.1} />
            <FeatureItem icon={Settings} title="Student Rankings" desc="Instantly see top performers and who needs extra help." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Handles weighted formulas (e.g. 20% quizzes, 30% midterm, 50% final).",
        "Shows instant rank lists and performance breakdowns."
      ]
    },
    {
      id: "edu_08",
      tag: "Safe & Honest Records",
      title: "Grades Can Never Be Changed In Secret",
      sub: "Only authorized teachers can enter marks, and every single change is safely recorded.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Parents and universities can 100% trust your school's grades because records are locked and tamper-proof.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Shield} title="Teacher Only" desc="Teachers can only edit their own assigned classes." delay={0.1} />
            <FeatureItem icon={TerminalIcon} title="Full History" desc="See who changed what score and at what exact time." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Only assigned subject teachers and principals have editing access.",
        "Audit history shows every edit with exact timestamp and user name."
      ]
    },

    // ──────────────────── 4. CONNECTED PARENTS & STUDENTS ────────────────────
    {
      id: "parent_09",
      tag: "For Parents",
      title: "Their Child's Journey, Live In Their Pocket",
      sub: "Parents can see grades, daily attendance, and teacher notes right on their phone.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">When parents see how their kids are doing every day, they help them study at home and feel proud of the school.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Eye} title="Live Grades" desc="Parents see test results as soon as the teacher enters them." delay={0.1} />
            <FeatureItem icon={Database} title="All In One App" desc="See all children on one single family account." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Simple mobile login where parents can switch between all their children.",
        "Sends instant notifications when new test marks or notes are posted."
      ]
    },
    {
      id: "parent_10",
      tag: "No More WhatsApp Chaos",
      title: "Private, Professional School Chat",
      sub: "Parents message teachers inside the school app. No need to share personal phone numbers.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Teachers get peaceful evenings with automatic quiet hours, while school leaders can review message history if needed.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={MessageSquare} title="Private Numbers" desc="Teachers keep their personal WhatsApp number private." delay={0.1} />
            <FeatureItem icon={Clock} title="Quiet Hours" desc="Messages sent late at night wait peacefully until morning." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Keeps all communication professional and inside the school system.",
        "Sets quiet hours so teachers aren't disturbed late in the evening."
      ]
    },
    {
      id: "parent_11",
      tag: "Student Safety",
      title: "Instant Text If A Student Is Absent",
      sub: "Parents get a text within 3 seconds if their child is not in class.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Parents know their children are safe, and students can't skip class without mom and dad finding out right away.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="Alert Speed" value={3} suffix="s" delay={0.1} />
            <FeatureItem icon={Bell} title="Direct Text Alert" desc="Sent straight to mom and dad's phone immediately." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Instant SMS sent directly to parent phone numbers.",
        "Automatically marks excused if parent already sent a doctor note."
      ]
    },
    {
      id: "student_13",
      tag: "For Students",
      title: "A Cool App Students Love To Use",
      sub: "Students check their homework, see upcoming tests, and watch their grades go up.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">A clean, modern app makes school fun and motivates students to do their homework on time.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Palette} title="Clean Timetable" desc="Daily schedule so students know which classroom to go to next." delay={0.1} />
            <FeatureItem icon={BarChart3} title="Track Progress" desc="Fun visual charts show improvement in every subject." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Students can see homework tasks and submit work easily.",
        "Shows real-time room numbers and class schedules."
      ]
    },

    // ──────────────────── 5. SCHOOL MANAGEMENT & PEACE OF MIND ────────────────────
    {
      id: "admin_15",
      tag: "Fast Report Cards",
      title: "Print All Report Cards In 60 Seconds",
      sub: "Create beautiful, stamped report cards for the whole school with just one click.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">No more spending the entire weekend printing and checking report cards. Lucy makes clean PDFs with your school logo ready to print or send.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="Whole School Print Time" value={60} suffix="s" delay={0.1} />
            <FeatureItem icon={FileText} title="Clean PDF Cards" desc="Includes school logo, teacher remarks, and QR stamp." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Renders hundreds of report cards in seconds without crashing.",
        "Includes a verification QR code so nobody can forge a report card."
      ]
    },
    {
      id: "admin_16",
      tag: "Zero IT Headaches",
      title: "No Servers To Buy. Works On Any Phone Or PC.",
      sub: "Open your browser and log in. Lucy runs anywhere with an internet connection.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">You don't need to buy expensive computer servers or hire IT technicians. Everything is saved safely in the cloud.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <StatBlock label="Server Cost" value={0} prefix="$" delay={0.1} />
            <FeatureItem icon={Globe} title="Always Backed Up" desc="All student records and money history are backed up safely every hour." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Runs securely in the cloud with 99.9% uptime.",
        "Automatic hourly backups so your school data is always safe."
      ]
    },
    {
      id: "admin_19",
      tag: "Class Schedules",
      title: "Make Class Schedules With Zero Clashes",
      sub: "Never put two classes in the same room or give one teacher two classes at once.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">Making school timetables by hand takes weeks. Lucy creates a balanced schedule for all grades in minutes.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Calendar} title="No Room Clashes" desc="Makes sure every teacher and class has an open room." delay={0.1} />
            <FeatureItem icon={Zap} title="Fair Workload" desc="Balances teaching hours fairly among all teachers." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Smart checker finds and fixes schedule clashes automatically.",
        "Updates teacher and student schedules immediately."
      ]
    },
    {
      id: "admin_20",
      tag: "A Modern School",
      title: "Make Your School The Best In Town",
      sub: "Parents love modern schools. Give your school the tech tools it deserves.",
      content: (
        <div className="space-y-6 w-full text-left">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} className="p-6 border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-zinc-900/60 rounded-2xl shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase mb-2">Why This Helps Your School</h3>
            <p className="text-xs text-slate-600 dark:text-zinc-400 leading-relaxed">When parents see how modern and organized your school is, they tell their friends, helping your school grow year after year.</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-4">
            <FeatureItem icon={Palette} title="Modern Look" desc="Clean, beautiful design that parents and teachers are proud of." delay={0.1} />
            <FeatureItem icon={Eye} title="More Enrolments" desc="Attracts great families who want the best education for their kids." delay={0.2} />
          </div>
        </div>
      ),
      technicalAppendix: [
        "Clean, modern design that is easy for anyone to use.",
        "Bank-level security keeps all student and family data private."
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

  return (
    <div className="min-h-screen bg-white dark:bg-black text-slate-900 dark:text-white flex flex-col font-mono lowercase tracking-tight select-none overflow-x-hidden overflow-y-auto relative transition-colors duration-300">
      
      {/* ── Visual Overlays ── */}
      <ScanLines />
      <CustomCursor />
      <AnimatedGrid />
      <HexGrid />
      <GlitchOverlay />
      <InteractiveParticleSimulation count={120} interactive={true} burstOnLoad={true} fullScreen={true} connectionDistance={140} showTriangles={true} />
      <PresentationConfetti trigger={showConfetti} />

      {/* ── Navbar ── */}
      <nav className="border-b border-slate-200 dark:border-white/5 px-6 py-4 flex items-center justify-between relative z-10 bg-white/85 dark:bg-black/85 backdrop-blur-md transition-colors">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Logo className="w-7 h-7 text-slate-900 dark:text-white" />
          <span className="font-bold text-lg tracking-tighter text-slate-900 dark:text-white">lucy_os</span>
        </Link>
        <div className="flex items-center gap-3 sm:gap-4">
          <Link href="/features">
            <Button variant="ghost" className="hidden sm:flex text-[11px] uppercase tracking-widest font-bold text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white">
              Features
            </Button>
          </Link>
          <Link href="/register">
            <Button className="h-9 px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase tracking-widest font-bold rounded-xl shadow-sm transition-all">
              Start Free Trial
            </Button>
          </Link>
          <div className="text-[10px] text-slate-500 dark:text-zinc-500 uppercase tracking-widest hidden lg:flex items-center gap-2 font-bold ml-2">
            <Keyboard className="w-4 h-4" />
            [arrow keys]
          </div>
          <motion.span
            animate={{ borderColor: ["rgba(255,255,255,0.1)", "rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"] }}
            transition={{ repeat: Infinity, duration: 3 }}
            className="px-3 py-1 border border-slate-300 bg-slate-100 dark:border-white/10 dark:bg-zinc-950/50 text-[10px] text-slate-600 dark:text-zinc-400 uppercase font-bold font-mono rounded-lg"
          >
            Slide {String(currentSlide + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
          </motion.span>
        </div>
      </nav>

      {/* ── Slide Progress Bar ── */}
      <div className="h-px bg-slate-200 dark:bg-zinc-900 relative z-10">
        <motion.div
          animate={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500"
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
                className="flex items-center gap-3 text-slate-500 dark:text-zinc-500 text-[10px] font-mono tracking-widest font-bold"
              >
                <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                {slide.tag}
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.5 }}
                className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none text-slate-900 dark:text-white pb-3"
              >
                {slide.title}
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.4 }}
                className="text-sm text-slate-600 dark:text-zinc-400 leading-relaxed max-w-lg font-sans font-medium"
              >
                {slide.sub}
              </motion.p>

              {/* Technical Appendix toggler */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} className="pt-4">
                <Button 
                  onClick={() => setShowAppendix(!showAppendix)}
                  variant="ghost" 
                  className="p-0 h-auto text-[10px] uppercase text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white flex items-center gap-2 group tracking-widest font-bold"
                >
                  <Info className="w-3.5 h-3.5" />
                  {showAppendix ? "Hide Technical Details" : "See How It Works"}
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${showAppendix ? "rotate-180" : ""}`} />
                </Button>
              </motion.div>

              {/* Expandable Appendix */}
              <AnimatePresence>
                {showAppendix && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -10 }}
                    animate={{ opacity: 1, height: "auto", y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -10 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 mt-2 border-l-2 border-emerald-500 bg-slate-100 dark:bg-zinc-900/60 space-y-2 rounded-r-xl">
                      <div className="text-[9px] uppercase tracking-widest text-emerald-500 font-bold mb-3">How It Works //</div>
                      <ul className="space-y-2 text-xs font-mono text-slate-600 dark:text-zinc-400">
                        {slide.technicalAppendix.map((line, i) => (
                          <li key={i} className="flex gap-2 items-start">
                            <span className="text-emerald-500">{">"}</span> {line}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right Side: Dynamic Content */}
            <div className="lg:col-span-7 relative z-20">
              {slide.content}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer Controls ── */}
      <footer className="border-t border-slate-200 dark:border-white/5 px-6 py-6 relative z-10 bg-white/85 dark:bg-zinc-950/85 backdrop-blur-md flex flex-col md:flex-row items-center justify-between gap-6 transition-colors">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrev}
            className="w-10 h-10 border-slate-300 dark:border-white/20 text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 rounded-xl transition-all"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 border-slate-300 dark:border-white/20 text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 rounded-xl transition-all"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNext}
            className="w-10 h-10 border-slate-300 dark:border-white/20 text-slate-600 dark:text-zinc-400 hover:text-slate-900 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-white/10 rounded-xl transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Indicator dots */}
        <div className="flex gap-1.5 overflow-x-auto max-w-[200px] md:max-w-md pb-2 md:pb-0 scrollbar-hide">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setCurrentSlide(i);
                setShowAppendix(false);
              }}
              className={`h-1 transition-all rounded-full ${
                i === currentSlide 
                  ? "w-8 bg-emerald-500" 
                  : "w-2 bg-slate-300 dark:bg-white/20 hover:bg-slate-400 dark:hover:bg-white/40"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-4">
          {currentSlide === slides.length - 1 ? (
            <Link href="/register">
              <Button
                onClick={() => setShowConfetti(true)}
                className="h-10 px-6 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 rounded-xl shadow-lg shadow-emerald-900/20 transition-all"
              >
                Launch Your Campus <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          ) : (
            <Button
              onClick={handleNext}
              className="h-10 px-6 bg-slate-900 text-white dark:bg-white dark:text-black hover:bg-slate-800 dark:hover:bg-zinc-200 text-[10px] uppercase tracking-widest font-bold flex items-center gap-2 rounded-xl transition-all"
            >
              Next Slide <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
