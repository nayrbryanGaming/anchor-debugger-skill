# PayFi on Solana — Overview & Landscape

## What is PayFi

PayFi (Payment Finance) is Solana's emerging category where on-chain payment primitives meet real yield and programmable money. It covers:

- **Streaming payments** — per-second or per-slot disbursements (salaries, subscriptions, grants)
- **Escrow with conditions** — time-locked, oracle-gated, or milestone-based releases
- **Agent payments (x402)** — machine-to-machine payments using HTTP 402 protocol for AI agent APIs
- **Yield-bearing payment rails** — settling in mSOL/JitoSOL/USDY so funds earn while in flight
- **Stablecoin settlement** — USDC, PYUSD, EURC multi-hop routing across Solana programs
- **Conditional payments** — release on proof-of-work, oracle price, governance vote

## Why PayFi programs are harder to debug

Payment programs have constraints that typical DeFi programs don't:

| Property | Typical DeFi | PayFi |
|----------|-------------|-------|
| Transaction ordering | Best-effort | Critical — double-spend risk |
| Time dependency | Rare | Core logic — clock drift breaks everything |
| Rent sensitivity | Tolerated | Fatal — escrow losing rent = locked funds |
| CU predictability | Helpful | Required — payment batches can't fail mid-flight |
| Upgrade risk | High | Catastrophic — live payment streams broken |
| Priority fee | Optional | Mandatory — payment must land before timeout |

## Key PayFi protocols on Solana (2026)

### Streaming / scheduled
- **Streamflow** — token streaming (vesting, payroll, subscriptions)
- **Zebec** — real-time payroll streaming
- **Clockwork** (deprecated → use native cron alternatives)
- **Dialect** — notification + payment combos

### Escrow / conditional
- **Squads** — multisig treasury + proposal-gated releases
- **Light Protocol** — ZK-compressed escrows for privacy
- **Solana Escrow (native)** — simple PDA escrow pattern

### Agent payments (x402)
- **x402 protocol** — HTTP 402 "Payment Required" for AI agent APIs
- **Claude + Coinbase** — first major x402 implementation
- Agents pay Solana programs directly for compute/data access

### Stablecoins in PayFi
- **USDC** (Circle) — primary settlement currency
- **PYUSD** (PayPal) — consumer-oriented stablecoin
- **USDY** (Ondo) — yield-bearing, commonly used in PayFi escrows
- **EURC** — Euro stablecoin for cross-border payments

### Yield-bearing rails
- **mSOL** (Marinade) / **JitoSOL** — SOL LSTs used as collateral in payment escrows
- Funds earn ~7% APY while sitting in escrow

## PayFi-specific Anchor patterns to know

```
payfi-tx-debugging.md   → diagnose failed payment flows (streaming stop, escrow lock, x402 fail)
payfi-patterns.md       → escrow, streaming, x402, yield-bearing patterns in Anchor
payfi-cu-pitfalls.md    → CU optimization + timing/rent/priority-fee pitfalls
payfi-simulation.md     → pre-flight simulation for payment scenarios
```
