# PayFi Anchor Patterns — Anchor PayFi Debugger Skill

Production-grade Anchor patterns for the most common PayFi primitives on Solana.

## 1. Time-locked escrow

The foundation of most PayFi — funds locked until a timestamp, then releasable by the intended recipient.

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

#[program]
pub mod escrow_program {
    use super::*;

    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        amount: u64,
        unlock_at: i64,        // unix timestamp
        recipient: Pubkey,
    ) -> Result<()> {
        require!(amount > 0, EscrowError::InvalidAmount);
        require!(
            unlock_at > Clock::get()?.unix_timestamp,
            EscrowError::UnlockInPast
        );

        let escrow = &mut ctx.accounts.escrow;
        escrow.depositor = ctx.accounts.depositor.key();
        escrow.recipient = recipient;
        escrow.mint = ctx.accounts.mint.key();
        escrow.amount = amount;
        escrow.unlock_at = unlock_at;
        escrow.bump = ctx.bumps.escrow;

        // Transfer tokens into escrow vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.depositor_token.to_account_info(),
                    to: ctx.accounts.escrow_vault.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(EscrowCreated {
            escrow: escrow.key(),
            depositor: escrow.depositor,
            recipient,
            amount,
            unlock_at,
        });

        Ok(())
    }

    pub fn release_escrow(ctx: Context<ReleaseEscrow>) -> Result<()> {
        let escrow = &ctx.accounts.escrow;
        
        require!(
            Clock::get()?.unix_timestamp >= escrow.unlock_at,
            EscrowError::NotUnlockedYet
        );

        let seeds = &[
            b"escrow",
            escrow.depositor.as_ref(),
            &escrow.unlock_at.to_le_bytes(),
            &[escrow.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let amount = ctx.accounts.escrow_vault.amount;

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.escrow_vault.to_account_info(),
                    to: ctx.accounts.recipient_token.to_account_info(),
                    authority: ctx.accounts.escrow.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Escrow {
    pub depositor: Pubkey,   // 32
    pub recipient: Pubkey,   // 32
    pub mint: Pubkey,        // 32
    pub amount: u64,         // 8
    pub unlock_at: i64,      // 8  ← unix timestamp, NOT slot
    pub bump: u8,            // 1
}

#[derive(Accounts)]
#[instruction(amount: u64, unlock_at: i64)]
pub struct CreateEscrow<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,
    
    #[account(
        init,
        payer = depositor,
        space = 8 + Escrow::INIT_SPACE,
        seeds = [b"escrow", depositor.key().as_ref(), &unlock_at.to_le_bytes()],
        bump,
    )]
    pub escrow: Account<'info, Escrow>,
    
    #[account(
        init,
        payer = depositor,
        token::mint = mint,
        token::authority = escrow,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, anchor_spl::token::Mint>,
    
    #[account(
        mut,
        token::mint = mint,
        token::authority = depositor,
    )]
    pub depositor_token: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ReleaseEscrow<'info> {
    #[account(
        mut,
        has_one = recipient,
        constraint = Clock::get().unwrap().unix_timestamp >= escrow.unlock_at @ EscrowError::NotUnlockedYet,
        close = depositor,
    )]
    pub escrow: Account<'info, Escrow>,
    
    /// CHECK: depositor receives rent on close
    #[account(mut, address = escrow.depositor)]
    pub depositor: AccountInfo<'info>,
    
    pub recipient: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"vault", escrow.key().as_ref()],
        bump,
        token::mint = escrow.mint,
        token::authority = escrow,
    )]
    pub escrow_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        token::mint = escrow.mint,
        token::authority = recipient,
    )]
    pub recipient_token: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum EscrowError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Unlock timestamp is in the past")]
    UnlockInPast,
    #[msg("Escrow has not reached its unlock time yet")]
    NotUnlockedYet,
    #[msg("Arithmetic overflow")]
    Overflow,
}

#[event]
pub struct EscrowCreated {
    pub escrow: Pubkey,
    pub depositor: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub unlock_at: i64,
}
```

## 2. Payment streaming (per-slot disbursement)

```rust
#[account]
#[derive(InitSpace)]
pub struct Stream {
    pub sender: Pubkey,
    pub recipient: Pubkey,
    pub mint: Pubkey,
    pub rate_per_slot: u64,    // tokens per slot (smallest unit)
    pub start_slot: u64,
    pub end_slot: u64,
    pub total_deposited: u64,
    pub total_withdrawn: u64,
    pub bump: u8,
}

pub fn withdraw_from_stream(ctx: Context<WithdrawStream>) -> Result<()> {
    let stream = &mut ctx.accounts.stream;
    let clock = Clock::get()?;
    
    // Cap elapsed at end_slot
    let current_slot = clock.slot.min(stream.end_slot);
    let elapsed = current_slot
        .checked_sub(stream.start_slot)
        .ok_or(StreamError::ClockError)?;
    
    // Use u128 to prevent overflow in multiplication
    let earned = (elapsed as u128)
        .checked_mul(stream.rate_per_slot as u128)
        .ok_or(StreamError::Overflow)?
        .min(stream.total_deposited as u128) as u64;
    
    let claimable = earned
        .checked_sub(stream.total_withdrawn)
        .ok_or(StreamError::NothingToWithdraw)?;
    
    require!(claimable > 0, StreamError::NothingToWithdraw);
    
    stream.total_withdrawn = stream.total_withdrawn
        .checked_add(claimable)
        .ok_or(StreamError::Overflow)?;
    
    // Transfer claimable amount
    let seeds = &[b"stream", stream.sender.as_ref(), stream.recipient.as_ref(), &[stream.bump]];
    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.stream_vault.to_account_info(),
                to: ctx.accounts.recipient_token.to_account_info(),
                authority: ctx.accounts.stream.to_account_info(),
            },
            &[&seeds[..]],
        ),
        claimable,
    )?;
    
    Ok(())
}
```

## 3. x402 Agent payment pattern

x402 allows AI agents to pay for API access on-chain. The flow:
1. Agent hits API endpoint
2. Server returns `402` + `SolanaPaymentRequest`
3. Agent builds and signs transaction with payment + reference nonce
4. Server verifies payment on-chain

```rust
#[program]
pub mod x402_payment {
    pub fn pay_for_request(
        ctx: Context<PayForRequest>,
        reference: [u8; 32],  // unique per request (from server's quote)
        amount: u64,
        quote_expiry: i64,    // server's quote expires at this timestamp
    ) -> Result<()> {
        let clock = Clock::get()?;
        
        // Quote must not be expired
        require!(
            clock.unix_timestamp <= quote_expiry,
            X402Error::QuoteExpired
        );
        
        // Reference must not be reused (replay protection)
        require!(
            !ctx.accounts.payment_record.is_initialized,
            X402Error::ReferenceAlreadyUsed
        );
        
        // Amount must match quoted amount
        require!(
            amount == ctx.accounts.config.price_per_request,
            X402Error::AmountMismatch
        );
        
        // Record this payment (prevents replay)
        let record = &mut ctx.accounts.payment_record;
        record.reference = reference;
        record.payer = ctx.accounts.payer.key();
        record.amount = amount;
        record.mint = ctx.accounts.config.accepted_mint;
        record.paid_at = clock.unix_timestamp;
        record.is_initialized = true;
        
        // Transfer payment to service provider
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.payer_token.to_account_info(),
                    to: ctx.accounts.provider_token.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;
        
        emit!(PaymentProcessed {
            reference,
            payer: ctx.accounts.payer.key(),
            amount,
            timestamp: clock.unix_timestamp,
        });
        
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct PaymentRecord {
    pub reference: [u8; 32],
    pub payer: Pubkey,
    pub amount: u64,
    pub mint: Pubkey,
    pub paid_at: i64,
    pub is_initialized: bool,
}

// The PaymentRecord is a PDA seeded by the reference nonce:
// seeds = [b"payment", reference]
// This ensures each reference can only be paid once (replay protection)
```

## 4. Yield-bearing escrow (funds earn while locked)

Instead of locking plain USDC, lock in a yield-bearing asset (USDY, mSOL) and distribute principal + yield on release.

```rust
#[account]
#[derive(InitSpace)]
pub struct YieldEscrow {
    pub depositor: Pubkey,
    pub recipient: Pubkey,
    pub lst_mint: Pubkey,         // e.g. mSOL or JitoSOL mint
    pub lst_deposited: u64,       // amount of LST locked
    pub underlying_at_deposit: u64, // SOL value at deposit time
    pub unlock_at: i64,
    pub bump: u8,
}

// On release: recipient gets lst_deposited + accrued yield
// Yield = current_lst_value - underlying_at_deposit
// The LST naturally appreciates — no extra logic needed
```

## 5. Conditional payment (oracle-gated)

```rust
pub fn release_on_condition(ctx: Context<ConditionalRelease>) -> Result<()> {
    // Pyth oracle price check
    let price = ctx.accounts.price_feed.get_price_no_older_than(
        &Clock::get()?,
        30, // max 30s stale
        &ctx.accounts.escrow.price_feed_id,
    )?;
    
    // Release only if price condition met (e.g. SOL > $200)
    require!(
        price.price >= ctx.accounts.escrow.trigger_price,
        ConditionalError::ConditionNotMet
    );
    
    // ... transfer funds ...
    Ok(())
}
```
