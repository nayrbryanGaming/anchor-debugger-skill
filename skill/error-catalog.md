# Anchor Error Catalog — Anchor Debugger Skill

Complete reference for Anchor, System Program, Token Program, and SPL errors as of 2026.

## Anchor framework errors (100–5006)

### Account validation errors (100–199)

| Code | Name | Cause | Fix |
|------|------|-------|-----|
| 100 | `AccountDiscriminatorAlreadySet` | Calling `init` on an account that already has data | Use `init_if_needed` or check existence first |
| 101 | `AccountDiscriminatorNotFound` | First 8 bytes are zeroes — account not initialized | Initialize account before using it as `Account<T>` |
| 102 | `AccountDiscriminatorMismatch` | First 8 bytes don't match `sha256("account:<TypeName>")[..8]` | Wrong account type passed, or account created by different program version |
| 103 | `AccountDidNotDeserialize` | Borsh deserialization failed after discriminator check | Account data is corrupted or struct layout changed |
| 104 | `AccountDidNotSerialize` | Borsh serialization failed on exit | Account ran out of space — needs realloc or larger init space |
| 105 | `AccountNotEnoughKeys` | Not enough accounts provided in the instruction | Count your Accounts struct fields vs. what you pass on client |
| 106 | `AccountNotMutable` | `#[account(mut)]` but client passed read-only | Pass `writable: true` in client AccountMeta |
| 107 | `AccountOwnedByWrongProgram` | Account's `owner` doesn't match expected program | Passing wrong account type, or account belongs to another program |
| 108 | `InvalidProgramId` | Program ID in instruction doesn't match | You're calling wrong program ID |
| 109 | `InvalidProgramExecutable` | Expected executable but got data account | Passed a data account where a program account is expected |
| 110 | `AccountNotSigner` | `Signer<>` constraint but account didn't sign | Add account to signers array on client |
| 111 | `AccountNotSystemOwned` | Expected system-owned but got program-owned | Trying to call SystemProgram on a PDA or already-initialized account |
| 112 | `AccountNotRentExempt` | Account doesn't have enough lamports for rent exemption | Fund account to `getMinimumBalanceForRentExemption(size)` |
| 113 | `AccountNotAssociatedTokenAccount` | Token account derivation doesn't match (mint/owner) | Derive the correct ATA address |
| 114 | `AccountSysvarMismatch` | Passed wrong sysvar pubkey | Use the correct sysvar constant (`Clock::id()`, `Rent::id()`, etc.) |
| 115 | `AccountReallocExceedsLimit` | Tried to realloc more than 10KB in one transaction | Split realloc across multiple transactions |
| 116 | `AccountDuplicateReallocs` | Same account reallocated twice in one tx | Only realloc once per account per transaction |

### Constraint errors (300–399)

| Code | Name | Trigger | Fix |
|------|------|---------|-----|
| 300 | `ConstraintMut` | Field needs `#[account(mut)]` but isn't marked | Add `mut` to attribute |
| 301 | `ConstraintHasOne` | `has_one = field` failed — stored pubkey doesn't match passed account | Pass the correct authority/owner |
| 302 | `ConstraintSigner` | Field needs `Signer<>` or `#[account(signer)]` | Sign with correct keypair on client |
| 303 | `ConstraintRaw` | `constraint = expr` evaluated to false | Check your custom constraint expression |
| 304 | `ConstraintOwner` | `owner = ProgramId` constraint failed | Account isn't owned by specified program |
| 305 | `ConstraintAddress` | `address = pubkey` constraint failed | Wrong account address passed |
| 306 | `ConstraintAssociated` | ATA derivation doesn't match | Use `get_associated_token_address()` to derive correctly |
| 307 | `ConstraintAssociatedInit` | `init` + ATA creation failed | Ensure payer has enough SOL for rent |
| 308 | `ConstraintClose` | `close = target` constraint failed | Ensure target account is writable |
| 309 | `ConstraintSeeds` | PDA derivation mismatch | Seed bytes must match exactly — encoding, order, types |
| 310 | `ConstraintExecutable` | `executable` constraint but account isn't a program | Pass the program account, not its state account |
| 311 | `ConstraintState` | Deprecated global state constraint | Migrate away from global state |
| 312 | `ConstraintAssociated` | (duplicate — see 306) | |
| 313 | `ConstraintZero` | Non-zero discriminator where zero expected | Account was already used / not freshly allocated |
| 314 | `ConstraintTokenMint` | `token::mint = X` constraint failed | Passed token account for wrong mint |
| 315 | `ConstraintTokenOwner` | `token::authority = X` constraint failed | Passed token account owned by wrong authority |
| 316 | `ConstraintMintMintAuthority` | `mint::authority = X` failed | Wrong mint authority |
| 317 | `ConstraintMintFreezeAuthority` | `mint::freeze_authority = X` failed | Wrong freeze authority |
| 318 | `ConstraintMintDecimals` | `mint::decimals = X` failed | Wrong mint decimals |
| 319 | `ConstraintSpace` | `space = X` doesn't match type size | Recalculate: `8 + MyStruct::INIT_SPACE` |
| 320 | `ConstraintAccountIsNone` | Optional `Option<Account<T>>` was None when constraint required it | Either pass the account or remove the constraint |

### Require macro errors (2000–2999)

| Code | Name | Cause |
|------|------|-------|
| 2000 | `RequireViolated` | `require!(condition)` was false |
| 2001 | `RequireEqViolated` | `require_eq!(a, b)` failed |
| 2002 | `RequireKeysEqViolated` | `require_keys_eq!(key_a, key_b)` failed |
| 2003 | `RequireNeqViolated` | `require_neq!(a, b)` failed |
| 2004 | `RequireKeysNeqViolated` | `require_keys_neq!(key_a, key_b)` failed |
| 2005 | `RequireGtViolated` | `require_gt!(a, b)` failed |
| 2006 | `RequireGteViolated` | `require_gte!(a, b)` failed |

### Account realloc / space errors (5000–5006)

| Code | Name | Cause | Fix |
|------|------|-------|-----|
| 5000 | `AccountNotInitialized` | Passing uninitialized account to `Account<T>` (not `init`) | Initialize first OR use `init` |
| 5001 | `AccountOwnedByWrongProgram` | (see 107) | |
| 5002 | `AccountNotEnoughLamports` | Account can't pay for realloc rent | Top up account lamports |
| 5003 | `AccountNotAssociatedTokenAccount` | (see 113) | |
| 5004 | `AccountSysvarMismatch` | (see 114) | |
| 5005 | `AccountReallocExceedsLimit` | (see 115) | |
| 5006 | `AccountDuplicateReallocs` | (see 116) | |

## System Program errors

| Code | Message | Cause |
|------|---------|-------|
| 0 | `AccountAlreadyInUse` | Trying to create an account that already exists |
| 1 | `ResultWithNegativeLamports` | Transaction would leave account with negative balance |
| 2 | `InvalidProgramId` | Program ID doesn't match expected |
| 3 | `InvalidAccountDataLength` | Account data size mismatch |
| 4 | `MaxSeedLengthExceeded` | PDA seed > 32 bytes |
| 5 | `AddressWithSeedMismatch` | Derived address doesn't match provided address |
| 6 | `NonceNoRecentBlockhashes` | Durable nonce: no recent blockhash available |
| 7 | `NonceBlockhashNotExpired` | Durable nonce: blockhash hasn't expired yet |
| 8 | `NonceUnexpectedBlockhashValue` | Durable nonce: blockhash value mismatch |

## Token Program errors (spl-token)

| Code | Message | Cause | Fix |
|------|---------|-------|-----|
| 0 | `NotRentExempt` | Token account not rent-exempt | Fund to minimum balance |
| 1 | `InsufficientFunds` | Not enough tokens for transfer | Check `amount` field |
| 2 | `InvalidMint` | Invalid mint account | Pass correct mint pubkey |
| 3 | `MintMismatch` | Token account belongs to different mint | Use correct token account for this mint |
| 4 | `OwnerMismatch` | Token account authority mismatch | Sign with correct owner key |
| 5 | `FixedSupply` | Mint has no mint authority (supply is fixed) | Can't mint more |
| 6 | `AlreadyInUse` | Account already initialized | Use existing account |
| 7 | `InvalidNumberOfProvidedSigners` | Wrong multisig config | Check multisig signer count |
| 8 | `InvalidNumberOfRequiredSigners` | Multisig threshold mismatch | |
| 9 | `UninitializedState` | Account not initialized as token account | Initialize first |
| 10 | `NativeNotSupported` | Operation not supported on native SOL wrapping | Use WSOL accounts differently |
| 11 | `NonNativeHasBalance` | Can't close non-native account with balance | Transfer out tokens first |
| 12 | `InvalidInstruction` | Unrecognized instruction discriminator | SDK version mismatch |
| 13 | `InvalidState` | Account in invalid state for this operation | Check account flags |
| 14 | `Overflow` | Arithmetic overflow | Amount too large |
| 15 | `AuthorityTypeNotSupported` | Authority type not valid for this mint | Use correct authority type |
| 16 | `MintCannotFreeze` | Mint has no freeze authority | Can't freeze/thaw |
| 17 | `AccountFrozen` | Token account is frozen | Thaw before operating |
| 18 | `MintDecimalsMismatch` | Decimals don't match existing mint | Mint already has different decimals |
| 19 | `NonNativeNotSupported` | Native SOL operation on non-native account | Check account type |

## How to decode any hex error code

```typescript
// In any TypeScript/JavaScript context:
function decodeAnchorError(hexCode: string): number {
  return parseInt(hexCode, 16);
}

// Example: "0x1775" → 6005 → your 6th custom error (0-indexed from 6000)
const code = decodeAnchorError("0x1775"); // 6005
const customErrorIndex = code - 6000; // 5

// Then find the 5th variant (0-indexed) in your #[error_code] enum
```

```bash
# Quick decode in bash
printf '%d\n' 0x1775   # outputs: 6005
```
