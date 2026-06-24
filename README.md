# anchor-debugger-skill

A production-grade Claude Code / AI agent skill for Solana and Anchor framework developers. Diagnoses failing transactions, decodes cryptic error codes, optimizes compute units, verifies program upgrade safety, and prevents the most common Anchor pitfalls — all without leaving your editor.

## The problem this solves

Every Solana engineer building with Anchor hits the same daily friction:

- **Transaction failed with `0x1775`** — what does that mean and how do I fix it?
- **"Compute budget exceeded"** — where is it burning CUs and what do I change?
- **Upgrading a program** — will this struct change corrupt existing accounts?
- **PDA derivation mismatch** — why does the client and program disagree on the address?

These aren't rare edge cases. They're the primary friction points that slow down every Anchor developer every day. No existing Solana AI Kit skill covers them.

## What's included

```
anchor-debugger-skill/
├── README.md
├── install.sh                      # one-command install
├── skill/
│   ├── SKILL.md                    # smart router (token-efficient entry point)
│   ├── tx-debugging.md             # diagnose failing transactions + decode all error codes
│   ├── compute-optimization.md     # CU profiling, zero-copy, budget setting
│   ├── error-catalog.md            # full Anchor/System/Token error reference (300+ entries)
│   ├── upgrade-safety.md           # struct migration, IDL diff, breaking change detection
│   ├── simulation.md               # pre-flight simulation patterns
│   └── common-pitfalls.md          # PDA bugs, account reloading, overflow, and more
├── agents/
│   └── anchor-debugger.md          # agent definition for Claude Code
├── commands/
│   ├── debug-tx.md                 # /debug-tx <SIGNATURE>
│   ├── optimize-cu.md              # /optimize-cu <FILE>
│   └── check-upgrade.md            # /check-upgrade <NEW_IDL> <OLD_IDL>
└── rules/
    └── anchor-rules.md             # coding rules enforced during code generation
```

## Installation

```bash
curl -sSL https://raw.githubusercontent.com/nayrbryangaming3/anchor-debugger-skill/main/install.sh | bash
```

Or manually:

```bash
git clone https://github.com/nayrbryangaming3/anchor-debugger-skill.git
cd anchor-debugger-skill
./install.sh
```

## Usage

Once installed, the skill activates automatically in Claude Code when you're working in an Anchor project. You can also invoke it directly:

**Diagnose a failed transaction:**
```
/debug-tx 5KtP...xR2m --cluster devnet
```

**Profile and optimize compute:**
```
/optimize-cu ./programs/vault/src/instructions/deposit.rs
```

**Check upgrade safety:**
```
/check-upgrade ./target/idl/vault.json --program-id <ID> --cluster mainnet-beta
```

**Ask naturally:**
```
Why did my transaction fail with 0x1775?
How do I reduce CU usage in this Anchor instruction?
Is it safe to upgrade after adding this field to VaultAccount?
```

## Stack covered

- **Anchor** 0.31.x (2026 LTS)
- **Solana / Agave** 2.x
- **@coral-xyz/anchor** 0.31.x
- **@solana/web3.js** v2 (new kit) + v1 legacy
- **Rust** 1.78+
- **Token-2022** and classic SPL Token

## Skill design

Progressive and token-efficient — SKILL.md routes to only the relevant sub-skill file instead of loading everything. A question about CU optimization doesn't load the error catalog. A failing transaction question doesn't load upgrade safety docs.

## License

MIT
