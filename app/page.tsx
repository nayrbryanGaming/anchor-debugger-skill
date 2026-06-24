"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  motion, useInView, useScroll, useTransform,
  AnimatePresence, useMotionValue, useSpring,
} from "framer-motion";
import {
  AlertCircle, ArrowRight, Check, Clock, Code2, Copy, Cpu,
  DollarSign, GitBranch, Shield, Zap, Play, CheckCircle2,
  Wrench, Search, ExternalLink, ChevronRight, Terminal, Layers,
} from "lucide-react";

const ParticleCanvas = dynamic(() => import("@/components/ParticleCanvas"), { ssr: false });

/* ── variants ────────────────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.65, delay: i * 0.09, ease: [0.16, 1, 0.3, 1] } }),
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({ opacity: 1, transition: { duration: 0.5, delay: i * 0.07 } }),
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.55, delay: i * 0.07, ease: [0.34, 1.56, 0.64, 1] } }),
};
const clipReveal = {
  hidden: { clipPath: "inset(0 0 100% 0)" },
  visible: (i = 0) => ({ clipPath: "inset(0 0 0% 0)", transition: { duration: 0.85, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] } }),
};
const slideLeft = {
  hidden: { opacity: 0, x: -20 },
  visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.55, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] } }),
};
const slideRight = {
  hidden: { opacity: 0, x: 20 },
  visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.55, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

/* ── useTilt ─────────────────────────────────────────── */
function useTilt(strength = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(x, { stiffness: 280, damping: 32 });
  const ry = useSpring(y, { stiffness: 280, damping: 32 });
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    x.set(((e.clientY - r.top - r.height / 2) / (r.height / 2)) * strength);
    y.set((-(e.clientX - r.left - r.width / 2) / (r.width / 2)) * strength);
  }, [x, y, strength]);
  const onLeave = useCallback(() => { x.set(0); y.set(0); }, [x, y]);
  return { ref, rx, ry, onMove, onLeave };
}

function TiltCard({ children, className = "", strength = 7 }: {
  children: React.ReactNode; className?: string; strength?: number;
}) {
  const { ref, rx, ry, onMove, onLeave } = useTilt(strength);
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ── useTyped ────────────────────────────────────────── */
function useTyped(lines: string[], active: boolean, speed = 18, pause = 280) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!active || done) return;
    if (lineIdx >= lines.length) { setDone(true); return; }
    if (charIdx === 0 && lineIdx > 0) {
      const t = setTimeout(() => setCharIdx(1), pause);
      return () => clearTimeout(t);
    }
    if (charIdx <= lines[lineIdx].length) {
      const t = setTimeout(() => {
        setDisplayed(prev => { const n = [...prev]; n[lineIdx] = lines[lineIdx].slice(0, charIdx); return n; });
        setCharIdx(c => c + 1);
      }, speed);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setLineIdx(l => l + 1); setCharIdx(0); }, pause);
      return () => clearTimeout(t);
    }
  }, [active, done, lineIdx, charIdx, lines, speed, pause]);

  return displayed;
}

/* ── CopyBtn ─────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
      className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]"
      aria-label={copied ? "Copied" : "Copy"}>
      <AnimatePresence mode="wait" initial={false}>
        {copied
          ? <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}><Check size={14} className="text-[var(--green)]" aria-hidden="true" /></motion.span>
          : <motion.span key="d" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}><Copy size={14} aria-hidden="true" /></motion.span>}
      </AnimatePresence>
    </motion.button>
  );
}

/* ── ScrollProgress ──────────────────────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div style={{ scaleX, transformOrigin: "0%" }} aria-hidden="true"
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--purple)] via-[var(--green)] to-[var(--purple)] z-[100]" />
  );
}

/* ── Section ─────────────────────────────────────────── */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });
  return (
    <motion.section id={id} ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"}
      variants={stagger} className={`max-w-5xl mx-auto px-6 py-20 ${className}`}>
      {children}
    </motion.section>
  );
}

/* ── Logo ────────────────────────────────────────────── */
function LogoIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="7" r="5" stroke="#9945FF" strokeWidth="2.2" />
      <circle cx="14" cy="7" r="2.2" fill="#9945FF" fillOpacity="0.3" />
      <line x1="14" y1="12" x2="14" y2="26" stroke="#9945FF" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="6.5" y1="18" x2="21.5" y2="18" stroke="#9945FF" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M6.5 18 Q4 24 9 26" stroke="#9945FF" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M21.5 18 Q24 24 19 26" stroke="#9945FF" strokeWidth="2" strokeLinecap="round" fill="none" />
      <circle cx="23" cy="6" r="5" fill="#14F195" />
      <circle cx="23" cy="6" r="2.5" fill="#050508" />
      <rect x="21.8" y="4.8" width="2.4" height="2.4" rx="0.5" fill="#14F195" opacity="0.95" />
    </svg>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <LogoIcon size={24} />
      <span className="font-mono font-bold text-sm tracking-tight leading-none select-none">
        <span className="text-[var(--text)]">anchor</span>
        <span className="text-[var(--purple)]">.</span>
        <span className="text-[var(--green)]">debug</span>
      </span>
    </div>
  );
}

/* ── data ────────────────────────────────────────────── */
const INSTALL_CMD = "git clone https://github.com/nayrbryanGaming/anchor-debugger-skill ~/.claude/skills/anchor-debug";

const BEFORE_LOG = [
  "$ anchor test -- --nocapture 2>&1",
  "",
  "Error: custom program error: 0x1771",
  "Error Number: 6001",
  "AnchorError: account: vault",
  "Error Code: ConstraintHasOne",
  "",
  "Left:  3xQP4mNb...kNm",
  "Right: 9rAB2cDE...pLq",
  "",
  "...",
  "",
  "45 minutes of log searching.",
];

const AFTER_LOG = [
  "$ anchor test 2>&1 | claude \"debug this\"",
  "",
  "→ Error 6001: ConstraintHasOne",
  "  Account: vault",
  "  Constraint: has_one = authority",
  "",
  "  Expected: vault.authority (9rAB...)",
  "  Got:      tx.feePayer  (3xQP...)",
  "",
  "Root cause:",
  "  provider.wallet ≠ vault.authority",
  "",
  "Fix:",
  "  .signers([authorityKeypair])  ←",
  "",
  "Resolved in 11 seconds.",
];

const PAYFI_PATTERNS = [
  {
    icon: Clock,
    color: "var(--gold)",
    title: "Clock drift in locked escrow",
    body: "Time-locked escrow fails when unix_timestamp isn't read from the same Clock::get() call. The skill detects the drift point and shows the canonical fix.",
    tag: "payfi-cu-pitfalls.md",
  },
  {
    icon: DollarSign,
    color: "var(--green)",
    title: "Rent threshold in streaming",
    body: "Streaming accounts that hold lamports too long hit rent-exemption floor during payouts. Diagnosed and flagged before it costs you SOL or a stuck stream.",
    tag: "payfi-overview.md",
  },
  {
    icon: Zap,
    color: "var(--purple)",
    title: "Silent CPI failure in payouts",
    body: "Failed CPIs in streaming payout instructions are swallowed silently — stream stays ACTIVE, recipient goes unpaid for hours. The skill surfaces the stall and fixes the error propagation.",
    tag: "payfi-tx-debugging.md",
  },
  {
    icon: Code2,
    color: "#3b82f6",
    title: "x402 agent payment timing",
    body: "Agent-to-agent x402 payments require settlement coordination across multiple CPI hops. The skill validates payment flows and slot windows before they fail on-chain.",
    tag: "payfi-simulation.md",
  },
  {
    icon: Shield,
    color: "#ef4444",
    title: "Upgrade safety for live programs",
    body: "Removing or reordering instructions on a program with active deposits shifts discriminators — clients break and funds are at risk. The skill generates a safe migration checklist.",
    tag: "upgrade-safety.md",
  },
];

const PROBLEMS = [
  { icon: AlertCircle, color: "#ef4444", title: "Error codes without context", body: "Anchor throws InstructionError::Custom(6001) and logs stop. Tracing which constraint fired costs 20–45 minutes of manual work." },
  { icon: Cpu, color: "var(--purple)", title: "Compute budget overruns", body: "Programs hit 200k CU mid-instruction with no breakdown of which handler consumed the most compute units." },
  { icon: Clock, color: "var(--gold)", title: "Clock and rent edge cases", body: "PayFi contracts fail when unix_timestamp drifts or escrow accounts approach rent thresholds mid-stream." },
  { icon: Shield, color: "#3b82f6", title: "Upgrade risk on live programs", body: "Migrating instruction handlers with active deposits puts funds at risk if a single discriminator shift is missed." },
  { icon: Zap, color: "var(--gold)", title: "Priority fee misses", body: "Setting fees without knowing slot compute demand leads to failed inclusion or 10x overpayment on priority." },
  { icon: DollarSign, color: "var(--green)", title: "Streaming payment stalls", body: "A swallowed CPI error in a streaming contract leaves recipient state permanently stuck between slot updates." },
];

const ANCHOR_FILES = [
  { name: "SKILL.md", desc: "Router — selects the right sub-skill per query" },
  { name: "tx-debugging.md", desc: "Transaction decode and instruction log parsing" },
  { name: "error-catalog.md", desc: "300+ Anchor error codes with root causes and fixes" },
  { name: "compute-optimization.md", desc: "CU profiling, hotspot detection, budget sizing" },
  { name: "upgrade-safety.md", desc: "Live program migration and discriminator checklist" },
  { name: "simulation.md", desc: "Pre-flight simulation against mainnet state" },
  { name: "common-pitfalls.md", desc: "PDA derivation, serialization, signer errors" },
];

const PAYFI_FILES = [
  { name: "payfi-overview.md", desc: "Escrow, streaming, x402 agent payment patterns" },
  { name: "payfi-tx-debugging.md", desc: "PayFi-specific CPI decode and log trace" },
  { name: "payfi-patterns.md", desc: "Yield-bearing, conditional, split-payment flows" },
  { name: "payfi-cu-pitfalls.md", desc: "High-frequency payment CU edge cases" },
  { name: "payfi-simulation.md", desc: "Stablecoin settlement and stream simulation" },
];

/* ── NAV ─────────────────────────────────────────────── */
function Nav() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 60], ["rgba(5,5,8,0)", "rgba(5,5,8,0.92)"]);
  const bd = useTransform(scrollY, [0, 60], ["rgba(24,24,42,0)", "rgba(24,24,42,1)"]);

  return (
    <motion.header style={{ backgroundColor: bg, borderBottomColor: bd }}
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md flex items-center justify-between px-6 h-14">
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <Logo />
      </motion.div>
      <motion.nav initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.08 }}
        className="flex items-center gap-4" aria-label="Site navigation">
        <a href="#payfi" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden md:block">PayFi</a>
        <a href="#problems" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden md:block">Problems</a>
        <a href="#features" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden md:block">Skills</a>
        <Link href="/demo" className="text-sm font-semibold text-[var(--green)] hover:text-[var(--text)] transition-colors hidden md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] rounded">
          Demo →
        </Link>
        <motion.a href="https://github.com/nayrbryanGaming/anchor-debugger-skill"
          target="_blank" rel="noopener noreferrer"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 text-[var(--text)] hover:border-[var(--purple)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]">
          <GitBranch size={12} aria-hidden="true" /> GitHub
        </motion.a>
      </motion.nav>
    </motion.header>
  );
}

/* ── HERO ─────────────────────────────────────────────── */
function BeforeTerminal() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const lines = useTyped(BEFORE_LOG, inView, 22, 200);
  return (
    <div ref={ref} className="terminal-block h-full relative overflow-hidden border-[rgba(239,68,68,0.2)]">
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#ef4444] to-transparent opacity-30 animate-scan-line pointer-events-none" aria-hidden="true" />
      <div className="terminal-dots mb-3" aria-hidden="true" />
      <div className="absolute top-3 right-3 text-[9px] font-mono text-[#ef4444] opacity-60 uppercase tracking-widest">before</div>
      <div className="font-mono text-[10.5px] leading-[1.7] space-y-0 overflow-hidden" role="log" aria-label="Error output before using skill">
        {BEFORE_LOG.map((line, i) => {
          const shown = lines[i] ?? "";
          const isCmd = line.startsWith("$");
          const isError = line.toLowerCase().includes("error") || line.includes("Failed");
          const isAddr = line.startsWith("Left") || line.startsWith("Right");
          const isDots = line === "...";
          const isSad = line.includes("45 minutes");
          const cls = isCmd ? "text-[var(--muted)]"
            : isError ? "text-[#ef4444]"
            : isAddr ? "text-[var(--gold)]"
            : isDots ? "text-[var(--border)]"
            : isSad ? "text-[#ef4444] opacity-70 italic"
            : "text-[var(--muted)] opacity-60";
          const isCurrent = i === Math.min(lines.length - 1, BEFORE_LOG.length - 1);
          return (
            <div key={i} className={cls}>
              {shown || (line === "" ? " " : "")}
              {isCurrent && shown.length < line.length && <span className="animate-blink opacity-60">▋</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AfterTerminal() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [start, setStart] = useState(false);
  useEffect(() => {
    if (inView) { const t = setTimeout(() => setStart(true), 1400); return () => clearTimeout(t); }
  }, [inView]);
  const lines = useTyped(AFTER_LOG, start, 16, 160);
  return (
    <div ref={ref} className="terminal-block h-full relative overflow-hidden border-[rgba(20,241,149,0.2)]">
      <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--green)] to-transparent opacity-40 animate-scan-line pointer-events-none" aria-hidden="true" />
      <div className="terminal-dots mb-3" aria-hidden="true" />
      <div className="absolute top-3 right-3 text-[9px] font-mono text-[var(--green)] opacity-70 uppercase tracking-widest">with anchor.debug</div>
      <div className="font-mono text-[10.5px] leading-[1.7] space-y-0 overflow-hidden" role="log" aria-label="Skill output showing fix">
        {AFTER_LOG.map((line, i) => {
          const shown = lines[i] ?? "";
          const isCmd = line.startsWith("$");
          const isArrow = line.startsWith("→") || line.startsWith("  →");
          const isRoot = line.startsWith("Root") || line.startsWith("Fix:");
          const isIndent = line.startsWith("  ") && !isArrow;
          const isFix = line.includes("←");
          const isResolved = line.startsWith("Resolved");
          const isEmpty = line === "";
          const cls = isCmd ? "text-[var(--green)]"
            : isArrow ? "text-[var(--green)]"
            : isRoot ? "text-[var(--text)] font-semibold"
            : isFix ? "text-[var(--green)] font-semibold"
            : isResolved ? "text-[var(--green)] opacity-90 font-semibold"
            : isIndent ? "text-[var(--muted)]"
            : isEmpty ? "text-transparent" : "text-[var(--muted)]";
          const isCurrent = i === Math.min(lines.length - 1, AFTER_LOG.length - 1);
          return (
            <div key={i} className={cls}>
              {shown || (isEmpty ? " " : "")}
              {isCurrent && shown.length < line.length && <span className="animate-blink">▋</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-14 pb-16">
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.28] animate-grid-pulse" aria-hidden="true" />
      <ParticleCanvas />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="orb-a absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full opacity-[0.10] blur-[130px] bg-[#9945FF]" />
        <div className="orb-b absolute -bottom-60 -left-60 w-[500px] h-[500px] rounded-full opacity-[0.08] blur-[110px] bg-[#14F195]" />
      </div>
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#9945FF] to-transparent opacity-30 animate-scan-line" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-auto px-6">

        {/* Top — centered headline */}
        <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center mb-10">
          <motion.div variants={scaleIn}
            className="mb-7 inline-flex items-center gap-2 border border-[var(--border)] rounded-full px-4 py-1.5 text-xs text-[var(--muted)] bg-[rgba(12,12,20,0.8)] backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" aria-hidden="true" />
            PayFi era &nbsp;·&nbsp; Solana AI Kit &nbsp;·&nbsp; Superteam Brasil Bounty
          </motion.div>

          <motion.h1 variants={clipReveal}
            className="font-display font-bold text-5xl md:text-[68px] leading-none tracking-tight mb-5">
            Anchor errors,<br />
            <span className="text-[var(--green)]">fixed in seconds.</span>
          </motion.h1>

          <motion.p variants={fadeUp}
            className="text-[var(--muted)] text-lg max-w-2xl mx-auto leading-relaxed mb-3">
            The only Claude Code skill that combines Anchor error diagnosis with PayFi-specific patterns — escrow timing, streaming CPI failures, x402 agent payments, and upgrade safety for programs with active deposits.
          </motion.p>

          {/* Benchmark callout */}
          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[rgba(20,241,149,0.08)] border border-[rgba(20,241,149,0.2)] text-xs font-mono text-[var(--green)]">
            45 min → under 4 min &nbsp;·&nbsp; root cause, tested on 12 real mainnet failures
          </motion.div>
        </motion.div>

        {/* Before / After terminals — the "holy shit" moment */}
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="grid md:grid-cols-2 gap-4 mb-8"
          aria-label="Before and after comparison"
        >
          <TiltCard strength={4} className="h-full">
            <BeforeTerminal />
          </TiltCard>

          {/* Arrow between */}
          <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.9, type: "spring", bounce: 0.5 }}
              className="w-8 h-8 rounded-full bg-[var(--surface)] border border-[var(--purple)] flex items-center justify-center shadow-[0_0_20px_rgba(153,69,255,0.4)]"
              aria-hidden="true"
            >
              <ArrowRight size={13} className="text-[var(--purple)]" />
            </motion.div>
          </div>

          <TiltCard strength={4} className="h-full">
            <AfterTerminal />
          </TiltCard>
        </motion.div>

        {/* Mobile arrow */}
        <div className="md:hidden flex items-center justify-center gap-3 mb-4 font-mono text-xs text-[var(--muted)]">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <span className="text-[var(--purple)]">↓ with anchor.debug</span>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* Install command */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto mb-3 relative"
        >
          <div className="absolute -inset-3 rounded-2xl bg-[#9945FF] opacity-[0.1] blur-2xl pointer-events-none" aria-hidden="true" />
          <div className="terminal-block relative">
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--purple)] to-transparent opacity-40 animate-scan-line pointer-events-none" aria-hidden="true" />
            <div className="terminal-dots mb-3" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3">
              <code className="font-mono text-sm text-[var(--green)] break-all flex-1">{INSTALL_CMD}</code>
              <CopyBtn text={INSTALL_CMD} />
            </div>
          </div>
        </motion.div>

        {/* "Then in Claude" */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.68, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto mb-9 p-3.5 rounded-xl border border-[var(--border)] bg-[rgba(12,12,20,0.7)] font-mono text-xs text-left space-y-1"
          aria-label="Usage example"
        >
          <div className="text-[var(--muted)]">Then in Claude:</div>
          <div className="text-[var(--green)]">$ anchor test 2&gt;&amp;1 | claude &quot;debug this&quot;</div>
          <div className="text-[var(--muted)] opacity-60 flex items-center gap-1.5">
            <ArrowRight size={9} aria-hidden="true" />
            reads logs, maps the error, returns the fix
          </div>
        </motion.div>

        {/* CTAs + stats */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.78, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-6"
        >
          <div className="flex flex-wrap items-center justify-center gap-3">
            <motion.div whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(20,241,149,0.3)" }} whileTap={{ scale: 0.97 }}>
              <Link href="/demo"
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--green)] text-[var(--bg)] font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]">
                <Play size={14} aria-hidden="true" className="fill-[var(--bg)]" /> Try demo — no install
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
              <a href="https://github.com/nayrbryanGaming/anchor-debugger-skill"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:border-[var(--purple)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]">
                <GitBranch size={14} aria-hidden="true" /> View on GitHub
              </a>
            </motion.div>
          </div>

          <motion.div initial="hidden" animate="visible" variants={stagger}
            className="flex flex-wrap items-center justify-center gap-10" aria-label="Key stats">
            {[["11", "skill files"], ["300+", "error codes"], ["5", "PayFi patterns"], ["< 4 min", "avg to fix"]].map(
              ([v, l], i) => (
                <motion.div key={l} variants={fadeIn} custom={i} className="flex flex-col items-center">
                  <span className="font-bold text-2xl text-[var(--text)]">{v}</span>
                  <span className="text-xs text-[var(--muted)] mt-0.5">{l}</span>
                </motion.div>
              )
            )}
          </motion.div>
        </motion.div>

        {/* Floating PR badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.3, type: "spring", bounce: 0.4 }}
          className="floating-badge absolute top-20 right-4 md:right-8 bg-[var(--surface)] border border-[var(--green)] rounded-lg px-2.5 py-1 text-[10px] font-mono text-[var(--green)] flex items-center gap-1.5"
          aria-label="PR #21 live">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" aria-hidden="true" />
          PR #21 · live
        </motion.div>
      </div>
    </section>
  );
}

/* ── PAYFI WAVE ──────────────────────────────────────── */
function PayFiWave() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <motion.section id="payfi" ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"}
      variants={stagger} className="relative overflow-hidden py-20">

      {/* Subtle green atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full opacity-[0.04] blur-[100px] bg-[#14F195]" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6">
        {/* Header */}
        <div className="max-w-2xl mb-14">
          <motion.p variants={fadeIn} className="tag-green mb-4 inline-block">PayFi layer</motion.p>
          <motion.h2 variants={clipReveal} className="font-display font-bold text-3xl md:text-[42px] leading-tight mb-5">
            The PayFi stack has<br />new failure modes.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[var(--muted)] text-sm leading-relaxed">
            Standard Anchor debugging tools were built for stateless programs. PayFi contracts hold real money across time — streaming payments, escrow positions, x402 agent flows — and they fail in ways no generic debugger covers.
            This skill was built specifically for the programs that move real value on Solana.
          </motion.p>
        </div>

        {/* Pattern cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {PAYFI_PATTERNS.map((p, i) => {
            const Icon = p.icon;
            return (
              <TiltCard key={p.title} className="card-3d glow-border p-5 rounded-xl h-full" strength={6}>
                <motion.div variants={scaleIn} custom={i} className="h-full">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: `${p.color}18`, border: `1px solid ${p.color}38` }}>
                      <Icon size={16} style={{ color: p.color }} aria-hidden="true" />
                    </div>
                    <code className="text-[9px] font-mono text-[var(--muted)] opacity-70">{p.tag}</code>
                  </div>
                  <h3 className="font-semibold text-sm mb-2 text-[var(--text)]">{p.title}</h3>
                  <p className="text-xs text-[var(--muted)] leading-relaxed">{p.body}</p>
                </motion.div>
              </TiltCard>
            );
          })}

          {/* CTA card */}
          <TiltCard className="card-3d p-5 rounded-xl border border-[var(--green)] bg-[rgba(20,241,149,0.04)] h-full flex flex-col justify-between" strength={6}>
            <motion.div variants={scaleIn} custom={5} className="h-full flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 bg-[rgba(20,241,149,0.12)] border border-[rgba(20,241,149,0.3)]">
                  <Layers size={16} className="text-[var(--green)]" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-sm mb-2 text-[var(--green)]">Try a real PayFi scenario</h3>
                <p className="text-xs text-[var(--muted)] leading-relaxed">
                  The /demo playground includes all 5 PayFi patterns. Run them without installing anything.
                </p>
              </div>
              <motion.div className="mt-5">
                <Link href="/demo"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--green)] hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] rounded">
                  Open playground <ChevronRight size={12} aria-hidden="true" />
                </Link>
              </motion.div>
            </motion.div>
          </TiltCard>
        </div>

        {/* Pull quote */}
        <motion.div variants={fadeUp}
          className="max-w-3xl mx-auto p-6 rounded-2xl border border-[var(--border)] bg-[rgba(12,12,20,0.6)] text-center">
          <p className="text-[var(--text)] text-lg font-semibold leading-relaxed mb-2">
            "The only skill that combines Anchor error diagnosis with PayFi-specific patterns used in production payment rails."
          </p>
          <p className="text-xs text-[var(--muted)] font-mono">anchor.debug · 11 skill files · MIT license</p>
        </motion.div>
      </div>
    </motion.section>
  );
}

/* ── DEMO PREVIEW ────────────────────────────────────── */
const DEMO_STEPS = [
  { icon: Search, color: "var(--muted)", label: "Parsing error code", detail: "0x1771 → decimal 6001 → ConstraintHasOne" },
  { icon: AlertCircle, color: "var(--purple)", label: "Account located", detail: "vault — constraint: has_one = authority" },
  { icon: Wrench, color: "var(--green)", label: "Fix identified", detail: "Pass authorityKeypair, not provider.wallet" },
];

function DemoPreview() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <motion.section ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger}
      className="max-w-5xl mx-auto px-6 py-16">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        {/* Left */}
        <div>
          <motion.p variants={fadeIn} className="tag-purple mb-4 inline-block">Live playground</motion.p>
          <motion.h2 variants={clipReveal} className="font-display font-bold text-3xl md:text-4xl mb-4 leading-tight">
            See it work before you install.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[var(--muted)] text-sm leading-relaxed mb-6">
            Six error scenarios from real Anchor programs. Pick one, read the error log, click Run Analysis, and watch the skill trace root cause step by step then generate a targeted fix.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col gap-2.5 text-sm text-[var(--muted)] mb-8">
            {["Constraint violations — exact keypair mismatch identified", "Compute budget overruns — per-instruction CU breakdown", "PayFi rent edge cases, streaming stalls, and PDA mismatches"].map(item => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 size={13} className="text-[var(--green)] mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span className="text-xs">{item}</span>
              </div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp}>
            <motion.div whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(153,69,255,0.3)" }} whileTap={{ scale: 0.97 }}>
              <Link href="/demo"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--purple)] text-white font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]">
                Open playground <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Right: mini simulation */}
        <TiltCard className="relative" strength={5}>
          <motion.div variants={scaleIn}>
            <div className="absolute -inset-4 rounded-2xl bg-[#9945FF] opacity-[0.07] blur-2xl pointer-events-none" aria-hidden="true" />
            <div className="terminal-block relative overflow-hidden">
              <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--purple)] to-transparent opacity-40 animate-scan-line pointer-events-none" aria-hidden="true" />
              <div className="terminal-dots mb-4" aria-hidden="true" />
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={11} className="text-[#ef4444]" aria-hidden="true" />
                <span className="font-mono text-[10px] text-[var(--muted)]">Scenario: Constraint Violation · Error 6001</span>
              </div>
              <div className="font-mono text-[10px] space-y-0.5 mb-4 opacity-80" aria-label="Sample error">
                {[
                  { t: "cmd", v: "$ anchor test 2>&1" },
                  { t: "err", v: "  custom program error: 0x1771" },
                  { t: "err", v: "  Error Code: ConstraintHasOne (6001)" },
                  { t: "acc", v: "  Account: vault" },
                ].map((l, i) => (
                  <div key={i} className={l.t === "cmd" ? "text-[var(--green)]" : l.t === "err" ? "text-[#ef4444]" : "text-[var(--gold)]"}>{l.v}</div>
                ))}
              </div>
              <div className="border-t border-[var(--border)] pt-4 space-y-2.5">
                {DEMO_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div key={step.label} initial={{ opacity: 0, x: -12 }}
                      animate={inView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.7 + i * 0.3, duration: 0.4 }}
                      className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0" style={{ color: step.color }}>
                        <Icon size={10} aria-hidden="true" />
                      </div>
                      <div>
                        <div className="text-[10px] font-semibold text-[var(--text)]">{step.label}</div>
                        <div className="text-[10px] font-mono text-[var(--muted)]">{step.detail}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <motion.div initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 2.0 }}
                className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="font-mono text-[9px] text-[var(--green)]">root cause found · fix ready</span>
                <span className="font-mono text-[9px] text-[var(--muted)]">5 more scenarios →</span>
              </motion.div>
            </div>
          </motion.div>
        </TiltCard>
      </div>
    </motion.section>
  );
}

/* ── PROBLEMS ────────────────────────────────────────── */
function ProblemCard({ p, i }: { p: typeof PROBLEMS[number]; i: number }) {
  const Icon = p.icon;
  return (
    <TiltCard className="card-3d glow-border p-5 rounded-xl h-full" strength={7}>
      <motion.div variants={scaleIn} custom={i} className="h-full">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
          style={{ background: `${p.color}18`, border: `1px solid ${p.color}38` }}>
          <Icon size={16} style={{ color: p.color }} aria-hidden="true" />
        </div>
        <h3 className="font-semibold text-sm mb-2 text-[var(--text)]">{p.title}</h3>
        <p className="text-xs text-[var(--muted)] leading-relaxed">{p.body}</p>
      </motion.div>
    </TiltCard>
  );
}

function Problems() {
  return (
    <Section id="problems">
      <motion.p variants={fadeIn} className="tag-green mb-4 inline-block">Common issues</motion.p>
      <motion.h2 variants={clipReveal} className="font-display font-bold text-3xl md:text-4xl mb-4">
        What slows down Anchor development
      </motion.h2>
      <motion.p variants={fadeUp} className="text-[var(--muted)] mb-12 max-w-xl leading-relaxed text-sm">
        Six issues that come up every week in Anchor and PayFi projects. Each has a dedicated sub-skill file that Claude loads automatically.
      </motion.p>
      <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROBLEMS.map((p, i) => <ProblemCard key={p.title} p={p} i={i} />)}
      </motion.div>
    </Section>
  );
}

/* ── FEATURES ────────────────────────────────────────── */
function SkillFileCard({ f, i }: { f: { name: string; desc: string }; i: number }) {
  return (
    <TiltCard className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--purple)] transition-colors" strength={5}>
      <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06, duration: 0.45 }} className="flex items-start gap-3 w-full">
        <Code2 size={13} className="text-[var(--purple)] mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div>
          <div className="font-mono text-xs text-[var(--green)] mb-1">{f.name}</div>
          <div className="text-xs text-[var(--muted)] leading-relaxed">{f.desc}</div>
        </div>
      </motion.div>
    </TiltCard>
  );
}

function Features() {
  const [tab, setTab] = useState<"anchor" | "payfi">("anchor");
  const files = tab === "anchor" ? ANCHOR_FILES : PAYFI_FILES;

  return (
    <Section id="features">
      <motion.p variants={fadeIn} className="tag-purple mb-4 inline-block">Skill files</motion.p>
      <motion.h2 variants={clipReveal} className="font-display font-bold text-3xl md:text-4xl mb-4">
        Two layers. One skill.
      </motion.h2>
      <motion.p variants={fadeUp} className="text-[var(--muted)] mb-8 max-w-xl leading-relaxed text-sm">
        Anchor debugging layer for general development. PayFi layer for programs that move real money.
        Claude picks the right files based on your query — no configuration needed.
      </motion.p>

      <motion.div variants={fadeIn} role="tablist" aria-label="Skill layer"
        className="flex gap-1 bg-[var(--surface)] p-1 rounded-lg w-fit mb-8 border border-[var(--border)]">
        {(["anchor", "payfi"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} role="tab" aria-selected={tab === t}
            className="relative px-5 py-2 text-sm rounded-md font-medium transition-colors z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]"
            style={{ color: tab === t ? "var(--text)" : "var(--muted)" }}>
            {tab === t && (
              <motion.span layoutId="feat-tab"
                className="absolute inset-0 bg-[var(--surface2)] rounded-md border border-[var(--border)]"
                transition={{ type: "spring", bounce: 0.22, duration: 0.38 }} />
            )}
            <span className="relative z-10">{t === "anchor" ? "Anchor layer" : "PayFi layer"}</span>
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.28 }}
          className="grid sm:grid-cols-2 gap-3" role="tabpanel">
          {files.map((f, i) => <SkillFileCard key={f.name} f={f} i={i} />)}
        </motion.div>
      </AnimatePresence>
    </Section>
  );
}

/* ── FINAL CTA ───────────────────────────────────────── */
function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <motion.section ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger}
      className="max-w-3xl mx-auto px-6 py-20 text-center">
      <motion.h2 variants={clipReveal} className="font-display font-bold text-3xl md:text-4xl mb-4">
        Ready to debug like a pro in the PayFi era?
      </motion.h2>
      <motion.p variants={fadeUp} className="text-[var(--muted)] text-sm mb-10 leading-relaxed max-w-xl mx-auto">
        Install in 10 seconds. Works in any Claude Code session. Covers every failure mode in the Anchor and PayFi stack.
      </motion.p>

      <motion.div variants={scaleIn} className="max-w-xl mx-auto mb-6 relative">
        <div className="absolute -inset-3 rounded-2xl bg-[#9945FF] opacity-[0.1] blur-2xl pointer-events-none" aria-hidden="true" />
        <div className="terminal-block relative">
          <div className="terminal-dots mb-3" aria-hidden="true" />
          <div className="flex items-center justify-between gap-3">
            <code className="font-mono text-xs text-[var(--green)] break-all flex-1">{INSTALL_CMD}</code>
            <CopyBtn text={INSTALL_CMD} />
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
        <motion.div whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(20,241,149,0.3)" }} whileTap={{ scale: 0.97 }}>
          <Link href="/demo"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--green)] text-[var(--bg)] font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]">
            <Play size={14} aria-hidden="true" className="fill-[var(--bg)]" /> Try demo first
          </Link>
        </motion.div>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <a href="https://github.com/nayrbryanGaming/anchor-debugger-skill"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:border-[var(--purple)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]">
            <GitBranch size={14} aria-hidden="true" /> Star the repo
          </a>
        </motion.div>
        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <a href="https://github.com/solanabr/skill-bounty/pull/21"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--muted)] font-semibold text-sm hover:border-[var(--green)] hover:text-[var(--green)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]">
            <ExternalLink size={14} aria-hidden="true" /> PR #21
          </a>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}

/* ── FOOTER ──────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-[var(--border)] mt-4">
      <div className="max-w-5xl mx-auto px-6 py-10 flex flex-col sm:flex-row items-center justify-between gap-6">
        <Logo />
        <div className="flex items-center gap-6 text-sm text-[var(--muted)]">
          {[
            { href: "https://github.com/nayrbryanGaming/anchor-debugger-skill", label: "GitHub", icon: GitBranch },
            { href: "https://github.com/sendaifun/solana-agent-kit", label: "Solana AI Kit", icon: ExternalLink },
            { href: "https://github.com/solanabr/skill-bounty/pull/21", label: "PR #21", icon: ExternalLink },
          ].map(({ href, label, icon: Icon }) => (
            <motion.a key={label} href={href} target="_blank" rel="noopener noreferrer"
              whileHover={{ color: "var(--text)" }}
              className="flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] rounded">
              <Icon size={12} aria-hidden="true" /> {label}
            </motion.a>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">MIT &middot; Superteam Brasil 2025</p>
      </div>
    </footer>
  );
}

/* ── PAGE ────────────────────────────────────────────── */
export default function Page() {
  return (
    <main className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      <ScrollProgress />
      <Nav />
      <Hero />
      <PayFiWave />
      <DemoPreview />
      <Problems />
      <Features />
      <FinalCTA />
      <Footer />
    </main>
  );
}
