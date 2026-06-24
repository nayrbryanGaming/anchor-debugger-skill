# Common Anchor Pitfalls — Anchor Debugger Skill

## PDA bugs

### 1. Wrong seed encoding

```rust
// WRONG — string literal passed directly (no length prefix in seeds)
let seeds = &[b"vault", user.key().as_ref()];

// CORRECT — consistent string prefix
const VAULT_SEED: &[u8] = b"vault";
let seeds = &[VAULT_SEED, user.key().as_ref()];

// WRONG — using .to_string().as_bytes() creates extra allocation and identical result
// CORRECT — always use string literal b"prefix" directly
```

```rust
// WRONG — u64 as bytes without consistent encoding
let seeds = &[b"position", &amount.to_le_bytes()];  
// amount varies, so every amount gets a different PDA — often unintended

// CORRECT — use a stable identifier, not a value
let seeds = &[b"position", user.key().as_ref(), &position_id.to_le_bytes()];
```

### 2. Not storing the canonical bump

```rust
// WRONG — recomputing bump every time with find_program_address
// This is expensive (multiple SHA256) and can fail if canonical bump changes
let (pda, bump) = Pubkey::find_program_address(&seeds, &program_id);

// CORRECT — store bump on init, reuse it
#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub bump: u8,  // store this
}

// On init:
vault.bump = ctx.bumps.vault;  // Anchor provides this via ctx.bumps

// On subsequent calls:
let seeds = &[
    b"vault",
    ctx.accounts.authority.key().as_ref(),
    &[ctx.accounts.vault.bump],  // use stored bump
];
let signer_seeds = &[&seeds[..]];
```

### 3. PDA signing — wrong nesting

```rust
// WRONG — common mistake in CPI signer seeds
let seeds = &[b"vault", authority.as_ref(), &[bump]];
invoke_signed(
    &instruction,
    &accounts,
    &[seeds],   // ← WRONG: this is &[&[&[u8]]] not &[&[&[u8]]]
);

// CORRECT
let seeds: &[&[u8]] = &[b"vault", authority.as_ref(), &[bump]];
invoke_signed(
    &instruction,
    &accounts,
    &[seeds],  // &[&[&[u8]]] — outer slice has one element (the signer)
);

// CORRECT with multiple signers
invoke_signed(
    &instruction,
    &accounts,
    &[vault_seeds, escrow_seeds],  // two PDAs signing
);
```

## Account ordering

Anchor processes accounts in the ORDER they appear in your `Accounts` struct. The client must pass accounts in the same order.

```rust
// Your struct defines the order
#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub user: Signer<'info>,          // index 0
    #[account(mut)]
    pub vault: Account<'info, Vault>, // index 1
    pub system_program: Program<'info, System>, // index 2
}

// Client must match:
program.methods.deposit(amount)
  .accounts({
    user: wallet.publicKey,     // must match index 0 field name
    vault: vaultPda,            // must match index 1 field name
    systemProgram: SystemProgram.programId,  // camelCase = snake_case
  })
```

Note: Anchor auto-converts `snake_case` struct field names to `camelCase` for the JS/TS client.

## Account reloading after CPI

After a CPI call that modifies an account, the in-memory copy in Rust is **stale** — it reflects pre-CPI state.

```rust
// WRONG — reads stale data after CPI
pub fn do_cpi_then_read(ctx: Context<...>) -> Result<()> {
    // CPI that modifies ctx.accounts.vault
    transfer_cpi(&ctx)?;
    
    // BAD: vault.amount still has pre-CPI value
    msg!("Vault amount: {}", ctx.accounts.vault.amount);
    Ok(())
}

// CORRECT — reload after CPI
pub fn do_cpi_then_read(ctx: Context<...>) -> Result<()> {
    transfer_cpi(&ctx)?;
    
    // Reload from account data
    ctx.accounts.vault.reload()?;
    msg!("Vault amount: {}", ctx.accounts.vault.amount);
    Ok(())
}
```

## init_if_needed race condition

```rust
// DANGEROUS — init_if_needed can be exploited
// If attacker calls this twice concurrently, they can reinitialize an existing account
#[account(
    init_if_needed,
    payer = user,
    space = 8 + 32,
    seeds = [b"vault", user.key().as_ref()],
    bump
)]
pub vault: Account<'info, Vault>,

// SAFER — add a version/initialized flag
#[account]
pub struct Vault {
    pub is_initialized: bool,
    pub authority: Pubkey,
}

// Then in handler:
require!(!ctx.accounts.vault.is_initialized || /* update logic */, ErrorCode::AlreadyInitialized);
```

To use `init_if_needed` safely, add to `Cargo.toml`:
```toml
[dependencies]
anchor-lang = { version = "0.31.0", features = ["init-if-needed"] }
```

## Closing accounts safely

```rust
// WRONG — just zeroing out leaves the account open to revival attacks
// (someone could re-fund the lamports and re-initialize)
ctx.accounts.vault.authority = Pubkey::default();  // not enough

// CORRECT — use Anchor's close constraint
#[account(
    mut,
    close = authority,  // sends lamports to authority and zeroes + sets discriminator to closed
    has_one = authority,
)]
pub vault: Account<'info, Vault>,
```

The `close` constraint:
1. Transfers all lamports to the destination
2. Zeroes the account data
3. Sets the discriminator to the "closed" sentinel (`[255; 8]`)
4. This prevents the account from being reopened in the same transaction

## Overflow and underflow

```rust
// WRONG — Rust release mode wraps silently
let result = a + b;  // if a + b > u64::MAX, wraps to 0

// CORRECT — use checked arithmetic
let result = a.checked_add(b)
    .ok_or(ErrorCode::Overflow)?;

// CORRECT — or use anchor's require_gte for validations
require_gte!(ctx.accounts.vault.amount, withdraw_amount, ErrorCode::InsufficientFunds);
let new_amount = ctx.accounts.vault.amount
    .checked_sub(withdraw_amount)
    .ok_or(ErrorCode::Overflow)?;
```

## Sysvar access

```rust
// WRONG — passing Clock as an account (deprecated in newer Solana)
pub clock: Sysvar<'info, Clock>,

// CORRECT — use Clock::get() (no account needed)
let clock = Clock::get()?;
let timestamp = clock.unix_timestamp;
```

Same pattern for `Rent::get()`, `EpochSchedule::get()`, `SlotHistory::get()`.

## Token account pitfalls

```rust
// WRONG — forgot to check mint
#[account(
    mut,
    token::authority = user,  // checks owner but NOT mint
)]
pub user_token_account: Account<'info, TokenAccount>,

// CORRECT — check both mint and authority
#[account(
    mut,
    token::mint = vault.mint,      // ensure correct mint
    token::authority = user,       // ensure correct owner
)]
pub user_token_account: Account<'info, TokenAccount>,
```

## Account size calculation errors

```rust
// WRONG — hardcoded magic numbers drift as struct evolves
#[account(init, payer = user, space = 200)]

// CORRECT — use INIT_SPACE derive macro (Anchor 0.28+)
#[account]
#[derive(InitSpace)]
pub struct Vault {
    pub authority: Pubkey,    // 32
    pub amount: u64,          // 8
    #[max_len(50)]
    pub name: String,         // 4 + 50 = 54
}

// Then in account constraint:
#[account(
    init,
    payer = user,
    space = 8 + Vault::INIT_SPACE,  // 8 discriminator + auto-calculated
)]
pub vault: Account<'info, Vault>,
```

## Duplicate mutable accounts

```rust
// DANGEROUS — passing the same account as two different mutable fields
// Anchor 0.28+ will panic in debug mode, but in some patterns it still compiles
// Example: if `from` and `to` are the same pubkey passed by client

// Add a constraint to prevent this:
#[account(
    mut,
    constraint = source.key() != destination.key() @ ErrorCode::SameAccount,
)]
pub source: Account<'info, TokenAccount>,
```
