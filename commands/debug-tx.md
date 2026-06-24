# /debug-tx — Diagnose a Failing Anchor Transaction

## Usage

```
/debug-tx <SIGNATURE>
/debug-tx <SIGNATURE> --cluster devnet|mainnet-beta|localnet
/debug-tx --logs "<paste logs here>"
```

## What this command does

1. Fetches full transaction logs from the cluster
2. Parses the error type (Anchor constraint, custom, system, token)
3. Decodes the hex error code to a human-readable name + cause
4. Identifies which account or instruction caused the failure
5. Suggests the exact fix

## Implementation

When invoked, the agent should:

```typescript
// Step 1 — Fetch transaction
const connection = new Connection(clusterApiUrl(cluster), "confirmed");
const tx = await connection.getTransaction(signature, {
  commitment: "confirmed",
  maxSupportedTransactionVersion: 0,
});

// Step 2 — Extract logs
const logs = tx?.meta?.logMessages ?? [];

// Step 3 — Parse Anchor error
import { AnchorError, ProgramError } from "@coral-xyz/anchor";
const anchorErr = AnchorError.parse(logs);
if (anchorErr) {
  // Report: error code, message, source file + line (if available), account name
}

// Step 4 — If not Anchor, check system/token errors
const rawErr = tx?.meta?.err;
// Decode InstructionError: [index, { Custom: code }]
```

## Output format

```
Transaction: <SIGNATURE>
Status: FAILED
Error: ConstraintSeeds (309)
Account: vault
Cause: PDA derivation mismatch between client and program seeds
Fix: Verify seed encoding — ensure b"vault" matches exactly, check canonical bump is stored and reused
CUs used: 45,230 / 200,000

Logs:
  Program <ID> invoke [1]
  Program log: Instruction: Deposit
  Program log: AnchorError...
  Program <ID> failed: custom program error: 0x135
```

## Related

- Full error catalog → read `skill/error-catalog.md`
- Simulation before sending → read `skill/simulation.md`
- CU usage → read `skill/compute-optimization.md`
