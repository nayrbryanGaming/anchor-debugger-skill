# PayFi Transaction Debugging — Anchor PayFi Debugger Skill

## Payment flow failures: taxonomy

| Failure type | Log signature | Root cause |
|-------------|--------------|------------|
| Escrow unlock denied | `ConstraintRaw` or custom error | Condition not met (time, oracle, multisig) |
| Stream stopped mid-flight | `InsufficientFunds` or `AccountNotEnoughLamports` | Escrow drained of rent or tokens |
| x402 payment rejected | custom error `6xxx` or `InvalidAmount` | Amount mismatch, wrong mint, expired quote |
| Stablecoin settlement fail | Token error `0x1` | Balance check vs amount rounding error |
| Yield claim failed | `ConstraintHasOne` or oracle error | Stale oracle price or wrong authority |
| Conditional release blocked | `RequireViolated` | Proof-of-work / oracle condition not satisfied |
| Priority fee tx dropped | No error — just not included | Fee too low under load, or wrong compute budget |

## Debugging escrow unlock failures

### Time-locked escrow

```
Program log: AnchorError caused by account: escrow. Error Code: ConstraintRaw. Error Number: 303.
Program log: Error Message: A raw constraint was violated.
```

This means your `constraint = clock.unix_timestamp >= escrow.unlock_at` is false.

**Debug steps:**
```typescript
// Check current on-chain time vs escrow unlock time
const clock = await program.provider.connection.getAccountInfo(
  new PublicKey("SysvarC1ock11111111111111111111111111111111")
);

// Easier: use getSlot and estimate
const slot = await program.provider.connection.getSlot();
const blockTime = await program.provider.connection.getBlockTime(slot);
console.log("Current on-chain time:", blockTime);
console.log("Escrow unlock_at:", escrow.unlockAt.toNumber());
console.log("Difference:", escrow.unlockAt.toNumber() - (blockTime ?? 0), "seconds");
```

**Common mistake — slot vs unix_timestamp mismatch:**
```rust
// WRONG — slot numbers are not time; slot 300,000,000 ≠ 300,000,000 seconds
constraint = Clock::get()?.slot >= escrow.unlock_slot,

// WRONG — slot drift: 400ms average but can spike to 600ms+
let unlock_slot = current_slot + (seconds * 2.5) as u64; // 2.5 slots/sec average, UNRELIABLE

// CORRECT — always use unix_timestamp for time-based locks
constraint = Clock::get()?.unix_timestamp >= escrow.unlock_at @ ErrorCode::EscrowNotUnlocked,
```

### Oracle-gated escrow failures

```
Program log: AnchorError... Error Code: OraclePriceStale. Error Number: 6003.
```

Check oracle freshness:
```rust
// Pyth price feed staleness check (2026 pattern)
use pyth_solana_receiver_sdk::price_update::{PriceUpdateV2, VerificationLevel};

pub fn release_on_price(ctx: Context<ReleaseFunds>) -> Result<()> {
    let price_update = &ctx.accounts.price_update;
    
    // Get price with maximum age of 60 seconds
    let price = price_update.get_price_no_older_than(
        &Clock::get()?,
        60, // max age in seconds
        &ctx.accounts.escrow.price_feed_id,
    )?;
    
    require!(
        price.price > ctx.accounts.escrow.trigger_price,
        ErrorCode::PriceBelowTrigger
    );
    Ok(())
}
```

If you get `GetPriceFeedMessageMismatch` or `PriceTooOld` — the price feed hasn't been updated recently enough. In production, use a price pusher or rely on Pyth's pull oracle.

## Debugging streaming payment failures

### Stream drained (insufficient rent)

```
Program log: Transfer: insufficient lamports X, need Y
```

Payment stream escrow accounts need rent-exemption to stay alive. If the stream account loses lamports (someone forgot to keep it rent-exempt), the account gets garbage collected and all pending payments are lost.

```rust
// Always verify rent at stream creation
let rent = Rent::get()?;
let min_rent = rent.minimum_balance(StreamAccount::SIZE);
require!(
    ctx.accounts.escrow.to_account_info().lamports() >= min_rent,
    ErrorCode::StreamAccountNotRentExempt
);

// And when withdrawing from stream:
let lamports_after = ctx.accounts.escrow
    .to_account_info()
    .lamports()
    .checked_sub(withdraw_lamports)
    .ok_or(ErrorCode::Overflow)?;
    
require!(
    lamports_after >= min_rent,
    ErrorCode::WithdrawWouldKillStream
);
```

### Stream amount calculation errors

Streaming payment programs often calculate `amount_per_slot × elapsed_slots`. Common failure:

```rust
// WRONG — overflow if stream runs for many slots
let elapsed = Clock::get()?.slot - stream.start_slot;
let claimable = elapsed * stream.rate_per_slot; // overflows at ~46M slots at u64 max

// CORRECT
let elapsed = Clock::get()?.slot
    .checked_sub(stream.start_slot)
    .ok_or(ErrorCode::ClockError)?;
    
let claimable = (elapsed as u128)
    .checked_mul(stream.rate_per_slot as u128)
    .ok_or(ErrorCode::Overflow)?
    .min(stream.total_amount as u128) as u64; // cap at total
```

## Debugging x402 agent payment failures

x402 payment pattern: an AI agent calls a paid API, the server responds with `402 Payment Required` + a Solana payment request. The agent signs and sends the transaction.

### Common x402 failures

**Invalid payment amount:**
```
Program log: AnchorError... Error Code: InvalidPaymentAmount. Error Number: 6010.
```
x402 quotes expire — the price was valid at quote time but the tx arrived after `quote_expiry`. Always check:
```typescript
const quote = await fetchQuote(apiEndpoint);
if (Date.now() / 1000 > quote.expiry) {
  // Re-fetch quote before building transaction
  throw new Error("Quote expired, refetch");
}
```

**Wrong mint in payment:**
```
Program log: AnchorError... Error Code: ConstraintTokenMint. Error Number: 314.
```
x402 endpoints specify an accepted mint (usually USDC). Ensure:
```typescript
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
// Verify the payment mint matches what the server requested
assert(paymentRequest.mint === USDC_MINT.toBase58());
```

**Payment reference not passed:**
x402 requires a unique payment reference nonce so the server can verify payment without watching the chain.
```rust
#[account]
pub struct PaymentRecord {
    pub reference: [u8; 32], // unique per payment request
    pub payer: Pubkey,
    pub amount: u64,
    pub mint: Pubkey,
    pub paid_at: i64,
}
// The reference is derived from the server's quote — must match exactly
```

## Diagnosing stablecoin settlement failures

### USDC decimal mismatch

USDC on Solana has 6 decimals. Very common mistake:

```typescript
// WRONG — treating USDC like SOL (9 decimals)
const amount = 100 * 1e9; // sends 100,000 USDC not 100 USDC

// CORRECT
const USDC_DECIMALS = 6;
const amount = 100 * Math.pow(10, USDC_DECIMALS); // 100_000_000 = 100 USDC
```

On the Rust side:
```rust
// Define once, use everywhere
pub const USDC_DECIMALS: u8 = 6;
pub const USDC_PRECISION: u64 = 10u64.pow(USDC_DECIMALS as u32); // 1_000_000

// Amount validation
require!(
    amount > 0 && amount % 1 == 0, // integer check (USDC has no sub-unit fractions)
    ErrorCode::InvalidAmount
);
```

### Multi-hop routing failure

When a payment routes USDC → program A → program B:

```
Program <A> invoke [1]
  Program <B> invoke [2]
  Program <B> failed: custom program error: 0x1  ← insufficient funds in B
Program <A> failed: custom program error: 0x1389
```

The full balance didn't arrive at B because A took a fee. Check the fee deduction math:
```rust
let fee = amount
    .checked_mul(ctx.accounts.config.fee_bps as u64)
    .ok_or(ErrorCode::Overflow)?
    .checked_div(10_000)
    .ok_or(ErrorCode::Overflow)?;
    
let net_amount = amount.checked_sub(fee).ok_or(ErrorCode::Overflow)?;
// Pass net_amount downstream, not amount
```
