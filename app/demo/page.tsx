"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring, useInView } from "framer-motion";
import Link from "next/link";
import {
  AlertCircle, ArrowLeft, Check, Clock, Code2, Copy, Cpu,
  DollarSign, GitBranch, Shield, Zap, Play, ExternalLink,
  AlertTriangle, Info, Wrench, Search, RotateCcw, ChevronRight,
  Terminal, Loader2, CheckCircle2,
} from "lucide-react";

/* ── animation variants ─────────────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] } }),
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } };
const scaleIn = {
  hidden: { opacity: 0, scale: 0.88 },
  visible: (i = 0) => ({ opacity: 1, scale: 1, transition: { duration: 0.5, delay: i * 0.06, ease: [0.34, 1.56, 0.64, 1] } }),
};

/* ── useTilt hook ───────────────────────────────────── */
function useTilt(strength = 7) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rx = useSpring(x, { stiffness: 260, damping: 30 });
  const ry = useSpring(y, { stiffness: 260, damping: 30 });
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

function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { ref, rx, ry, onMove, onLeave } = useTilt(6);
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d" }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ── Logo ───────────────────────────────────────────── */
function LogoIcon({ size = 24 }: { size?: number }) {
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

/* ── CopyBtn ────────────────────────────────────────── */
function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] text-xs font-mono text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--purple)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
      aria-label={copied ? "Copied" : `Copy ${label}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.span key="c" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-1 text-[var(--green)]">
            <Check size={11} aria-hidden="true" /> Copied
          </motion.span>
        ) : (
          <motion.span key="d" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }} className="flex items-center gap-1">
            <Copy size={11} aria-hidden="true" /> {label}
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
}

/* ── Scenario data ──────────────────────────────────── */
type StepIcon = "search" | "alert" | "warn" | "info" | "fix" | "cpu" | "dollar" | "shield";

type Step = {
  icon: StepIcon;
  label: string;
  detail: string;
  color: string;
};

type Scenario = {
  id: string;
  icon: React.FC<{ size?: number; className?: string; style?: React.CSSProperties; "aria-hidden"?: boolean | "true" | "false" }>;
  color: string;
  title: string;
  tag: string;
  description: string;
  errorLog: string[];
  steps: Step[];
  fix: { lang: string; label: string; code: string };
};

const SCENARIOS: Scenario[] = [
  {
    id: "constraint",
    icon: AlertCircle,
    color: "#ef4444",
    title: "Constraint Violation",
    tag: "Error 6001",
    description: "A has_one constraint on vault.authority fails because the wrong keypair signs the transaction.",
    errorLog: [
      "$ anchor test -- --nocapture 2>&1",
      "",
      "running test: vault::withdraw should succeed",
      "",
      "Error: failed to send transaction:",
      "  Transaction simulation failed:",
      "  Error processing Instruction 0:",
      "  custom program error: 0x1771",
      "",
      "AnchorError caused by account: vault",
      "Error Code: ConstraintHasOne",
      "Error Number: 6001",
      "Error Message: A has one constraint was violated.",
      "",
      "Left:  3xQP4mNbHr8a9KpWqM2LsFj1tYuVzCnBd",
      "Right: 9rAB2cDE3fGH4iJK5lMN6oPQ7rST8uVW9x",
    ],
    steps: [
      { icon: "search", label: "Parsing error code", detail: "0x1771 = 6001 decimal → Anchor ConstraintHasOne", color: "var(--muted)" },
      { icon: "alert", label: "Target account located", detail: "Account: vault — constraint: has_one = authority", color: "var(--purple)" },
      { icon: "warn", label: "Public key mismatch", detail: "Signer 3xQP... ≠ vault.authority 9rAB...", color: "#ef4444" },
      { icon: "info", label: "Root cause", detail: "provider.wallet (fee payer) used instead of the vault authority keypair", color: "var(--gold)" },
      { icon: "fix", label: "Fix identified", detail: "Pass authorityKeypair.publicKey to accounts, add to .signers([])", color: "var(--green)" },
    ],
    fix: {
      lang: "TypeScript",
      label: "tests/vault.ts — withdraw instruction",
      code: `// Before — fee payer signs (wrong)
const tx = await program.methods
  .withdraw(new BN(amount))
  .accounts({
    vault,
    authority: provider.wallet.publicKey,
  })
  .rpc();

// After — vault authority must sign
const tx = await program.methods
  .withdraw(new BN(amount))
  .accounts({
    vault,
    authority: authorityKeypair.publicKey,
  })
  .signers([authorityKeypair])
  .rpc();`,
    },
  },
  {
    id: "compute",
    icon: Cpu,
    color: "#9945FF",
    title: "Compute Budget Hit",
    tag: "200k CU exhausted",
    description: "The yield calculation loop consumes all 200k compute units before the instruction finishes.",
    errorLog: [
      "$ anchor test 2>&1",
      "",
      "running test: vault::calculate_yield",
      "",
      "Error: Transaction simulation failed:",
      "  Program consumed 200000 of 200000 compute units",
      "",
      "Instruction trace:",
      "  initialize_user_account    12,400 CU",
      "  calculate_yield_rewards   142,800 CU  ← hotspot",
      "  update_protocol_state      28,600 CU",
      "  emit_event                 16,200 CU",
      "  ───────────────────────────────────",
      "  Total                     200,000 CU  ← limit hit",
      "",
      "Simulation aborted at calculate_yield_rewards.",
    ],
    steps: [
      { icon: "search", label: "Parsing compute trace", detail: "200,000 / 200,000 CU — budget fully consumed", color: "var(--muted)" },
      { icon: "cpu", label: "Hotspot located", detail: "calculate_yield_rewards: 142,800 CU (71% of total budget)", color: "var(--purple)" },
      { icon: "warn", label: "Loop structure detected", detail: "Iterates over 32 vesting entries per transaction — O(n) cost", color: "var(--gold)" },
      { icon: "fix", label: "Fix identified", detail: "Request 350k CU via ComputeBudgetProgram before the instruction", color: "var(--green)" },
    ],
    fix: {
      lang: "TypeScript",
      label: "client/src/instructions.ts — transaction builder",
      code: `import { ComputeBudgetProgram, Transaction } from "@solana/web3.js";

// Set limit BEFORE your instruction (must be first)
const budgetIx = ComputeBudgetProgram.setComputeUnitLimit({
  units: 350_000,   // safe headroom above 200k peak
});

// Optional: set priority fee (microlamports per CU)
const priceIx = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1_000,
});

const tx = new Transaction()
  .add(budgetIx, priceIx, calculateYieldIx);

await sendAndConfirmTransaction(connection, tx, [payer]);`,
    },
  },
  {
    id: "pda",
    icon: Code2,
    color: "#F5A623",
    title: "PDA Seed Mismatch",
    tag: "AccountNotInitialized (3012)",
    description: "Client derives the wrong PDA address because the seed prefix differs from what the program uses.",
    errorLog: [
      "$ anchor test 2>&1",
      "",
      "running test: user::update_profile",
      "",
      "AnchorError caused by account: user_state",
      "Error Code: AccountNotInitialized",
      "Error Number: 3012",
      "Error Message: The program expected this account",
      "  to be already initialized.",
      "",
      "PDA expected on-chain:",
      "  7mKz4rABcDE5fGHiJKLmNoPQrSTuVWXY9Z1ab2cd",
      "",
      "PDA supplied by client:",
      "  DpQw9xYZ1aBC2dEfGHiJKLmNoPQ3rSTuVW4xyz5",
      "",
      "Seeds from client call: [\"user\", pubkey]",
    ],
    steps: [
      { icon: "search", label: "Error type", detail: "3012: AccountNotInitialized — PDA not found at client-supplied address", color: "var(--muted)" },
      { icon: "alert", label: "Address comparison", detail: "Expected 7mKz... / Got DpQw... — different program derived addresses", color: "#ef4444" },
      { icon: "warn", label: "Seed prefix differs", detail: "Client: b\"user\" — Program #[account] macro: b\"user_state\"", color: "var(--gold)" },
      { icon: "fix", label: "Fix identified", detail: "Update client seed prefix from \"user\" to \"user_state\" to match Rust", color: "var(--green)" },
    ],
    fix: {
      lang: "TypeScript",
      label: "client/src/pda.ts — PDA derivation",
      code: `// Wrong — seed prefix does not match Rust program
const [userStatePda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("user"),           // ← wrong prefix
    user.publicKey.toBuffer(),
  ],
  programId
);

// Correct — must match seeds in #[account(...)] macro
const [userStatePda] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("user_state"),     // ← matches Rust
    user.publicKey.toBuffer(),
  ],
  programId
);

// Rust program reference:
// #[account(seeds = [b"user_state", user.key().as_ref()], bump)]`,
    },
  },
  {
    id: "rent",
    icon: DollarSign,
    color: "#14F195",
    title: "Rent Threshold (PayFi)",
    tag: "InsufficientFunds + Rent",
    description: "A streaming payout drops the escrow balance below the rent-exempt minimum — Solana would garbage-collect the account.",
    errorLog: [
      "$ anchor test 2>&1",
      "",
      "running test: escrow::process_payout",
      "",
      "Error: Transaction simulation failed:",
      "  Transfer: insufficient lamports 890880, need 950256",
      "",
      "Program log: escrow balance before:  1,048,576 lam",
      "Program log: payout requested:         890,880 lam",
      "Program log: balance after payout:     157,696 lam",
      "Program log: rent exempt minimum:      890,880 lam",
      "",
      "Program log: ERROR: account falls below rent",
      "Program log:   threshold. Would be garbage-collected.",
    ],
    steps: [
      { icon: "search", label: "Parsing balances", detail: "After payout: 157,696 lam < 890,880 lam rent minimum", color: "var(--muted)" },
      { icon: "dollar", label: "Rent calculation", detail: "165-byte escrow account requires 890,880 lamports (~0.00089 SOL)", color: "var(--green)" },
      { icon: "warn", label: "PayFi streaming edge case", detail: "Streaming payout leaves residual below threshold — account at deletion risk", color: "var(--gold)" },
      { icon: "fix", label: "Fix identified", detail: "Reserve rent-exempt minimum before processing; cap max payout accordingly", color: "var(--green)" },
    ],
    fix: {
      lang: "Rust",
      label: "programs/escrow/src/instructions/payout.rs",
      code: `pub fn process_payout(
    ctx: Context<ProcessPayout>,
    amount: u64,
) -> Result<()> {
    let escrow = &mut ctx.accounts.escrow;
    let rent = Rent::get()?;

    // Reserve rent-exempt minimum before payout
    let min_balance = rent.minimum_balance(Escrow::LEN);

    let max_payout = escrow.balance
        .checked_sub(min_balance)
        .ok_or(EscrowError::BelowRentMinimum)?;

    require!(
        amount <= max_payout,
        EscrowError::WouldViolateRentExemption
    );

    escrow.balance -= amount;
    // ... transfer logic
    Ok(())
}`,
    },
  },
  {
    id: "upgrade",
    icon: Shield,
    color: "#3b82f6",
    title: "Upgrade Safety Check",
    tag: "Live Program Migration",
    description: "Removing an instruction shifts all subsequent discriminators. Existing clients send funds to the wrong handler.",
    errorLog: [
      "$ claude check-upgrade ./programs/vault/src",
      "",
      "Program: vault_program (mainnet-beta)",
      "Active accounts:    847 escrow accounts",
      "Total value locked: ~12,400 SOL",
      "",
      "Proposed changes:",
      "  [+] new instruction: emergency_withdraw",
      "  [~] modified: deposit — added min_amount check",
      "  [~] modified: withdraw — changed authority logic",
      "  [-] removed: pause_deposits (was instruction #4)",
      "",
      "RISK: removing instruction #4 shifts discriminators.",
      "All clients calling positions 5+ will break.",
      "12,400 SOL at risk if clients hit wrong handler.",
    ],
    steps: [
      { icon: "alert", label: "Risk scan", detail: "847 active accounts, 12,400 SOL at risk during migration window", color: "#ef4444" },
      { icon: "warn", label: "Discriminator shift", detail: "Removing pause_deposits (position 4) shifts all subsequent instruction IDs", color: "#ef4444" },
      { icon: "info", label: "Safe migration path", detail: "Keep pause_deposits as a no-op stub at position 4, add new instruction at end", color: "var(--gold)" },
      { icon: "fix", label: "Fix identified", detail: "Stub old instruction + add emergency_withdraw at position 5+ (no shift)", color: "var(--green)" },
    ],
    fix: {
      lang: "Rust",
      label: "programs/vault/src/lib.rs — safe migration",
      code: `// Keep as no-op stub — preserves discriminator at position 4
// Remove only after ALL clients have been updated
pub fn pause_deposits_deprecated(
    _ctx: Context<DeprecatedCtx>
) -> Result<()> {
    emit!(InstructionDeprecated {
        name: "pause_deposits".to_string(),
        // give clients time to update before removal
        safe_to_remove_after_slot: Clock::get()?.slot + 432_000,
    });
    Ok(())   // no-op, returns success
}

// NEW instruction goes at the END of the list
// — it does not shift any existing discriminators
pub fn emergency_withdraw(
    ctx: Context<EmergencyWithdraw>,
    amount: u64,
) -> Result<()> {
    // ... implementation
    Ok(())
}`,
    },
  },
  {
    id: "streaming",
    icon: Zap,
    color: "#9945FF",
    title: "Streaming Payment Stall",
    tag: "PayFi CPI silent failure",
    description: "A CPI failure inside a streaming payout is silently swallowed — the stream stays ACTIVE while payments stop.",
    errorLog: [
      "$ claude debug-tx 5K9mP2rXnQbVzAeJd4FhLTwYgCuN8sRo",
      "",
      "Stream ID: 0x7a2f4bc91de053f8",
      "Status:    ACTIVE",
      "Last paid: slot 284,715,041",
      "Current:   slot 284,729,441",
      "Elapsed:   14,400 slots  (~16 hours unpaid)",
      "",
      "Replaying instruction trace...",
      "  slot 284,729,000: streaming_payout called",
      "  CPI → token_program::transfer",
      "  Error: insufficient funds in source account",
      "  (error swallowed — stream stays ACTIVE)",
      "",
      "Recipient unpaid for 16 hours. State is stale.",
    ],
    steps: [
      { icon: "search", label: "Stall detected", detail: "14,400 slots unpaid (~16 hours) while stream reports ACTIVE", color: "var(--muted)" },
      { icon: "alert", label: "CPI failure traced", detail: "token_program::transfer failed — source token account drained externally", color: "#ef4444" },
      { icon: "warn", label: "Silent error swallow", detail: "match arm catches Err(_) with empty body — stream.status never updated", color: "var(--gold)" },
      { icon: "fix", label: "Fix identified", detail: "Propagate CPI error with ?, set stream.status = Stalled, emit event", color: "var(--green)" },
    ],
    fix: {
      lang: "Rust",
      label: "programs/streaming/src/instructions/payout.rs",
      code: `// Before — error silently swallowed
match transfer(cpi_ctx, amount) {
    Ok(_) => {
        stream.last_paid_slot = current_slot;
    }
    Err(_) => {}   // ← state never updated; stall hidden
}

// After — propagate and record the failure
transfer(cpi_ctx, amount).map_err(|_| {
    stream.status = StreamStatus::Stalled;
    stream.stall_slot = current_slot;
    stream.stall_reason = StallReason::SourceDepleted;
    emit!(StreamStalled {
        stream_id: stream.id,
        slot: current_slot,
        reason: "source_account_depleted".to_string(),
    });
    StreamError::SourceDepleted
})?;

stream.last_paid_slot = current_slot;`,
    },
  },
];

/* ── Step icon map ──────────────────────────────────── */
function StepIcon({ type, size = 14 }: { type: StepIcon; size?: number }) {
  const props = { size, "aria-hidden": true as const };
  switch (type) {
    case "search": return <Search {...props} />;
    case "alert": return <AlertCircle {...props} />;
    case "warn": return <AlertTriangle {...props} />;
    case "info": return <Info {...props} />;
    case "fix": return <Wrench {...props} />;
    case "cpu": return <Cpu {...props} />;
    case "dollar": return <DollarSign {...props} />;
    case "shield": return <Shield {...props} />;
  }
}

/* ── Syntax-colored log line ────────────────────────── */
function LogLine({ line, index }: { line: string; index: number }) {
  const isCmd = line.startsWith("$");
  const isTick = line.includes("✓");
  const isCross = line.includes("✗");
  const isError = line.toLowerCase().includes("error") || line.includes("RISK");
  const isLabel = line.startsWith("Program log:") || line.startsWith("Status") || line.startsWith("Last paid") || line.startsWith("Current") || line.startsWith("Elapsed") || line.startsWith("Stream ID");
  const isComment = line.startsWith("//") || line.startsWith("  //") || line.startsWith("#");
  const isArrow = line.includes("→") || line.includes("←") || line.startsWith("  [-]") || line.startsWith("  [+]") || line.startsWith("  [~]");

  const cls = isCmd ? "text-[var(--green)]"
    : isTick ? "text-[var(--green)]"
    : isCross ? "text-[#ef4444]"
    : isError && !isLabel ? "text-[#ef4444]"
    : isArrow ? "text-[var(--gold)]"
    : isLabel ? "text-[var(--purple)] opacity-80"
    : isComment ? "text-[var(--muted)] opacity-70 italic"
    : "text-[var(--text)] opacity-75";

  return (
    <motion.div
      key={index}
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay: index * 0.018 }}
      className={`font-mono text-[10.5px] leading-[1.7] whitespace-pre ${cls}`}
      aria-hidden={line === ""}
    >
      {line || " "}
    </motion.div>
  );
}

/* ── Phase types ────────────────────────────────────── */
type Phase = "idle" | "scanning" | "analyzing" | "done";

/* ── Main demo page ─────────────────────────────────── */
export default function DemoPage() {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [visibleSteps, setVisibleSteps] = useState(0);
  const [showFix, setShowFix] = useState(false);
  const analysisRef = useRef<HTMLDivElement>(null);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const scenario = SCENARIOS[selectedIdx];

  const clearTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
  };

  const handleSelectScenario = (idx: number) => {
    if (idx === selectedIdx) return;
    clearTimers();
    setSelectedIdx(idx);
    setPhase("idle");
    setVisibleSteps(0);
    setShowFix(false);
  };

  const runAnalysis = useCallback(() => {
    if (phase === "scanning" || phase === "analyzing") return;
    clearTimers();
    setPhase("scanning");
    setVisibleSteps(0);
    setShowFix(false);

    // Scroll analysis panel into view on mobile
    if (analysisRef.current && window.innerWidth < 768) {
      setTimeout(() => analysisRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 200);
    }

    const t0 = setTimeout(() => {
      setPhase("analyzing");
      const stepsCount = scenario.steps.length;

      for (let i = 0; i < stepsCount; i++) {
        const t = setTimeout(() => {
          setVisibleSteps(i + 1);
        }, 700 * i);
        timerRefs.current.push(t);
      }

      const fixTimer = setTimeout(() => {
        setShowFix(true);
        setPhase("done");
      }, 700 * stepsCount + 300);
      timerRefs.current.push(fixTimer);
    }, 1100);
    timerRefs.current.push(t0);
  }, [phase, scenario.steps.length]);

  // Cleanup on unmount
  useEffect(() => () => clearTimers(), []);

  const isRunning = phase === "scanning" || phase === "analyzing";
  const stepCount = scenario.steps.length;

  return (
    <main className="bg-[var(--bg)] text-[var(--text)] min-h-screen">

      {/* Grid background */}
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern bg-grid-md opacity-[0.18] animate-grid-pulse z-0" />

      {/* ── Nav ──────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[rgba(5,5,8,0.88)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--text)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] rounded">
            <ArrowLeft size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          <Logo />
          <a
            href="https://github.com/nayrbryanGaming/anchor-debugger-skill"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm border border-[var(--border)] rounded-lg px-3 py-1.5 text-[var(--muted)] hover:text-[var(--text)] hover:border-[var(--purple)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)]"
            aria-label="Open GitHub repository"
          >
            <GitBranch size={12} aria-hidden="true" /> GitHub
          </a>
        </div>
      </header>

      <div className="relative z-10">

        {/* ── Hero ─────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="max-w-3xl mx-auto px-6 pt-16 pb-10 text-center"
        >
          <motion.div variants={scaleIn} className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-[var(--border)] text-xs text-[var(--muted)] bg-[rgba(12,12,20,0.7)]">
            <Terminal size={11} aria-hidden="true" className="text-[var(--green)]" />
            Interactive simulation — no install required
          </motion.div>

          <motion.h1 variants={fadeUp} className="font-display font-bold text-3xl md:text-[44px] leading-tight mb-4">
            Run the skill against a real Anchor error.
          </motion.h1>

          <motion.p variants={fadeUp} className="text-[var(--muted)] text-base leading-relaxed max-w-xl mx-auto">
            Pick one of the six scenarios below. The simulation shows exactly how anchor.debug reads a failed transaction, locates the root cause, and generates a targeted fix — step by step.
          </motion.p>
        </motion.section>

        {/* ── How it works ─────────────────────────── */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="max-w-3xl mx-auto px-6 mb-12"
        >
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: "01", label: "Pick a scenario", desc: "Six real Anchor error types from production programs" },
              { n: "02", label: "Read the error log", desc: "The exact output you would see in your terminal" },
              { n: "03", label: "Run the analysis", desc: "Watch the skill trace the root cause and produce a fix" },
            ].map((step, i) => (
              <motion.div key={step.n} variants={fadeUp} custom={i} className="text-center p-4 rounded-xl border border-[var(--border)] bg-[rgba(12,12,20,0.5)]">
                <div className="font-mono text-2xl font-bold text-[var(--purple)] mb-1.5 opacity-60">{step.n}</div>
                <div className="font-semibold text-sm text-[var(--text)] mb-1">{step.label}</div>
                <div className="text-[var(--muted)] text-xs leading-relaxed">{step.desc}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── Scenario selector ────────────────────── */}
        <section className="max-w-6xl mx-auto px-6 mb-8" aria-label="Scenario selector">
          <p className="text-xs font-mono text-[var(--muted)] mb-3 uppercase tracking-widest">
            Select scenario
          </p>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5"
            role="radiogroup"
            aria-label="Debug scenarios"
          >
            {SCENARIOS.map((s, i) => {
              const Icon = s.icon;
              const isActive = selectedIdx === i;
              return (
                <TiltCard key={s.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectScenario(i)}
                    role="radio"
                    aria-checked={isActive}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
                      isActive
                        ? "border-[var(--purple)] bg-[rgba(153,69,255,0.1)]"
                        : "border-[var(--border)] bg-[rgba(12,12,20,0.5)] hover:border-[rgba(153,69,255,0.4)]"
                    }`}
                  >
                    <Icon size={16} style={{ color: s.color }} aria-hidden="true" className="mb-2" />
                    <div className="font-semibold text-xs text-[var(--text)] leading-tight mb-1">{s.title}</div>
                    <div className="font-mono text-[9px] text-[var(--muted)] leading-tight opacity-80">{s.tag}</div>
                    {isActive && (
                      <motion.div
                        layoutId="scenario-indicator"
                        className="mt-2 w-full h-[2px] rounded-full bg-[var(--purple)]"
                        style={{ backgroundColor: s.color }}
                      />
                    )}
                  </button>
                </TiltCard>
              );
            })}
          </div>
        </section>

        {/* ── Main interactive panel ───────────────── */}
        <section className="max-w-6xl mx-auto px-6 pb-4" aria-label="Interactive debug panel">

          {/* Selected scenario description */}
          <AnimatePresence mode="wait">
            <motion.div
              key={scenario.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="mb-4 p-4 rounded-xl border border-[var(--border)] bg-[rgba(12,12,20,0.5)] flex items-start gap-3"
            >
              <scenario.icon size={16} style={{ color: scenario.color }} aria-hidden="true" className="mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-sm text-[var(--text)]">{scenario.title}</span>
                <span className="mx-2 text-[var(--border)]">/</span>
                <span className="font-mono text-xs text-[var(--muted)]">{scenario.tag}</span>
                <p className="text-[var(--muted)] text-sm mt-1 leading-relaxed">{scenario.description}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="grid md:grid-cols-2 gap-4">

            {/* ── Left: Error log + Run button ─────── */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest">Error log</span>
                <span className="text-xs text-[var(--muted)] font-mono">{scenario.errorLog.length} lines</span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={scenario.id + "-log"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="terminal-block flex-1 relative overflow-hidden"
                  aria-label="Error log output"
                  role="log"
                  aria-live="polite"
                >
                  {/* Scan line inside terminal */}
                  <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-[var(--purple)] to-transparent opacity-30 animate-scan-line pointer-events-none" />
                  <div className="terminal-dots mb-4" />
                  <div className="overflow-x-auto">
                    {scenario.errorLog.map((line, i) => (
                      <LogLine key={`${scenario.id}-${i}`} line={line} index={i} />
                    ))}
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Run Analysis button */}
              <motion.button
                type="button"
                onClick={runAnalysis}
                disabled={isRunning}
                whileHover={!isRunning ? { scale: 1.02, boxShadow: "0 0 28px rgba(153,69,255,0.4)" } : {}}
                whileTap={!isRunning ? { scale: 0.97 } : {}}
                className={`flex items-center justify-center gap-2.5 w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)] ${
                  isRunning
                    ? "bg-[rgba(153,69,255,0.2)] text-[var(--purple)] border border-[rgba(153,69,255,0.3)] cursor-not-allowed"
                    : phase === "done"
                    ? "bg-[rgba(153,69,255,0.15)] text-[var(--purple)] border border-[var(--purple)] hover:bg-[rgba(153,69,255,0.25)]"
                    : "bg-[var(--purple)] text-white border border-[var(--purple)] hover:bg-[rgba(153,69,255,0.85)]"
                }`}
                aria-live="polite"
                aria-label={isRunning ? "Analysis running" : phase === "done" ? "Run analysis again" : "Run analysis"}
              >
                {phase === "scanning" && (
                  <>
                    <Loader2 size={15} aria-hidden="true" className="animate-spin" />
                    Scanning transaction...
                  </>
                )}
                {phase === "analyzing" && (
                  <>
                    <Loader2 size={15} aria-hidden="true" className="animate-spin" />
                    Analyzing — {visibleSteps}/{stepCount} steps
                  </>
                )}
                {phase === "idle" && (
                  <>
                    <Play size={14} aria-hidden="true" className="fill-white" />
                    Run analysis
                  </>
                )}
                {phase === "done" && (
                  <>
                    <RotateCcw size={14} aria-hidden="true" />
                    Run again
                  </>
                )}
              </motion.button>
            </div>

            {/* ── Right: Analysis output ───────────── */}
            <div className="flex flex-col gap-3" ref={analysisRef}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-[var(--muted)] uppercase tracking-widest">Analysis</span>
                {phase !== "idle" && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`text-xs font-mono ${phase === "done" ? "text-[var(--green)]" : "text-[var(--purple)]"}`}
                    aria-live="polite"
                  >
                    {phase === "done" ? "complete" : "running..."}
                  </motion.span>
                )}
              </div>

              <div
                className="terminal-block relative min-h-[200px] flex-1"
                aria-label="Analysis output"
                aria-live="polite"
                role="region"
              >
                <div className="terminal-dots mb-4" />

                {phase === "idle" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-40 gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl border border-[var(--border)] flex items-center justify-center">
                      <Play size={16} aria-hidden="true" className="text-[var(--muted)]" />
                    </div>
                    <p className="text-[var(--muted)] text-xs text-center font-mono">
                      Click "Run analysis" to start the debug session
                    </p>
                  </motion.div>
                )}

                {phase === "scanning" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col gap-3"
                  >
                    <div className="font-mono text-xs text-[var(--green)] flex items-center gap-2">
                      <span className="animate-blink">█</span>
                      Reading instruction trace...
                    </div>
                    {[48, 72, 60].map((w, i) => (
                      <div key={i} className="h-3 rounded animate-shimmer" style={{ width: `${w}%`, background: "var(--surface)" }} />
                    ))}
                  </motion.div>
                )}

                {(phase === "analyzing" || phase === "done") && (
                  <div className="flex flex-col gap-0">
                    {/* Step-by-step analysis */}
                    <div className="space-y-2.5" role="list" aria-label="Analysis steps">
                      {scenario.steps.map((step, i) => (
                        <AnimatePresence key={i}>
                          {i < visibleSteps && (
                            <motion.div
                              role="listitem"
                              initial={{ opacity: 0, x: -16, height: 0 }}
                              animate={{ opacity: 1, x: 0, height: "auto" }}
                              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                              className="flex items-start gap-2.5"
                            >
                              {/* Step indicator */}
                              <div
                                className="mt-[2px] w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                                style={{ background: `${step.color}20`, color: step.color }}
                              >
                                <StepIcon type={step.icon} size={11} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[11px] text-[var(--text)] leading-tight">{step.label}</div>
                                <div className="font-mono text-[10.5px] text-[var(--muted)] leading-snug mt-0.5">{step.detail}</div>
                              </div>
                              {/* Completion pip */}
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                                className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                                style={{ backgroundColor: step.color + "30", color: step.color }}
                              >
                                <Check size={8} aria-hidden="true" />
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      ))}
                    </div>

                    {/* Progress bar */}
                    <div className="mt-4 mb-0">
                      <div className="h-[2px] bg-[var(--border)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-[var(--green)] rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: `${(visibleSteps / stepCount) * 100}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                          aria-hidden="true"
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[9px] font-mono text-[var(--muted)]">
                          {visibleSteps}/{stepCount} steps
                        </span>
                        {phase === "done" && (
                          <motion.span
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="text-[9px] font-mono text-[var(--green)] flex items-center gap-0.5"
                          >
                            <CheckCircle2 size={9} aria-hidden="true" /> root cause found
                          </motion.span>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Fix code block ───────────────────────────── */}
          <AnimatePresence>
            {showFix && (
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-4 rounded-xl border border-[var(--green)] bg-[rgba(20,241,149,0.04)] overflow-hidden"
                role="region"
                aria-label="Suggested fix"
              >
                {/* Fix header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(20,241,149,0.15)] bg-[rgba(20,241,149,0.06)]">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 size={14} aria-hidden="true" className="text-[var(--green)]" />
                    <span className="font-semibold text-sm text-[var(--green)]">Fix</span>
                    <span className="text-[var(--border)]">/</span>
                    <span className="font-mono text-xs text-[var(--muted)]">{scenario.fix.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[var(--muted)] bg-[var(--surface)] px-2 py-0.5 rounded">{scenario.fix.lang}</span>
                    <CopyBtn text={scenario.fix.code} label="fix" />
                  </div>
                </div>

                {/* Code */}
                <div className="p-4 overflow-x-auto">
                  <pre className="font-mono text-[11px] leading-[1.75] text-[var(--text)] opacity-90" aria-label="Fix code">
                    {scenario.fix.code.split("\n").map((line, i) => {
                      const isComment = line.trim().startsWith("//") || line.trim().startsWith("#");
                      const isKeyword = /^(pub fn|let|const|use |impl |struct |async |await|return|Ok|Err|require!|emit!)/.test(line.trim());
                      const cls = isComment ? "text-[var(--muted)] opacity-70 italic"
                        : isKeyword ? "text-[var(--purple)]"
                        : "text-[var(--text)]";
                      return (
                        <span key={i} className={`block ${cls}`}>
                          {line || " "}
                        </span>
                      );
                    })}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* ── Feature callouts ─────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={stagger}
          className="max-w-6xl mx-auto px-6 py-16"
          aria-label="Skill capabilities"
        >
          <motion.h2 variants={fadeUp} className="font-display font-bold text-2xl md:text-3xl mb-3 text-center">
            What each skill file handles
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[var(--muted)] text-sm text-center mb-10 max-w-xl mx-auto">
            SKILL.md routes your question to the right file automatically. Here is what each file covers.
          </motion.p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { file: "tx-debugging.md", color: "var(--purple)", icon: Terminal, covers: "Failed transaction decode, log parsing, instruction trace reconstruction, CPI call chains" },
              { file: "error-catalog.md", color: "#ef4444", icon: AlertCircle, covers: "300+ Anchor error codes with root cause explanations and account-level context" },
              { file: "compute-optimization.md", color: "var(--gold)", icon: Cpu, covers: "CU profiling, hotspot detection, ComputeBudgetProgram setup, batch splitting" },
              { file: "upgrade-safety.md", color: "#3b82f6", icon: Shield, covers: "Instruction discriminator analysis, live fund risk assessment, safe migration checklist" },
              { file: "payfi-patterns.md", color: "var(--green)", icon: DollarSign, covers: "Escrow, streaming, x402 agent payments, yield-bearing accounts, conditional transfers" },
              { file: "payfi-cu-pitfalls.md", color: "var(--purple)", icon: Zap, covers: "High-frequency payment CU edge cases, streaming stall detection, CPI failure propagation" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <TiltCard key={item.file}>
                  <motion.div
                    variants={scaleIn}
                    custom={i}
                    className="h-full p-4 rounded-xl border border-[var(--border)] bg-[rgba(12,12,20,0.5)] hover:border-[rgba(153,69,255,0.3)] transition-colors glow-border card-3d"
                  >
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${item.color}20` }}>
                        <Icon size={15} style={{ color: item.color }} aria-hidden="true" />
                      </div>
                      <code className="font-mono text-[11px] text-[var(--text)]">{item.file}</code>
                    </div>
                    <p className="text-[var(--muted)] text-xs leading-relaxed">{item.covers}</p>
                  </motion.div>
                </TiltCard>
              );
            })}
          </div>
        </motion.section>

        {/* ── Install CTA ──────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={stagger}
          className="max-w-2xl mx-auto px-6 py-16 text-center"
          aria-label="Installation"
        >
          <motion.h2 variants={fadeUp} className="font-display font-bold text-2xl md:text-3xl mb-3">
            Run it against your own errors.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-[var(--muted)] text-sm mb-8 leading-relaxed">
            Install the skill once and use it in any Claude Code session. It reads your actual transaction logs — not a simulation.
          </motion.p>

          <motion.div variants={fadeUp} className="terminal-block text-left mb-6">
            <div className="terminal-dots mb-3" />
            <div className="flex items-center justify-between">
              <code className="font-mono text-[12px] text-[var(--green)]">
                git clone https://github.com/nayrbryanGaming/anchor-debugger-skill ~/.claude/skills/anchor-debug
              </code>
              <CopyBtn text="git clone https://github.com/nayrbryanGaming/anchor-debugger-skill ~/.claude/skills/anchor-debug" />
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://github.com/nayrbryanGaming/anchor-debugger-skill"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--purple)] text-white font-semibold text-sm hover:bg-[rgba(153,69,255,0.85)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              <ExternalLink size={13} aria-hidden="true" /> View on GitHub
            </a>
            <Link
              href="/"
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-[var(--border)] text-[var(--text)] font-semibold text-sm hover:border-[var(--purple)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg)]"
            >
              <ArrowLeft size={13} aria-hidden="true" /> Back to landing
            </Link>
          </motion.div>
        </motion.section>

        {/* ── Footer ───────────────────────────────── */}
        <footer className="border-t border-[var(--border)] py-8">
          <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo />
            <p className="text-xs text-[var(--muted)] text-center">
              Superteam Brasil Bounty submission &middot; MIT license &middot; Solana AI Kit
            </p>
            <a
              href="https://github.com/solanabr/skill-bounty/pull/21"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--muted)] hover:text-[var(--purple)] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--purple)] rounded"
            >
              <GitBranch size={10} aria-hidden="true" /> PR #21
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}
