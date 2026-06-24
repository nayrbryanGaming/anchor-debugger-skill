# Transaction Debugging — Anchor Debugger Skill

## Workflow: debug a failing transaction in 5 steps

### Step 1 — Get the full logs

```bash
# From CLI (devnet)
solana confirm -v <SIGNATURE> --url devnet

# From RPC
curl -s https://api.devnet.solana.com -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getTransaction","params":["<SIG>",{"encoding":"jsonParsed","commitment":"confirmed","maxSupportedTransactionVersion":0}]}'
```

If you only have the error and no logs, use simulation first → see `simulation.md`.

### Step 2 — Read the log structure

Anchor logs follow this pattern:
```
Program <PROGRAM_ID> invoke [1]          ← outer instruction
Program log: Instruction: MyInstruction  ← discriminator matched
Program log: AnchorError ...             ← error thrown
Program <PROGRAM_ID> failed: custom program error: 0x1770  ← hex error code
```

CPI calls nest:
```
Program <PROGRAM_ID> invoke [1]
  Program <OTHER_ID> invoke [2]          ← CPI level 2
  Program <OTHER_ID> failed: ...         ← failed in CPI
Program <PROGRAM_ID> failed: ...         ← bubbled up
```

### Step 3 — Decode the error code

**Anchor custom errors (0x1770 = 6000 decimal)**
Anchor custom errors start at 6000. Decode:
```
hex 0x1770 = decimal 6000  → first error in your #[error_code] enum
hex 0x1771 = 6001          → second error
```

**System / built-in errors (below 6000)**
| Code (hex) | Code (dec) | Meaning |
|------------|------------|---------|
| 0x0        | 0          | `AccountNotEnoughKeys` — missing accounts in instruction |
| 0x1        | 1          | `AccountNotMutable` — passed a read-only account that must be writable |
| 0x2        | 2          | `AccountOwnedByWrongProgram` — wrong program owns this account |
| 0x3        | 3          | `AccountNotSysvar` — expected a sysvar but got something else |
| 0x4        | 4          | `AccountNotEnoughLamports` — account doesn't have min rent |
| 0x5        | 5          | `AccountAlreadyInitialized` — init_if_needed collision |
| 0x65       | 101        | `AccountDiscriminatorAlreadySet` — tried to init already-inited account |
| 0x66       | 102        | `AccountDiscriminatorNotFound` — first 8 bytes don't match |
| 0x67       | 103        | `AccountDiscriminatorMismatch` — discriminator bytes wrong |
| 0x12c      | 300        | `ConstraintMut` — account must be `#[account(mut)]` |
| 0x12d      | 301        | `ConstraintHasOne` — `has_one` constraint failed |
| 0x12e      | 302        | `ConstraintSigner` — expected signer |
| 0x12f      | 303        | `ConstraintRaw` — custom `constraint =` expression was false |
| 0x130      | 304        | `ConstraintOwner` — `owner =` constraint failed |
| 0x131      | 305        | `ConstraintAddress` — `address =` constraint failed |
| 0x132      | 306        | `ConstraintAssociated` — ATA derivation mismatch |
| 0x133      | 307        | `ConstraintAssociatedInit` — ATA init failed |
| 0x134      | 308        | `ConstraintClose` — close constraint error |
| 0x135      | 309        | `ConstraintSeeds` — `seeds =` PDA derivation mismatch |
| 0x136      | 310        | `ConstraintExecutable` — account must be executable |
| 0x137      | 311        | `ConstraintState` — state constraint failed |
| 0x138      | 312        | `ConstraintAssociated` |
| 0x139      | 313        | `ConstraintZero` — discriminator zero check failed |
| 0x1388     | 5000       | `AccountNotInitialized` — `init` account already init or `Account<>` on uninitialized data |
| 0x1389     | 5001       | `AccountOwnedByWrongProgram` |
| 0x138a     | 5002       | `AccountNotEnoughLamports` |
| 0x138b     | 5003       | `AccountNotAssociatedTokenAccount` |
| 0x138c     | 5004       | `AccountSysvarMismatch` |
| 0x138d     | 5005       | `AccountReallocExceedsLimit` — exceeded 10KB realloc per tx |
| 0x138e     | 5006       | `AccountDuplicateReallocs` |

**Token Program errors**
```
0x1  → insufficient funds
0x4  → owner mismatch
0x5  → frozen account
0x10 → invalid mint
```

### Step 4 — Match error to your accounts struct

When you get `ConstraintSeeds (0x135)`:
1. Find the `#[account(seeds = [...], bump)]` field in your `Accounts` struct.
2. Check that the seeds you're passing on the client match **exactly** what the program expects — type, byte order, encoding.
3. Verify you're using the **canonical bump** (stored on-chain, not recomputed each call).

When you get `AccountOwnedByWrongProgram (0x2 or 0x1389)`:
1. The account's `owner` field on-chain doesn't match the program that's trying to deserialize it.
2. Common cause: passing a token account where a program account is expected, or vice versa.

### Step 5 — Common fixes

| Error | Fix |
|-------|-----|
| `AccountNotMutable` | Add `#[account(mut)]` to struct field AND pass writable in client |
| `ConstraintSeeds` | Byte-align seeds — strings need `.as_bytes()`, pubkeys need `.as_ref()` |
| Discriminator mismatch | Account was created by a different program version — re-initialize or migrate |
| `init` on existing account | Use `init_if_needed` (add feature flag in Cargo.toml) or check before calling |
| CPI signer mismatch | Pass `&[&[seeds, &[bump]]]` correctly — common to forget the outer `&[...]` |
| Missing account | Count accounts in your client call vs. the `Accounts` struct |

## Decoding from a transaction object

```typescript
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Program, AnchorError } from "@coral-xyz/anchor";

async function debugTx(sig: string, program: Program) {
  const tx = await program.provider.connection.getTransaction(sig, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  
  if (!tx?.meta?.logMessages) {
    console.log("No logs found");
    return;
  }

  // Parse Anchor error from logs
  try {
    const anchorErr = AnchorError.parse(tx.meta.logMessages);
    if (anchorErr) {
      console.log("Error code:", anchorErr.error.errorCode.number);
      console.log("Error message:", anchorErr.error.errorMessage);
      console.log("Error origin:", anchorErr.error.origin);
    }
  } catch (e) {
    // Not an Anchor error — check raw logs
    console.log("Raw logs:", tx.meta.logMessages.join("\n"));
  }
}
```

## Reading Anchor error from program logs directly

```rust
// In your program, log context to help debugging:
msg!("Account key: {}", ctx.accounts.my_account.key());
msg!("Expected: {}", expected_key);
```

Enable verbose logging in tests:
```toml
# Anchor.toml
[provider]
cluster = "Localnet"

[scripts]
test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"

[features]
seeds = false
skip-lint = false
```

```bash
# Run with logs visible
RUST_LOG=solana_runtime::system_instruction_processor=trace \
  anchor test --skip-deploy 2>&1 | grep "Program log"
```
