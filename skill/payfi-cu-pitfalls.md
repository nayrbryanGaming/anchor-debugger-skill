# PayFi CU Optimization & Pitfalls — Anchor PayFi Debugger Skill

## Why PayFi programs have tighter CU constraints

Payment programs differ from typical DeFi in how CU failures hurt:

- **Batch settlements**: if one tx in a batch fails mid-flight, partial settlement leaves funds in limbo
- **Stream withdrawals**: failing mid-withdraw means the recipient is left without funds they've earned
- **x402 payments**: the AI agent's API call times out if the tx takes too long to land
- **High TPS escrow**: during peak load, 400k default CU limit may not be honored — need explicit limits

## Priority fees: non-optional in PayFi

Unlike yield farming, payment transactions have deadlines. A stream withdrawal that fails to land before the next pay period causes user harm.

### Dynamic priority fee for PayFi

```typescript
import { Connection, ComputeBudgetProgram, PublicKey } from "@solana/web3.js";

async function getPayFiPriorityFee(
  connection: Connection,
  writableAccounts: PublicKey[]
): Promise<number> {
  // Get recent fees for the accounts being written
  const recentFees = await connection.getRecentPrioritizationFees({
    lockedWritableAccounts: writableAccounts,
  });

  if (recentFees.length === 0) return 10_000; // fallback: 10k μlamports

  const fees = recentFees
    .map((f) => f.prioritizationFee)
    .filter((f) => f > 0)
    .sort((a, b) => a - b);

  // For payment txs: use 90th percentile (not 75th) — we need to land reliably
  const p90 = fees[Math.floor(fees.length * 0.9)];
  
  // Floor at 5,000 μlamports for PayFi — never submit a "free" payment tx
  return Math.max(p90 ?? 0, 5_000);
}

// Usage in a payment transaction:
const priorityFee = await getPayFiPriorityFee(connection, [escrowVault, recipientToken]);
const cuPrice = ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee });
const cuLimit = ComputeBudgetProgram.setComputeUnitLimit({ units: 85_000 }); // pre-measured
```

### Cost calculation for payment batches

```typescript
// Before batching 100 stream withdrawals:
const priorityFeePerTx = priorityFee * cuLimit; // μlamports
const totalFeeSOL = (priorityFeePerTx * numTxs) / 1e15; // convert to SOL
console.log(`Batch cost: ${totalFeeSOL.toFixed(6)} SOL`);
// If too high — increase batch size or lower CU limit
```

## Clock drift pitfall (most dangerous PayFi bug)

Solana's `unix_timestamp` in the `Clock` sysvar can **drift up to ±25% of the epoch duration** from wall-clock time. For payment programs with second-level precision, this is critical.

```rust
// WRONG — assuming Clock matches wall clock precisely
require!(
    Clock::get()?.unix_timestamp >= escrow.unlock_at,
    EscrowError::NotUnlockedYet
);
// On-chain clock may be 2-5 minutes behind wall clock — user can't release even though
// their real-world deadline has passed.

// BETTER — add a grace buffer for UX
const CLOCK_DRIFT_BUFFER_SECS: i64 = 300; // 5 minute buffer

require!(
    Clock::get()?.unix_timestamp + CLOCK_DRIFT_BUFFER_SECS >= escrow.unlock_at,
    EscrowError::NotUnlockedYet
);

// BEST — document the buffer explicitly and emit it as an event so off-chain
// watchers can account for it when calculating when to send the tx
```

**Off-chain: how to get accurate on-chain time**
```typescript
// DON'T use Date.now() to predict unlock
// DO use the chain's own block time
const slot = await connection.getSlot("finalized");
const blockTime = await connection.getBlockTime(slot);
const onChainNow = blockTime ?? Math.floor(Date.now() / 1000);

if (onChainNow >= escrow.unlockAt) {
  // Safe to send release tx
}
```

## Rent pitfall: escrow accounts must stay rent-exempt

The most catastrophic PayFi bug: an escrow account loses rent-exemption and gets garbage collected, locking the funds forever.

### How it happens

```rust
// DANGEROUS — depositor's lamports fund rent, but if close = depositor
// reclaims lamports early and vault still has tokens, rent can drop below minimum
#[account(
    mut,
    close = depositor,  // ← closes IMMEDIATELY, even if vault still has funds
)]
pub escrow: Account<'info, Escrow>,
```

### Prevention

```rust
// 1. Never close the escrow account before draining the vault
// The pattern: drain vault → then close escrow (separate instructions)

// 2. At stream/escrow creation, always calculate minimum rent
pub fn create_escrow(ctx: Context<CreateEscrow>, ...) -> Result<()> {
    let rent = Rent::get()?;
    let min_rent = rent.minimum_balance(8 + Escrow::INIT_SPACE);
    
    require!(
        ctx.accounts.escrow.to_account_info().lamports() >= min_rent,
        EscrowError::InsufficientRent
    );
    // ...
}

// 3. For long-lived stream accounts: add a top-up instruction
pub fn top_up_rent(ctx: Context<TopUpRent>, extra_lamports: u64) -> Result<()> {
    let ix = solana_program::system_instruction::transfer(
        ctx.accounts.payer.key,
        ctx.accounts.stream.to_account_info().key,
        extra_lamports,
    );
    solana_program::program::invoke(
        &ix,
        &[
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.stream.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    Ok(())
}
```

## CU optimization for high-frequency payment programs

### Problem: batch settlement burns too many CUs

A common PayFi pattern: settle N payments in one transaction (batch). Each iteration is a token CPI (~5,000 CU). At 20 settlements, that's 100,000+ CUs just for transfers.

```rust
// EXPENSIVE — N token transfers in one instruction
for payment in payments.iter() {
    token::transfer(cpi_ctx, payment.amount)?;  // ~5,000 CU each
}

// CHEAPER option 1: use Token-2022 batch transfer if all same mint
// (Reduces CPI overhead per transfer)

// CHEAPER option 2: limit batch size and use multiple txs
// 10 payments × 5,000 CU = 50,000 CU → comfortable with 85,000 CU budget

// CHEAPER option 3: zero-copy for the payment queue
#[account(zero_copy)]
#[repr(C)]
pub struct PaymentQueue {
    pub head: u64,
    pub tail: u64,
    pub payments: [PendingPayment; 50],  // fixed max, zero-copy
}
// Avoids Vec<T> borsh deserialization overhead for large queues
```

### CU breakdown for common PayFi operations

| Operation | Approx CU |
|-----------|----------|
| Simple token transfer (CPI) | 4,500–6,000 |
| ATA creation (CPI) | 25,000–35,000 |
| Time check (Clock::get()) | ~300 |
| Pyth price read | ~2,000–5,000 |
| Escrow account load (Account<Escrow>) | ~500–2,000 |
| Stream amount calculation | ~200 |
| Event emit | ~500 |
| PDA signing overhead | ~1,000 |
| SHA256 (reference hash) | ~450 |

**For an x402 payment instruction (single payment + record):**
```
~2,100 base
+ ~720 signature
+ ~1,000 PDA signing
+ ~5,000 token transfer CPI
+ ~500 payment record write
+ ~450 SHA256 reference check
= ~9,770 CU → budget: 12,000 CU (generous)
```

**For a stream withdrawal:**
```
~2,100 base
+ ~720 signature
+ ~2,000 account loads
+ ~300 clock read
+ ~200 math
+ ~5,000 token transfer CPI
= ~10,320 CU → budget: 15,000 CU
```

## High TPS congestion pitfalls

### Transaction ordering — use versioned + FIFO queues

Under congestion, multiple stream withdrawals from the same stream can arrive out of order. If both read `total_withdrawn` from the same slot, you get double-spend:

```rust
// DANGEROUS under concurrent load
// Two txs both read total_withdrawn = 100
// Both think claimable = 50
// Both succeed → 100 tokens claimed from a 50-token claimable pool

// PREVENTION: use Anchor's `realloc_zero` or an atomic slot check
pub fn withdraw(ctx: Context<Withdraw>) -> Result<()> {
    let stream = &mut ctx.accounts.stream;
    let slot = Clock::get()?.slot;
    
    // Prevent same-slot double-withdraw
    require!(slot > stream.last_withdraw_slot, StreamError::AlreadyWithdrawnThisSlot);
    stream.last_withdraw_slot = slot;
    
    // ... rest of withdraw logic ...
}
```

### Rate limiting for payment programs

```rust
#[account]
pub struct RateLimitedStream {
    pub max_per_slot: u64,
    pub withdrawn_this_slot: u64,
    pub last_slot: u64,
    // ...
}

pub fn rate_limited_withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
    let stream = &mut ctx.accounts.stream;
    let current_slot = Clock::get()?.slot;
    
    // Reset counter on new slot
    if current_slot > stream.last_slot {
        stream.withdrawn_this_slot = 0;
        stream.last_slot = current_slot;
    }
    
    require!(
        stream.withdrawn_this_slot.checked_add(amount).ok_or(StreamError::Overflow)? <= stream.max_per_slot,
        StreamError::RateLimitExceeded
    );
    
    stream.withdrawn_this_slot = stream.withdrawn_this_slot
        .checked_add(amount)
        .ok_or(StreamError::Overflow)?;
    
    Ok(())
}
```
