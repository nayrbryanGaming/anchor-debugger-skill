# Transaction Simulation — Anchor Debugger Skill

## Why simulate before sending

Simulation runs your transaction against the current chain state without consuming fees or leaving side effects. It returns:
- CUs that would be consumed
- Logs as if the transaction ran
- Exact error if it would fail
- Return data from the program

Use simulation to: debug before sending to mainnet, estimate CU for budget setting, verify account state preconditions, and test complex multi-instruction flows.

## Basic simulation with Anchor client

```typescript
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { MyProgram } from "../target/types/my_program";

async function simulateInstruction(
  program: Program<MyProgram>,
  args: { amount: anchor.BN }
) {
  const simulation = await program.methods
    .deposit(args.amount)
    .accounts({
      user: program.provider.publicKey,
      vault: vaultPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .simulate({ commitment: "processed" });

  console.log("CUs consumed:", simulation.raw[0]?.unitsConsumed);
  console.log("Return data:", simulation.raw[0]?.returnData);
  console.log("Logs:", simulation.raw[0]?.logs?.join("\n"));

  if (simulation.raw[0]?.err) {
    console.error("Would fail:", simulation.raw[0].err);
  }
}
```

## Raw RPC simulation (more control)

```typescript
import {
  Connection,
  Transaction,
  TransactionMessage,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";

async function simulateRaw(
  connection: Connection,
  transaction: VersionedTransaction
) {
  const sim = await connection.simulateTransaction(transaction, {
    sigVerify: false,          // skip sig check (saves time in testing)
    replaceRecentBlockhash: true, // use current blockhash automatically
    commitment: "processed",
    accounts: {
      encoding: "base64",
      addresses: [
        // return account state AFTER simulation for these pubkeys
        vaultPda.toBase58(),
        userTokenAccount.toBase58(),
      ],
    },
  });

  if (sim.value.err) {
    console.error("Simulation failed:", JSON.stringify(sim.value.err));
    console.log("Logs:", sim.value.logs?.join("\n"));
    return null;
  }

  // Decode returned account data
  if (sim.value.accounts) {
    for (const [i, acc] of sim.value.accounts.entries()) {
      if (acc?.data[1] === "base64") {
        const decoded = Buffer.from(acc.data[0], "base64");
        console.log(`Account ${i} after sim (${decoded.length} bytes)`);
      }
    }
  }

  return sim.value;
}
```

## Pre-flight checks pattern

Use simulation as a guard before expensive transactions:

```typescript
async function safeExecute<T>(
  buildTx: () => Promise<anchor.MethodsBuilder<any, any>>,
  options: { maxCU?: number; dryRun?: boolean } = {}
): Promise<string | null> {
  const builder = await buildTx();
  
  // Always simulate first
  const sim = await builder.simulate({ commitment: "processed" });
  const cuUsed = sim.raw[0]?.unitsConsumed ?? 0;
  
  console.log(`Pre-flight: ${cuUsed} CUs`);
  
  if (sim.raw[0]?.err) {
    throw new Error(`Pre-flight failed: ${JSON.stringify(sim.raw[0].err)}\nLogs: ${sim.raw[0]?.logs?.join('\n')}`);
  }
  
  if (options.maxCU && cuUsed > options.maxCU) {
    throw new Error(`CU usage ${cuUsed} exceeds limit ${options.maxCU}`);
  }
  
  if (options.dryRun) {
    console.log("Dry run — not sending");
    return null;
  }
  
  // Send with accurate CU limit
  const sig = await builder
    .preInstructions([
      anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
        units: Math.ceil(cuUsed * 1.15), // 15% buffer
      }),
    ])
    .rpc({ commitment: "confirmed" });
  
  return sig;
}
```

## Batch simulation (check multiple txs at once)

```typescript
async function batchSimulate(
  connection: Connection,
  transactions: VersionedTransaction[]
): Promise<boolean[]> {
  const results = await Promise.all(
    transactions.map((tx) =>
      connection.simulateTransaction(tx, {
        replaceRecentBlockhash: true,
        commitment: "processed",
      })
    )
  );
  
  return results.map((r, i) => {
    if (r.value.err) {
      console.error(`Tx ${i} would fail:`, r.value.err);
      return false;
    }
    return true;
  });
}
```

## Debugging CPI failures with simulation

When a CPI fails, the error appears in the inner logs. Parse them:

```typescript
function parseCpiError(logs: string[]): {
  program: string;
  error: string;
  depth: number;
} | null {
  let depth = 0;
  let lastProgram = "";
  
  for (const log of logs) {
    const invokeMatch = log.match(/Program (\w+) invoke \[(\d+)\]/);
    if (invokeMatch) {
      depth = parseInt(invokeMatch[2]);
      lastProgram = invokeMatch[1];
    }
    
    const failMatch = log.match(/Program \w+ failed: (.+)/);
    if (failMatch) {
      return {
        program: lastProgram,
        error: failMatch[1],
        depth,
      };
    }
  }
  
  return null;
}

// Usage:
const sim = await connection.simulateTransaction(tx, { replaceRecentBlockhash: true });
if (sim.value.err) {
  const cpiErr = parseCpiError(sim.value.logs ?? []);
  if (cpiErr) {
    console.log(`CPI failed in ${cpiErr.program} (depth ${cpiErr.depth}): ${cpiErr.error}`);
  }
}
```

## Local validator simulation tips

```bash
# Start local validator with mainnet program clones for realistic simulation
solana-test-validator \
  --clone <PROGRAM_ID> \                     # clone a mainnet program
  --clone <TOKEN_PROGRAM_ID> \              # clone spl-token
  --url mainnet-beta \                       # source for clones
  --reset

# Clone an account (e.g. a specific vault for testing)
solana-test-validator \
  --clone-upgradeable-program <PROGRAM_ID> \
  --account <VAULT_PUBKEY> ./vault.json \   # use saved account state
  --url mainnet-beta
```

## Simulation in Anchor tests

```typescript
// anchor/tests/my_program.ts
describe("simulation tests", () => {
  it("pre-flight check passes for valid deposit", async () => {
    const sim = await program.methods
      .deposit(new anchor.BN(1_000_000))
      .accounts({ ... })
      .simulate();
    
    // Assert no error
    assert.isNull(sim.raw[0]?.err, `Simulation failed: ${JSON.stringify(sim.raw[0]?.err)}`);
    
    // Assert CU within bounds
    const cu = sim.raw[0]?.unitsConsumed ?? 0;
    assert.isBelow(cu, 200_000, `CU usage ${cu} exceeds 200k limit`);
  });
  
  it("simulation fails with expected error for invalid deposit", async () => {
    try {
      await program.methods
        .deposit(new anchor.BN(0)) // invalid: zero amount
        .accounts({ ... })
        .simulate();
      assert.fail("Should have thrown");
    } catch (err: any) {
      // AnchorError is thrown from simulate() when program errors
      assert.include(err.message, "InvalidAmount");
    }
  });
});
```
