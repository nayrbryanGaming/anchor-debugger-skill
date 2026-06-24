# Compute Unit Optimization — Anchor Debugger Skill

## Why CUs matter in 2026

Every Solana transaction has a **compute budget** (max 1.4M CUs per transaction, 400k per instruction by default). Exceeding it causes `ComputationalBudgetExceeded` failure. Higher CU usage also means:
- Higher priority fees (fee = CU limit × priority fee μLamports)
- Slower execution under congestion
- Risk of tx failure during network load

## Step 1 — Measure current CU usage

### In tests (most accurate)
```typescript
import * as anchor from "@coral-xyz/anchor";

const tx = await program.methods
  .myInstruction(args)
  .accounts({ ... })
  .rpc({ commitment: "confirmed" });

const txDetails = await program.provider.connection.getTransaction(tx, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0,
});

const cuUsed = txDetails?.meta?.computeUnitsConsumed;
console.log(`CUs consumed: ${cuUsed}`);
```

### With simulation
```typescript
const sim = await program.methods
  .myInstruction(args)
  .accounts({ ... })
  .simulate();

console.log(`CUs consumed (simulated): ${sim.raw[0]?.unitsConsumed}`);
```

### Using compute budget logger (Rust)
```rust
use solana_program::log::sol_log_compute_units;

pub fn process(ctx: Context<MyCtx>, data: MyData) -> Result<()> {
    sol_log_compute_units(); // logs CUs remaining at this point
    
    // ... expensive operation ...
    
    sol_log_compute_units(); // compare before/after
    Ok(())
}
```

## Step 2 — Set compute budget correctly

```typescript
import {
  ComputeBudgetProgram,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";

// Always request a specific CU limit (measured + 10-20% buffer)
const modifyComputeUnits = ComputeBudgetProgram.setComputeUnitLimit({
  units: 150_000, // your measured value + buffer
});

// Set priority fee (μLamports per CU)
const setPriorityFee = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: 1_000, // adjust based on network congestion
});

// Build versioned tx
const { blockhash } = await connection.getLatestBlockhash();
const message = new TransactionMessage({
  payerKey: payer.publicKey,
  recentBlockhash: blockhash,
  instructions: [
    modifyComputeUnits,
    setPriorityFee,
    ...yourInstructions,
  ],
}).compileToV0Message();

const tx = new VersionedTransaction(message);
```

## Step 3 — Common CU hogs and fixes

### 1. Account deserialization (biggest hidden cost)

Every `Account<T>` in your Accounts struct pays for deserialization. Large accounts with many fields are expensive.

**Fix**: Use `AccountInfo` + manual deserialization for read-only access to large accounts you only need one field from.

```rust
// EXPENSIVE — deserializes entire 500-byte struct
#[account(mut)]
pub pool: Account<'info, LargePool>,

// CHEAPER — only read the lamports/key you need
/// CHECK: we only need the key, validated manually
pub pool: UncheckedAccount<'info>,
// Then: require!(pool.key() == expected_pool_key, ErrorCode::InvalidPool);
```

### 2. Loops over vectors

```rust
// EXPENSIVE — O(n) with no early exit
for item in ctx.accounts.list.items.iter() {
    // ... process each
}

// CHEAPER — use iterator adapters, avoid clones
ctx.accounts.list.items
    .iter()
    .filter(|i| i.active)
    .map(|i| i.amount)
    .sum::<u64>()
```

### 3. Borsh serialization of large structs

```rust
// EXPENSIVE — storing many Strings (each has length prefix + heap)
#[account]
pub struct BadAccount {
    pub name: String,    // 4 + n bytes + heap alloc overhead
    pub symbol: String,
    pub uri: String,
}

// CHEAPER — fixed-size arrays
#[account]
pub struct GoodAccount {
    pub name: [u8; 32],    // always 32 bytes, zero-copy friendly
    pub symbol: [u8; 10],
    pub uri: [u8; 200],
}
```

### 4. SHA256 / hashing

Each SHA256 call costs ~450 CUs. Each Keccak256 ~312 CUs.

```rust
// If you call hash in a loop, cache results
// If you need cheap deduplication, use a sorted array + binary search
// instead of a hashmap (no hashing at all)
```

### 5. CPI overhead

Every CPI call costs a baseline ~1000 CUs regardless of what it does.

```rust
// Avoid CPI inside loops
// Batch token transfers using token-2022 batch extensions when possible
// Use Program::invoke vs invoke_signed carefully — invoke_signed costs more
```

### 6. `realloc` on every call

```rust
// BAD — reallocating on every update even when size doesn't change
#[account(mut, realloc = 8 + new_size, realloc::payer = payer, realloc::zero = false)]
pub my_account: Account<'info, MyAccount>,

// GOOD — only realloc when actually needed
// Check: if new_size > current_size { realloc } else { skip }
```

## Step 4 — Zero-copy accounts for large data

For accounts > 10KB or with tight CU budgets, use `#[account(zero_copy)]`:

```rust
use anchor_lang::prelude::*;

#[account(zero_copy)]
#[repr(C)]  // required for zero-copy
pub struct LargePool {
    pub positions: [Position; 1000],  // 1000 positions, zero-copy
    pub total_liquidity: u64,
    pub authority: Pubkey,
}

// In Accounts struct:
#[account(mut)]
pub pool: AccountLoader<'info, LargePool>,  // NOT Account<>

// In handler:
let mut pool = ctx.accounts.pool.load_mut()?;
pool.total_liquidity += amount;
// No deserialization cost — direct memory mapping
```

**Limitations**: zero-copy accounts cannot contain `Vec`, `String`, or heap types.

## Step 5 — Priority fee estimation (2026)

```typescript
// Get recent priority fees for your accounts
const fees = await connection.getRecentPrioritizationFees({
  lockedWritableAccounts: [yourWritableAccount],
});

// Use 75th percentile of recent fees
const sortedFees = fees
  .map((f) => f.prioritizationFee)
  .sort((a, b) => a - b);
const p75 = sortedFees[Math.floor(sortedFees.length * 0.75)];

const priorityFee = ComputeBudgetProgram.setComputeUnitPrice({
  microLamports: Math.max(p75, 1000), // floor at 1000 μlamports
});
```

## CU Budget quick reference

| Operation | Approx CU cost |
|-----------|---------------|
| Base tx overhead | ~2,100 |
| Each signature verify | ~720 |
| Each account load | ~100–500 (size-dependent) |
| CPI call (base) | ~1,000 |
| SHA256 hash | ~450 |
| Keccak256 hash | ~312 |
| secp256k1 verify | ~1,625 |
| Ed25519 verify | ~1,625 |
| Borsh serialize 100 bytes | ~50 |
| Token transfer (CPI) | ~4,000–6,000 |
| ATA creation (CPI) | ~25,000–35,000 |
| Realloc per call | ~500 |
