"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, useCallback } from "react";
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
  AlertCircle,
  ArrowRight,
  Check,
  Clock,
  Code2,
  Copy,
  Cpu,
  DollarSign,
  ExternalLink,
  GitBranch,
  Shield,
  Zap,
} from "lucide-react";

const ParticleCanvas = dynamic(() => import("@/components/ParticleCanvas"), { ssr: false });

/* ── animation variants ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.7, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] } }),
};
const fadeIn = {
  hidden: { opacity: 0 },
  visible: (i = 0) => ({ opacity: 1, transition: { duration: 0.5, delay: i * 0.08 } }),
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.86 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.6, delay: i * 0.07, ease: [0.34, 1.56, 0.64, 1] } }),
};
const slideLeft = {
  hidden: { opacity: 0, x: -28 },
  visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.6, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] } }),
};
const slideRight = {
  hidden: { opacity: 0, x: 28 },
  visible: (i = 0) => ({ opacity: 1, x: 0, transition: { duration: 0.6, delay: i * 0.055, ease: [0.16, 1, 0.3, 1] } }),
};
const clipReveal = {
  hidden: { clipPath: "inset(0 0 100% 0)" },
  visible: (i = 0) => ({ clipPath: "inset(0 0 0% 0)", transition: { duration: 0.8, delay: i * 0.05, ease: [0.16, 1, 0.3, 1] } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.09 } } };

/* ── useTilt hook ───────────────────────────────────── */
function useTilt(strength = 10) {
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

/* ── TiltCard (fixes hooks-in-map) ─────────────────── */
function TiltCard({ children, className = "", strength = 8 }: {
  children: React.ReactNode; className?: string; strength?: number;
}) {
  const { ref, rx, ry, onMove, onLeave } = useTilt(strength);
  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── useTyped hook ──────────────────────────────────── */
function useTyped(lines: string[], speed = 30, pause = 650) {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (lineIdx >= lines.length) { setDone(true); return; }
    if (charIdx === 0 && lineIdx > 0) {
      const t = setTimeout(() => setCharIdx(1), pause);
      return () => clearTimeout(t);
    }
    if (charIdx <= lines[lineIdx].length) {
      const t = setTimeout(() => {
        setDisplayed((prev) => {
          const n = [...prev];
          n[lineIdx] = lines[lineIdx].slice(0, charIdx);
          return n;
        });
        setCharIdx((c) => c + 1);
      }, speed);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setLineIdx((l) => l + 1); setCharIdx(0); }, pause);
      return () => clearTimeout(t);
    }
  }, [done, lineIdx, charIdx, lines, speed, pause]);

  return displayed;
}

/* ── CopyBtn ────────────────────────────────────────── */
function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <motion.button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      className="p-1.5 rounded text-[var(--muted)] hover:text-[var(--text)] transition-colors flex-shrink-0"
      aria-label="Copy"
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
            <Check size={14} className="text-[var(--green)]" />
          </motion.span>
        ) : (
          <motion.span key="d" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.18 }}>
            <Copy size={14} />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ── ScrollProgress ─────────────────────────────────── */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 200, damping: 30 });
  return (
    <motion.div
      style={{ scaleX, transformOrigin: "0%" }}
      className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[var(--purple)] via-[var(--green)] to-[var(--purple)] z-[100]"
    />
  );
}

/* ── Section wrapper ────────────────────────────────── */
function Section({ children, className = "", id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });
  return (
    <motion.section
      id={id}
      ref={ref}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={stagger}
      className={`max-w-5xl mx-auto px-6 py-24 ${className}`}
    >
      {children}
    </motion.section>
  );
}

/* ── Logo (hardcoded inline SVG — used in all UI) ──── */
function LogoIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Anchor ring */}
      <circle cx="14" cy="7" r="5" stroke="#9945FF" strokeWidth="2.2" />
      <circle cx="14" cy="7" r="2.2" fill="#9945FF" fillOpacity="0.3" />
      {/* Stem */}
      <line x1="14" y1="12" x2="14" y2="26" stroke="#9945FF" strokeWidth="2.4" strokeLinecap="round" />
      {/* Crossbar */}
      <line x1="6.5" y1="18" x2="21.5" y2="18" stroke="#9945FF" strokeWidth="2.4" strokeLinecap="round" />
      {/* Flukes */}
      <path d="M6.5 18 Q4 24 9 26" stroke="#9945FF" strokeWidth="2" strokeLinecap="round" fill="none" />
      <path d="M21.5 18 Q24 24 19 26" stroke="#9945FF" strokeWidth="2" strokeLinecap="round" fill="none" />
      {/* Debug indicator — green circle with terminal block */}
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

/* ── data ───────────────────────────────────────────── */
const HERO_TERMINAL = [
  "$ anchor test -- --nocapture 2>&1",
  "",
  "  running 3 tests in tests/vault.ts",
  "  ✓ vault::initialize         198 CU",
  "  ✓ vault::deposit          3,420 CU",
  "  ✗ vault::withdraw",
  "",
  "  InstructionError::Custom(6001)",
  "  → vault_program::WithdrawFunds",
  "  → constraint: signer.key == vault.authority",
  "",
  "  root cause:",
  "    tx.feePayer !== vault.authority",
  "    (using wrong keypair in client)",
  "",
  "  fix: use user.publicKey not payer.publicKey",
  "",
  "  CU: 142,800 / 200,000   simulation: 2/3 ✓",
];

const PROBLEMS = [
  { icon: AlertCircle, color: "var(--red)", title: "Error codes without context", body: "Anchor throws InstructionError::Custom(3001) and the logs stop. Tracing which constraint fired takes several minutes of manual work." },
  { icon: Cpu, color: "var(--purple)", title: "Compute budget overruns", body: "Programs exceed 200k CU mid-instruction with no breakdown of which handler consumed the most compute units." },
  { icon: Clock, color: "var(--gold)", title: "Clock and rent edge cases", body: "PayFi contracts fail when unix_timestamp drifts or when escrow accounts approach rent thresholds under load." },
  { icon: Shield, color: "var(--green)", title: "Upgrade gaps on live programs", body: "Migrating instruction handlers on a program with active deposits puts funds at risk if a single constraint is missed." },
  { icon: Zap, color: "var(--gold)", title: "Priority fee misses", body: "Setting fees without knowing slot compute demand leads to failed inclusion or 10x overpayment on priority." },
  { icon: DollarSign, color: "var(--green)", title: "Streaming payment stalls", body: "A failed CPI call in a streaming contract can leave recipient state permanently stuck between slot updates." },
];

const ANCHOR_FILES = [
  { name: "SKILL.md", desc: "Router — selects the right sub-skill per query" },
  { name: "tx-debugging.md", desc: "Transaction decode and log parse" },
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

const INSTALL_TABS = [
  { id: "git", label: "git clone", cmd: "git clone https://github.com/nayrbryanGaming/anchor-debugger-skill ~/.claude/skills/anchor-debug" },
  { id: "curl", label: "curl", cmd: "curl -fsSL https://raw.githubusercontent.com/nayrbryanGaming/anchor-debugger-skill/master/install.sh | bash" },
  { id: "sub", label: "submodule", cmd: "git submodule add https://github.com/nayrbryanGaming/anchor-debugger-skill .claude/skills/anchor-debug" },
];

const TREE = [
  { depth: 0, name: "anchor-debug/", t: "dir" },
  { depth: 1, name: "SKILL.md", t: "file", note: "router" },
  { depth: 1, name: "skill/", t: "dir" },
  { depth: 2, name: "tx-debugging.md", t: "file" },
  { depth: 2, name: "error-catalog.md", t: "file" },
  { depth: 2, name: "compute-optimization.md", t: "file" },
  { depth: 2, name: "upgrade-safety.md", t: "file" },
  { depth: 2, name: "simulation.md", t: "file" },
  { depth: 2, name: "common-pitfalls.md", t: "file" },
  { depth: 2, name: "payfi-overview.md", t: "file" },
  { depth: 2, name: "payfi-patterns.md", t: "file" },
  { depth: 2, name: "payfi-tx-debugging.md", t: "file" },
  { depth: 2, name: "payfi-simulation.md", t: "file" },
  { depth: 2, name: "payfi-cu-pitfalls.md", t: "file" },
  { depth: 1, name: "agents/", t: "dir" },
  { depth: 2, name: "anchor-debugger.md", t: "file" },
  { depth: 1, name: "commands/", t: "dir" },
  { depth: 2, name: "debug-tx.md", t: "file" },
  { depth: 2, name: "optimize-cu.md", t: "file" },
  { depth: 2, name: "check-upgrade.md", t: "file" },
  { depth: 1, name: "rules/", t: "dir" },
  { depth: 2, name: "anchor-rules.md", t: "file" },
];

const ROUTING_EXAMPLES = [
  { query: "why did my tx fail with custom error 6001", route: "SKILL.md → error-catalog.md", color: "var(--purple)" },
  { query: "my escrow account is hitting rent threshold", route: "SKILL.md → payfi-overview.md + payfi-cu-pitfalls.md", color: "var(--green)" },
  { query: "how do I migrate a live program without breaking deposits", route: "SKILL.md → upgrade-safety.md", color: "var(--gold)" },
];

/* ── NAV ────────────────────────────────────────────── */
function Nav() {
  const { scrollY } = useScroll();
  const bg = useTransform(scrollY, [0, 60], ["rgba(5,5,8,0)", "rgba(5,5,8,0.92)"]);
  const bd = useTransform(scrollY, [0, 60], ["rgba(24,24,42,0)", "rgba(24,24,42,1)"]);

  return (
    <motion.header
      style={{ backgroundColor: bg, borderBottomColor: bd }}
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md flex items-center justify-between px-6 h-14"
    >
      <motion.div initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
        <Logo />
      </motion.div>
      <motion.nav
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.08 }}
        className="flex items-center gap-4"
      >
        <a href="#problems" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden md:block">Problems</a>
        <a href="#features" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden md:block">Skills</a>
        <a href="#install" className="text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors hidden md:block">Install</a>
        <motion.a
          href="https://github.com/nayrbryanGaming/anchor-debugger-skill"
          target="_blank" rel="noopener noreferrer"
          whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          className="flex items-center gap-1.5 text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 text-[var(--text)] hover:border-[var(--purple)] transition-colors"
        >
          <GitBranch size={12} /> GitHub
        </motion.a>
      </motion.nav>
    </motion.header>
  );
}

/* ── HERO — 2-column developer tool layout ──────────── */
function Hero() {
  const lines = useTyped(HERO_TERMINAL, 28, 600);

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden pt-14">
      {/* Grid background — original design element */}
      <div className="pointer-events-none absolute inset-0 bg-grid-pattern bg-grid-md opacity-[0.35] animate-grid-pulse" />

      {/* Particle canvas */}
      <ParticleCanvas />

      {/* Gradient orbs — subtle accent, not the main visual */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="orb-a absolute -top-60 -right-60 w-[600px] h-[600px] rounded-full opacity-[0.13] blur-[130px] bg-[#9945FF]" />
        <div className="orb-b absolute -bottom-60 -left-60 w-[500px] h-[500px] rounded-full opacity-[0.10] blur-[110px] bg-[#14F195]" />
      </div>

      {/* Horizontal scan line */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#9945FF] to-transparent opacity-40 animate-scan-line" />
      </div>

      {/* 2-column content — original layout style */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 w-full grid md:grid-cols-2 gap-16 items-center">

        {/* LEFT — headline + CTA */}
        <motion.div initial="hidden" animate="visible" variants={stagger}>

          {/* Bounty badge */}
          <motion.div
            variants={scaleIn}
            className="mb-6 inline-flex items-center gap-2 border border-[var(--border)] rounded-full px-3.5 py-1.5 text-xs text-[var(--muted)] bg-[rgba(12,12,20,0.7)] backdrop-blur-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
            Superteam Brasil Bounty &nbsp;&middot;&nbsp; Solana AI Kit
          </motion.div>

          {/* Headline */}
          <motion.h1
            variants={clipReveal}
            className="font-display font-bold text-4xl md:text-[52px] leading-tight mb-5"
          >
            Anchor errors, explained from the instruction trace up.
          </motion.h1>

          {/* Subtext */}
          <motion.p variants={fadeUp} className="text-[var(--muted)] text-base leading-relaxed mb-8 max-w-md">
            A Claude Code skill that reads failed Anchor transactions and points to the exact
            constraint that broke. Covers compute budget limits, PayFi edge cases, and upgrade safety.
          </motion.p>

          {/* CTAs */}
          <motion.div variants={fadeUp} className="flex flex-wrap gap-3 mb-10">
            <motion.a
              href="#install"
              whileHover={{ scale: 1.03, boxShadow: "0 0 28px rgba(153,69,255,0.4)" }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--purple)] text-white font-semibold text-sm"
            >
              Install skill <ArrowRight size={14} />
            </motion.a>
            <motion.a
              href="https://github.com/nayrbryanGaming/anchor-debugger-skill"
              target="_blank" rel="noopener noreferrer"
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:border-[var(--purple)] transition-colors"
            >
              <GitBranch size={14} /> GitHub
            </motion.a>
          </motion.div>

          {/* Stats */}
          <motion.div variants={stagger} className="flex flex-wrap gap-6">
            {[["11", "skill files"], ["300+", "error codes"], ["5", "PayFi patterns"], ["MIT", "license"]].map(
              ([v, l], i) => (
                <motion.div key={l} variants={fadeIn} custom={i} className="flex flex-col">
                  <span className="font-bold text-lg text-[var(--text)]">{v}</span>
                  <span className="text-xs text-[var(--muted)]">{l}</span>
                </motion.div>
              )
            )}
          </motion.div>
        </motion.div>

        {/* RIGHT — live terminal animation */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Glow behind terminal */}
          <div className="absolute -inset-6 rounded-2xl bg-[#9945FF] opacity-[0.08] blur-2xl" />

          <div className="terminal-block relative overflow-hidden">
            {/* Inner scan line */}
            <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[#9945FF] to-transparent opacity-50 animate-scan-line pointer-events-none" />

            <div className="terminal-dots mb-4" />

            <div className="font-mono text-[11px] leading-[1.65] min-h-[280px]">
              {HERO_TERMINAL.map((line, i) => {
                const shown = lines[i] ?? "";
                const isCmd = line.startsWith("$");
                const isTick = line.includes("✓");
                const isCross = line.includes("✗");
                const isError = line.includes("InstructionError") || line.includes("Custom(");
                const isArrow = line.startsWith("  →");
                const isFix = line.startsWith("  fix") || line.startsWith("    use");
                const isSimOrCu = line.includes("simulation") || line.startsWith("  CU:");
                const isEmpty = line === "";
                const cls = isCmd ? "text-[var(--green)]"
                  : isTick ? "text-[var(--green)] ml-2"
                  : isCross ? "text-[var(--red)] ml-2"
                  : isError ? "text-[var(--red)] ml-2"
                  : isArrow ? "text-[var(--gold)] ml-2"
                  : isFix ? "text-[var(--green)] ml-4"
                  : isSimOrCu ? "text-[var(--blue)] ml-2"
                  : isEmpty ? "text-transparent" : "text-[var(--muted)] ml-2";

                const isCurrent = i === Math.min(lines.length - 1, HERO_TERMINAL.length - 1);
                return (
                  <div key={i}>
                    <span className={cls}>
                      {shown || (isEmpty ? " " : "")}
                      {isCurrent && shown.length < line.length && <span className="animate-blink">▋</span>}
                    </span>
                  </div>
                );
              })}
              {lines.length >= HERO_TERMINAL.length && (
                <div className="text-[var(--green)] mt-2">
                  $ <span className="animate-blink">▋</span>
                </div>
              )}
            </div>
          </div>

          {/* Floating PR badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.4, type: "spring", bounce: 0.4 }}
            className="floating-badge absolute -top-3 -right-3 bg-[var(--surface)] border border-[var(--green)] rounded-lg px-2.5 py-1 text-[10px] font-mono text-[var(--green)] flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-pulse" />
            PR #21 · live
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

/* ── HOW IT WORKS ───────────────────────────────────── */
function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px 0px" });

  const steps = [
    { n: "01", title: "Pipe your logs", body: "Run Anchor test and pipe the output to Claude. No extra tooling, no config files.", color: "var(--purple)" },
    { n: "02", title: "Skill reads the trace", body: "The skill parses instruction logs, maps error codes, and identifies the failing constraint.", color: "var(--green)" },
    { n: "03", title: "Get a direct fix", body: "Claude returns the root cause and a code snippet. No log hunting, no guessing.", color: "var(--gold)" },
  ];

  return (
    <section ref={ref} className="max-w-5xl mx-auto px-6 py-20">
      <motion.div initial="hidden" animate={inView ? "visible" : "hidden"} variants={stagger} className="grid md:grid-cols-3 gap-5">
        {steps.map((s, i) => (
          <TiltCard key={s.n} className="card-3d glow-border p-6 rounded-xl" strength={6}>
            <motion.div variants={fadeUp} custom={i}>
              <div className="text-3xl font-bold mb-4 font-display" style={{ color: s.color }}>{s.n}</div>
              <h3 className="font-semibold text-sm mb-2 text-[var(--text)]">{s.title}</h3>
              <p className="text-xs text-[var(--muted)] leading-relaxed">{s.body}</p>
            </motion.div>
          </TiltCard>
        ))}
      </motion.div>
    </section>
  );
}

/* ── PROBLEMS ───────────────────────────────────────── */
function ProblemCard({ p, i }: { p: typeof PROBLEMS[number]; i: number }) {
  const Icon = p.icon;
  return (
    <TiltCard className="card-3d glow-border p-5 rounded-xl h-full" strength={7}>
      <motion.div variants={scaleIn} custom={i} className="h-full">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center mb-4"
          style={{ background: `${p.color}18`, border: `1px solid ${p.color}38` }}
        >
          <Icon size={16} style={{ color: p.color }} />
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
      <motion.p variants={fadeUp} className="text-[var(--muted)] mb-12 max-w-xl leading-relaxed">
        Six issues that come up every week in Anchor projects. Each has a dedicated sub-skill file.
      </motion.p>
      <motion.div variants={stagger} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PROBLEMS.map((p, i) => <ProblemCard key={p.title} p={p} i={i} />)}
      </motion.div>
    </Section>
  );
}

/* ── FEATURES ───────────────────────────────────────── */
function SkillFileCard({ f, i }: { f: { name: string; desc: string }; i: number }) {
  return (
    <TiltCard
      className="flex items-start gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--purple)] transition-colors"
      strength={5}
    >
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.06 }}
        className="flex items-start gap-3 w-full"
      >
        <Code2 size={13} className="text-[var(--purple)] mt-0.5 flex-shrink-0" />
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
      <motion.p variants={fadeUp} className="text-[var(--muted)] mb-8 max-w-xl leading-relaxed">
        An Anchor debugging layer for general development and a PayFi layer for payment programs.
        Claude picks the right files based on what you ask.
      </motion.p>

      <motion.div variants={fadeIn} className="flex gap-1 bg-[var(--surface)] p-1 rounded-lg w-fit mb-8 border border-[var(--border)]">
        {(["anchor", "payfi"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="relative px-5 py-2 text-sm rounded-md font-medium transition-colors z-10"
            style={{ color: tab === t ? "var(--text)" : "var(--muted)" }}
          >
            {tab === t && (
              <motion.span
                layoutId="feat-tab"
                className="absolute inset-0 bg-[var(--surface2)] rounded-md border border-[var(--border)]"
                transition={{ type: "spring", bounce: 0.22, duration: 0.38 }}
              />
            )}
            <span className="relative z-10">{t === "anchor" ? "Anchor layer" : "PayFi layer"}</span>
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -14 }}
          transition={{ duration: 0.28 }}
          className="grid sm:grid-cols-2 gap-3"
        >
          {files.map((f, i) => <SkillFileCard key={f.name} f={f} i={i} />)}
        </motion.div>
      </AnimatePresence>
    </Section>
  );
}

/* ── ARCHITECTURE ───────────────────────────────────── */
function Architecture() {
  return (
    <Section id="architecture">
      <motion.p variants={fadeIn} className="tag-green mb-4 inline-block">File structure</motion.p>
      <motion.h2 variants={clipReveal} className="font-display font-bold text-3xl md:text-4xl mb-4">
        No magic. Just markdown.
      </motion.h2>
      <motion.p variants={fadeUp} className="text-[var(--muted)] mb-12 max-w-xl leading-relaxed">
        Every skill file is plain markdown. Read it, edit it, or replace it. Claude loads only the files that match your query.
      </motion.p>

      <div className="grid md:grid-cols-2 gap-10">
        <motion.div variants={scaleIn} className="terminal-block font-mono text-xs">
          <div className="terminal-dots mb-4" />
          <div className="space-y-0.5">
            {TREE.map((node, i) => (
              <motion.div
                key={i}
                variants={slideLeft}
                custom={i}
                className="flex items-center"
                style={{ paddingLeft: node.depth * 14 }}
              >
                <span className="text-[var(--muted)] mr-1">{node.depth > 0 ? "├── " : ""}</span>
                <span className={node.t === "dir" ? "text-[var(--purple)]" : node.name.startsWith("payfi") ? "text-[var(--green)]" : "text-[var(--text)]"}>
                  {node.name}
                </span>
                {node.note && <span className="text-[var(--muted)] ml-2 opacity-60">← {node.note}</span>}
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div variants={stagger} className="space-y-4">
          <motion.p variants={fadeIn} className="text-xs text-[var(--muted)] uppercase tracking-wider mb-4">Routing examples</motion.p>
          {ROUTING_EXAMPLES.map((ex, i) => (
            <motion.div key={i} variants={slideRight} custom={i} className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)]">
              <div className="text-[10px] text-[var(--muted)] mb-2 uppercase tracking-wider">query</div>
              <div className="text-sm text-[var(--text)] font-mono mb-3">"{ex.query}"</div>
              <div className="flex items-center gap-2">
                <ArrowRight size={11} style={{ color: ex.color }} />
                <span className="text-xs font-mono" style={{ color: ex.color }}>{ex.route}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

/* ── INSTALL ────────────────────────────────────────── */
function Install() {
  const [active, setActive] = useState(0);

  return (
    <Section id="install">
      <motion.p variants={fadeIn} className="tag-purple mb-4 inline-block">Get started</motion.p>
      <motion.h2 variants={clipReveal} className="font-display font-bold text-3xl md:text-4xl mb-4">
        Three lines to install. Zero config.
      </motion.h2>
      <motion.p variants={fadeUp} className="text-[var(--muted)] mb-10 max-w-xl leading-relaxed">
        Clone into your Claude skills directory. Every Anchor question gets full skill context from that point on.
      </motion.p>

      <motion.div variants={scaleIn} className="max-w-2xl">
        <div className="flex gap-1 p-1 bg-[var(--surface)] rounded-t-xl border border-[var(--border)] border-b-0">
          {INSTALL_TABS.map((t, i) => (
            <button
              key={t.id}
              onClick={() => setActive(i)}
              className="relative px-3 py-1.5 text-xs font-mono rounded-md transition-colors"
              style={{ color: active === i ? "var(--text)" : "var(--muted)" }}
            >
              {active === i && (
                <motion.span
                  layoutId="inst-tab"
                  className="absolute inset-0 bg-[var(--surface2)] rounded-md"
                  transition={{ type: "spring", bounce: 0.18, duration: 0.32 }}
                />
              )}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24 }}
            className="terminal-block rounded-t-none border-t-0 flex items-center justify-between gap-3"
          >
            <code className="font-mono text-sm text-[var(--green)] break-all flex-1">
              {INSTALL_TABS[active].cmd}
            </code>
            <CopyBtn text={INSTALL_TABS[active].cmd} />
          </motion.div>
        </AnimatePresence>

        <motion.div variants={fadeUp} className="mt-5 p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] font-mono text-xs space-y-2">
          <div className="text-[var(--muted)]">Then in Claude:</div>
          <div className="text-[var(--green)]">$ anchor test 2&gt;&amp;1 | claude "debug this"</div>
          <div className="text-[var(--muted)] opacity-70">→ reads logs, maps the error, returns the fix</div>
        </motion.div>
      </motion.div>

      <motion.div variants={stagger} className="flex flex-wrap gap-8 mt-14">
        {[{ v: "11", l: "skill files" }, { v: "300+", l: "error codes" }, { v: "5", l: "PayFi patterns" }, { v: "MIT", l: "license" }].map(
          (s, i) => (
            <motion.div key={s.l} variants={fadeUp} custom={i} className="flex flex-col">
              <span className="text-3xl font-bold text-[var(--text)]">{s.v}</span>
              <span className="text-xs text-[var(--muted)] mt-0.5">{s.l}</span>
            </motion.div>
          )
        )}
      </motion.div>
    </Section>
  );
}

/* ── FOOTER ─────────────────────────────────────────── */
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
            <motion.a
              key={label}
              href={href}
              target="_blank" rel="noopener noreferrer"
              whileHover={{ color: "var(--text)" }}
              className="flex items-center gap-1.5 transition-colors"
            >
              <Icon size={12} /> {label}
            </motion.a>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">MIT &middot; Superteam Brasil 2025</p>
      </div>
    </footer>
  );
}

/* ── PAGE ───────────────────────────────────────────── */
export default function Page() {
  return (
    <main className="bg-[var(--bg)] text-[var(--text)] min-h-screen">
      <ScrollProgress />
      <Nav />
      <Hero />
      <HowItWorks />
      <Problems />
      <Features />
      <Architecture />
      <Install />
      <Footer />
    </main>
  );
}
