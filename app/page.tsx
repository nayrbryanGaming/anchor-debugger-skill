"use client";

import dynamic from "next/dynamic";
import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  AnimatePresence,
  useMotionValue,
  useSpring,
} from "framer-motion";
import {
  AlertCircle, ArrowRight, Check, Clock, Code2, Copy,
  Cpu, DollarSign, ExternalLink, GitBranch, Shield, Zap, Play,
  CheckCircle2, Wrench, Search,
} from "lucide-react";

const ParticleCanvas = dynamic(() => import("@/components/ParticleCanvas"), { ssr: false });

/* ── animation variants ──────────────────────────────── */
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
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

/* ── useTilt ─────────────────────────────────────────── */
function useTilt(strength = 8) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(x, { stiffness: 280, damping: 32 });
  const ry = useSpring(y, { stiffness: 280, damping: 32 });
  const onMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      x.set(((e.clientY - r.top - r.height / 2) / (r.height / 2)) * strength);
      y.set((-(e.clientX - r.left - r.width / 2) / (r.width / 2)) * strength);
    },
    [x, y, strength]
  );
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

/* ── CopyBtn ─────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="p-2 rounded-lg text-[var(--muted)] hover:text-[var(--text)] transition-colors flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]"
      aria-label={copied ? "Copied" : "Copy command"}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
            <Check size={14} className="text-[var(--green)]" aria-hidden="true" />
          </motion.span>
        ) : (
          <motion.span key="d" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
            <Copy size={14} aria-hidden="true" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ── ScrollProgress ──────────────────────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "0%" }}
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--purple)] via-[var(--green)] to-[var(--purple)] z-[100]"
      aria-hidden="true"
    />
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

const PROBLEMS = [
  { icon: AlertCircle, color: "#ef4444", title: "Error codes without context", body: "Anchor throws InstructionError::Custom(6001) and logs stop. Tracing which constraint fired costs 20 minutes of manual work." },
  { icon: Cpu, color: "var(--purple)", title: "Compute budget overruns", body: "Programs hit 200k CU mid-instruction with no breakdown of which handler consumed the most compute." },
  { icon: Clock, color: "var(--gold)", title: "Clock and rent edge cases", body: "PayFi contracts fail when unix_timestamp drifts or escrow accounts approach rent thresholds under load." },
  { icon: Shield, color: "#3b82f6", title: "Upgrade risk on live programs", body: "Migrating instruction handlers on a program with active deposits puts funds at risk if a single constraint is missed." },
  { icon: Zap, color: "var(--gold)", title: "Priority fee misses", body: "Setting fees without knowing slot compute demand leads to failed inclusion or 10x overpayment on priority." },
  { icon: DollarSign, color: "var(--green)", title: "Streaming payment stalls", body: "A failed CPI call in a streaming contract can leave recipient state permanently stuck between slot updates." },
];

const ANCHOR_FILES = [
  { name: "SKILL.md", desc: "Router — selects the right sub-skill per query" },
  { name: "tx-debugging.md", desc: "Transaction decode and log parsing" },
  { name: "error-catalog.md", desc: "300+ Anchor error codes with root causes" },
  { name: "compute-optimization.md", desc: "CU profiling and budget sizing" },
  { name: "upgrade-safety.md", desc: "Live program migration checklist" },
  { name: "simulation.md", desc: "Pre-flight simulation against mainnet state" },
  { name: "common-pitfalls.md", desc: "PDA derivation, serialization, signer errors" },
];

const PAYFI_FILES = [
  { name: "payfi-overview.md", desc: "Escrow, streaming, x402 payment patterns" },
  { name: "payfi-tx-debugging.md", desc: "PayFi-specific CPI and log decode" },
  { name: "payfi-patterns.md", desc: "Yield-bearing, conditional, split-payment flows" },
  { name: "payfi-cu-pitfalls.md", desc: "High-frequency payment CU edge cases" },
  { name: "payfi-simulation.md", desc: "Stablecoin settlement simulation" },
];

const DEMO_STEPS = [
  { icon: Search, color: "var(--muted)", label: "Parsing error code", detail: "0x1771 → decimal 6001 → ConstraintHasOne" },
  { icon: AlertCircle, color: "var(--purple)", label: "Account located", detail: "vault — constraint: has_one = authority" },
  { icon: Wrench, color: "var(--green)", label: "Fix identified", detail: "Pass authorityKeypair, not provider.wallet" },
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
        className="flex items-center gap-4">
        <a href="#problems" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden md:block">Problems</a>
        <a href="#features" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden md:block">Skills</a>
        <Link href="/demo" className="text-sm font-semibold text-[var(--green)] hover:text-[var(--text)] transition-colors hidden md:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] rounded">Demo →</Link>
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

/* ── HERO — minimal, install-command centered ────────── */
function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-14 pb-20">
      {/* Grid background */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.32] animate-grid-pulse" aria-hidden="true" />

      {/* Particle canvas */}
      <ParticleCanvas />

      {/* Orbs — subtle accent */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="orb-a absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full opacity-[0.11] blur-[130px] bg-[#9945FF]" />
        <div className="orb-b absolute -bottom-60 -left-60 w-[500px] h-[500px] rounded-full opacity-[0.09] blur-[110px] bg-[#14F195]" />
      </div>

      {/* Scan line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#9945FF] to-transparent opacity-35 animate-scan-line" />
      </div>

      {/* Center-aligned content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center w-full">

        {/* Badge */}
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          className="mb-8 inline-flex items-center gap-2 border border-[var(--border)] rounded-full px-3.5 py-1.5 text-xs text-[var(--muted)] bg-[rgba(12,12,20,0.7)] backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" aria-hidden="true" />
          Superteam Brasil Bounty &nbsp;&middot;&nbsp; Solana AI Kit
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, clipPath: "inset(0 0 100% 0)" }}
          animate={{ opacity: 1, clipPath: "inset(0 0 0% 0)" }}
          transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="font-display font-bold text-5xl md:text-7xl leading-none mb-6 tracking-tight">
          Debug Anchor.<br />
          <span className="text-[var(--purple)]">Ship faster.</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="text-[var(--muted)] text-lg mb-10 max-w-xl mx-auto leading-relaxed">
          A Claude Code skill that reads failed Anchor transactions and returns the exact constraint that broke — with a fix.
        </motion.p>

        {/* Install command — FRONT AND CENTER */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="relative max-w-2xl mx-auto mb-3"
        >
          {/* Glow behind terminal */}
          <div className="absolute -inset-3 rounded-2xl bg-[#9945FF] opacity-[0.12] blur-2xl pointer-events-none" aria-hidden="true" />

          <div className="terminal-block relative">
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--purple)] to-transparent opacity-50 animate-scan-line pointer-events-none" aria-hidden="true" />
            <div className="terminal-dots mb-4" aria-hidden="true" />
            <div className="flex items-center justify-between gap-3">
              <code className="font-mono text-sm text-[var(--green)] break-all flex-1 text-left">
                {INSTALL_CMD}
              </code>
              <CopyBtn text={INSTALL_CMD} />
            </div>
          </div>
        </motion.div>

        {/* "Then in Claude" block */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.58, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-2xl mx-auto mb-10 p-4 rounded-xl border border-[var(--border)] bg-[rgba(12,12,20,0.7)] font-mono text-xs text-left space-y-1.5"
          aria-label="Usage example"
        >
          <div className="text-[var(--muted)]">Then in Claude:</div>
          <div className="text-[var(--green)]">$ anchor test 2&gt;&amp;1 | claude &quot;debug this&quot;</div>
          <div className="text-[var(--muted)] opacity-70 flex items-center gap-1.5">
            <ArrowRight size={10} aria-hidden="true" />
            reads logs, maps the error, returns the fix
          </div>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.68, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-wrap items-center justify-center gap-3 mb-14"
        >
          <motion.div whileHover={{ scale: 1.04, boxShadow: "0 0 24px rgba(20,241,149,0.3)" }} whileTap={{ scale: 0.97 }}>
            <Link href="/demo"
              className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--green)] text-[var(--bg)] font-bold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--green)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]">
              <Play size={14} aria-hidden="true" className="fill-[var(--bg)]" />
              Try demo
            </Link>
          </motion.div>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <a href="https://github.com/nayrbryanGaming/anchor-debugger-skill"
              target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:border-[var(--purple)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]">
              <GitBranch size={14} aria-hidden="true" /> GitHub
            </a>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="flex flex-wrap items-center justify-center gap-10"
          aria-label="Key metrics"
        >
          {[["11", "skill files"], ["300+", "error codes"], ["5", "PayFi patterns"], ["MIT", "license"]].map(
            ([v, l], i) => (
              <motion.div key={l} variants={fadeIn} custom={i} className="flex flex-col items-center">
                <span className="font-bold text-2xl text-[var(--text)]">{v}</span>
                <span className="text-xs text-[var(--muted)] mt-0.5">{l}</span>
              </motion.div>
            )
          )}
        </motion.div>

        {/* Floating PR badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.2, type: "spring", bounce: 0.4 }}
          className="floating-badge absolute top-24 right-4 md:right-12 bg-[var(--surface)] border border-[var(--green)] rounded-lg px-2.5 py-1 text-[10px] font-mono text-[var(--green)] flex items-center gap-1.5"
          aria-label="PR #21 is live"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" aria-hidden="true" />
          PR #21 · live
        </motion.div>
      </div>
    </section>
  );
}

/* ── DEMO PREVIEW ────────────────────────────────────── */
function DemoPreview() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <motion.section ref={ref} initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger}
      className="max-w-5xl mx-auto px-6 py-16">

      <div className="grid md:grid-cols-2 gap-10 items-center">
        {/* Left: copy */}
        <div>
          <motion.p variants={fadeIn} className="tag-green mb-4 inline-block">Live playground</motion.p>
          <motion.h2 variants={clipReveal} className="font-display font-bold text-3xl md:text-4xl mb-4 leading-tight">
            See it work before you install.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[var(--muted)] text-sm leading-relaxed mb-6">
            Six real error scenarios from production Anchor programs. Pick one, read the log, click Run Analysis, and watch the skill trace root cause step by step.
          </motion.p>
          <motion.div variants={fadeUp} className="flex flex-col gap-3 text-sm text-[var(--muted)]">
            {[
              "Constraint violations with exact keypair mismatch",
              "Compute budget overruns with per-instruction breakdown",
              "PDA seed mismatches, PayFi rent edge cases, and more",
            ].map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 size={14} className="text-[var(--green)] mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{item}</span>
              </div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} className="mt-8">
            <motion.div whileHover={{ scale: 1.03, boxShadow: "0 0 24px rgba(153,69,255,0.3)" }} whileTap={{ scale: 0.97 }}>
              <Link href="/demo"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--purple)] text-white font-semibold text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]">
                Open playground <ArrowRight size={13} aria-hidden="true" />
              </Link>
            </motion.div>
          </motion.div>
        </div>

        {/* Right: mini simulation preview */}
        <TiltCard className="relative" strength={5}>
          <motion.div variants={scaleIn}>
            {/* Glow */}
            <div className="absolute -inset-4 rounded-2xl bg-[#9945FF] opacity-[0.07] blur-2xl pointer-events-none" aria-hidden="true" />

            <div className="terminal-block relative overflow-hidden">
              <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--purple)] to-transparent opacity-40 animate-scan-line pointer-events-none" aria-hidden="true" />
              <div className="terminal-dots mb-4" aria-hidden="true" />

              {/* Scenario label */}
              <div className="flex items-center gap-2 mb-4">
                <AlertCircle size={12} className="text-[#ef4444]" aria-hidden="true" />
                <span className="font-mono text-[10px] text-[var(--muted)]">Scenario: Constraint Violation · Error 6001</span>
              </div>

              {/* Mini error log */}
              <div className="font-mono text-[10px] space-y-0.5 mb-5 opacity-80" aria-label="Sample error log">
                {[
                  { t: "cmd", v: "$ anchor test 2>&1" },
                  { t: "err", v: "  custom program error: 0x1771" },
                  { t: "err", v: "  Error Code: ConstraintHasOne (6001)" },
                  { t: "acc", v: "  Account: vault" },
                ].map((l, i) => (
                  <div key={i} className={
                    l.t === "cmd" ? "text-[var(--green)]" :
                    l.t === "err" ? "text-[#ef4444]" :
                    "text-[var(--gold)]"
                  }>{l.v}</div>
                ))}
              </div>

              {/* Mini analysis steps */}
              <div className="border-t border-[var(--border)] pt-4 space-y-2.5" aria-label="Analysis steps">
                {DEMO_STEPS.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -12 }}
                      animate={inView ? { opacity: 1, x: 0 } : {}}
                      transition={{ delay: 0.6 + i * 0.25, duration: 0.4 }}
                      className="flex items-start gap-2"
                    >
                      <div className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{ color: step.color }}>
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

              {/* CTA line */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={inView ? { opacity: 1 } : {}}
                transition={{ delay: 1.6 }}
                className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between"
              >
                <span className="font-mono text-[9px] text-[var(--green)]">root cause found · fix ready</span>
                <span className="font-mono text-[9px] text-[var(--muted)]">5 scenarios more →</span>
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
        Six issues that come up every week in Anchor and PayFi projects. Each has a dedicated sub-skill file.
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
    <TiltCard
      className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--purple)] transition-colors"
      strength={5}
    >
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06, duration: 0.45 }}
        className="flex items-start gap-3 w-full"
      >
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
        An Anchor debugging layer for general development and a PayFi layer for payment programs.
        Claude picks the right files based on what you ask.
      </motion.p>

      <motion.div variants={fadeIn}
        className="flex gap-1 bg-[var(--surface)] p-1 rounded-lg w-fit mb-8 border border-[var(--border)]"
        role="tablist"
        aria-label="Skill layer selector"
      >
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
        <motion.div key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.28 }}
          className="grid sm:grid-cols-2 gap-3"
          role="tabpanel"
          aria-label={tab === "anchor" ? "Anchor layer files" : "PayFi layer files"}
        >
          {files.map((f, i) => <SkillFileCard key={f.name} f={f} i={i} />)}
        </motion.div>
      </AnimatePresence>
    </Section>
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
      <DemoPreview />
      <Problems />
      <Features />
      <Footer />
    </main>
  );
}
