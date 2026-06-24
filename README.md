# anchor-payfi-debugger-skill

A production-grade Claude Code / AI agent skill for Solana developers building PayFi and Anchor programs. Diagnoses failing transactions in payment flows, decodes cryptic errors, optimizes compute units for high-frequency payment programs, provides production-ready escrow/streaming/x402 patterns, and prevents the pitfalls that uniquely destroy payment programs — clock drift, rent loss, double-spends, and unsafe upgrades.

**Cross-domain: Anchor Dev Tooling × PayFi.** The only skill that covers both sides.

## The problem this solves

Every Solana engineer building PayFi hits two layers of pain:

**Layer 1 — Anchor debugging (daily friction for every builder):**
- Transaction failed with `0x1775` — what does that mean?
- "Compute budget exceeded" — where are the CUs going?
- PDA derivation mismatch between client and program
- Is this struct change safe to upgrade on mainnet?

**Layer 2 — PayFi-specific failures (catastrophic when they hit):**
- Escrow won't unlock even though the time has passed → *clock drift*
- Stream stopped mid-month → *escrow lost rent-exemption*
- x402 payment rejected → *quote expired before tx landed*
- Batch settlement failed for 30 of 100 recipients → *CU budget exceeded mid-batch*
- Stablecoin amount mismatch → *6 vs 9 decimal confusion*

No existing Solana AI Kit skill covers either of these areas. This covers both.

## What's included

```
anchor-payfi-debugger-skill/
├── README.md
├── install.sh                         # one-command install
├── skill/
│   ├── SKILL.md                       # smart router — token-efficient
│   │
│   ├── ── Core Anchor Debugging ──
│   ├── tx-debugging.md                # diagnose tx failures + decode all error codes
│   ├── compute-optimization.md        # CU profiling, zero-copy, budget setting
│   ├── error-catalog.md               # 300+ Anchor/System/Token errors w/ causes+fixes
│   ├── upgrade-safety.md              # struct migration, IDL diff, breaking change detect
│   ├── simulation.md                  # pre-flight simulation patterns
│   ├── common-pitfalls.md             # PDA bugs, account reload, overflow, close
│   │
│   └── ── PayFi Layer ──
│       ├── payfi-overview.md          # PayFi landscape, protocols, why it's different
│       ├── payfi-tx-debugging.md      # escrow unlock fails, stream stop, x402 rejection
│       ├── payfi-patterns.md          # escrow, streaming, x402, yield-bearing patterns
│       ├── payfi-cu-pitfalls.md       # clock drift, rent, priority fees, high-TPS
│       └── payfi-simulation.md        # pre-flight for payment flows + monitoring
├── agents/
│   └── anchor-debugger.md             # Claude Code agent definition
├── commands/
│   ├── debug-tx.md                    # /debug-tx <SIGNATURE>
│   ├── optimize-cu.md                 # /optimize-cu <FILE>
│   └── check-upgrade.md               # /check-upgrade <IDL> <OLD_IDL>
└── rules/
    └── anchor-rules.md                # coding rules for Anchor + PayFi programs
```

## Installation

```bash
curl -sSL https://raw.githubusercontent.com/nayrbryanGaming/anchor-debugger-skill/master/install.sh | bash
```

Or clone:

```bash
git clone https://github.com/nayrbryanGaming/anchor-debugger-skill.git
cd anchor-debugger-skill
./install.sh
```

## Usage

### Anchor debugging

```
/debug-tx 5KtP...xR2m --cluster devnet
/optimize-cu ./programs/vault/src/instructions/deposit.rs
/check-upgrade ./target/idl/escrow.json --program-id <ID> --cluster mainnet-beta
```

### PayFi patterns

```
Build me a time-locked USDC escrow in Anchor
Show me a safe streaming payment pattern that handles clock drift
How do I implement x402 agent payments in my Solana program?
My escrow unlock fails even though the time has passed — why?
How do I prevent rent from draining my payment stream account?
```

### Natural language

```
Why did my transaction fail with 0x1775?
How do I reduce CU usage in this Anchor instruction?
What's the difference between Clock::slot and unix_timestamp for payment locks?
Is it safe to upgrade after adding this field to my EscrowAccount?
How do I set priority fees for a batch payment settlement?
```

## Stack covered

- **Anchor** 0.31.x (2026 LTS)
- **Solana / Agave** 2.x
- **@coral-xyz/anchor** 0.31.x + **@solana/web3.js** v1 & v2
- **Rust** 1.78+
- **Token Program** + **Token-2022**
- **Pyth** price oracle (pull model)
- **x402** HTTP payment protocol
- **Squads** multisig v4
- **USDC / PYUSD / USDY / EURC** stablecoins

## Skill design

Progressive and token-efficient — SKILL.md routes to only the relevant sub-skill file. A CU question never loads the PayFi patterns file. An escrow question never loads the generic error catalog unless needed.

Two-layer coverage:
1. **Core Anchor layer** — universally useful for any Solana developer
2. **PayFi layer** — specialized for payment programs, streaming, escrow, and agent payments

## License

MIT
