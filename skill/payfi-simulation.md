# PayFi Simulation — Anchor PayFi Debugger Skill

## Why simulation matters more in PayFi

In PayFi, a failed mainnet transaction isn't just wasted gas — it can mean:
- A payment stream missed a disbursement window
- An x402 quote expired and the agent's API call failed
- An escrow unlock was attempted but rejected, costing the user's trust
- A batch settlement left 90 of 100 recipients unpaid

**Always simulate PayFi transactions before sending.**

## Pre-flight checklist for payment transactions

```typescript
async function preFlightPayment(
  program: Program<EscrowProgram>,
  params: {
    escrowPda: PublicKey;
    recipient: PublicKey;
    recipientToken: PublicKey;
  }
): Promise<{ safe: boolean; estimatedCU: number; reason?: string }> {
  // 1. Check escrow account exists and is populated
  const escrow = await program.account.escrow.fetchNullable(params.escrowPda);
  if (!escrow) return { safe: false, estimatedCU: 0, reason: "Escrow not found" };

  // 2. Check time condition off-chain first (save a failed tx)
  const slot = await program.provider.connection.getSlot("processed");
  const blockTime = await program.provider.connection.getBlockTime(slot);
  if (!blockTime) return { safe: false, estimatedCU: 0, reason: "Cannot fetch block time" };
  
  if (blockTime < escrow.unlockAt.toNumber()) {
    const secondsLeft = escrow.unlockAt.toNumber() - blockTime;
    return {
      safe: false,
      estimatedCU: 0,
      reason: `Escrow locked for ${secondsLeft} more seconds`,
    };
  }

  // 3. Check vault has tokens
  const vault = await getAccount(
    program.provider.connection,
    getAssociatedTokenAddressSync(escrow.mint, params.escrowPda, true)
  );
  if (vault.amount === BigInt(0)) {
    return { safe: false, estimatedCU: 0, reason: "Vault is empty" };
  }

  // 4. Simulate the actual transaction
  try {
    const sim = await program.methods
      .releaseEscrow()
      .accounts({
        escrow: params.escrowPda,
        recipient: params.recipient,
        recipientToken: params.recipientToken,
        // ... other accounts
      })
      .simulate({ commitment: "processed" });

    const cu = sim.raw[0]?.unitsConsumed ?? 0;
    if (sim.raw[0]?.err) {
      return { safe: false, estimatedCU: cu, reason: `Simulation failed: ${JSON.stringify(sim.raw[0].err)}` };
    }

    return { safe: true, estimatedCU: cu };
  } catch (err: any) {
    return { safe: false, estimatedCU: 0, reason: err.message };
  }
}
```

## Simulating stream withdrawals

```typescript
async function simulateStreamWithdraw(
  program: Program<StreamProgram>,
  streamPda: PublicKey,
  recipientToken: PublicKey
) {
  const stream = await program.account.stream.fetch(streamPda);
  const slot = await program.provider.connection.getSlot("processed");

  // Calculate expected claimable off-chain first
  const elapsed = BigInt(Math.min(slot, stream.endSlot.toNumber())) - BigInt(stream.startSlot.toNumber());
  const earned = elapsed * BigInt(stream.ratePerSlot.toString());
  const claimable = earned - BigInt(stream.totalWithdrawn.toString());

  if (claimable <= BigInt(0)) {
    console.log("Nothing to withdraw yet");
    return;
  }

  console.log(`Expected claimable: ${claimable} (${Number(claimable) / 1e6} USDC)`);

  // Simulate
  const sim = await program.methods
    .withdrawFromStream()
    .accounts({ stream: streamPda, recipientToken })
    .simulate();

  console.log(`Simulation: ${sim.raw[0]?.unitsConsumed} CUs`);
  if (sim.raw[0]?.err) {
    console.error("Would fail:", sim.raw[0].err);
    console.log("Logs:", sim.raw[0]?.logs?.join("\n"));
  }
}
```

## Simulating x402 payments

```typescript
interface X402Quote {
  reference: Uint8Array; // 32 bytes
  amount: bigint;        // in smallest unit (e.g. USDC: 6 decimals)
  mint: PublicKey;
  providerToken: PublicKey;
  expiry: number;        // unix timestamp
}

async function simulateX402Payment(
  program: Program<X402Program>,
  quote: X402Quote,
  payer: PublicKey,
  payerToken: PublicKey
) {
  // Check quote not expired before simulating
  const now = Math.floor(Date.now() / 1000);
  const buffer = 30; // need at least 30s to simulate + land
  if (now + buffer > quote.expiry) {
    throw new Error(`Quote expires in ${quote.expiry - now}s — not enough time`);
  }

  const referenceArray = Array.from(quote.reference);

  const sim = await program.methods
    .payForRequest(
      referenceArray,
      new anchor.BN(quote.amount.toString()),
      new anchor.BN(quote.expiry)
    )
    .accounts({
      payer,
      payerToken,
      providerToken: quote.providerToken,
      // paymentRecord derived from reference
    })
    .simulate({ commitment: "processed" });

  const cu = sim.raw[0]?.unitsConsumed ?? 0;
  console.log(`x402 payment simulation: ${cu} CUs`);
  
  if (sim.raw[0]?.err) {
    console.error("Payment would fail:", sim.raw[0].err);
    return false;
  }

  return true;
}
```

## Testing PayFi scenarios in local validator

```typescript
// anchor/tests/payfi_scenarios.ts
import * as anchor from "@coral-xyz/anchor";
import { assert } from "chai";

describe("PayFi simulation scenarios", () => {
  it("escrow: cannot release before unlock time", async () => {
    const unlockAt = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

    await program.methods
      .createEscrow(new anchor.BN(1_000_000), new anchor.BN(unlockAt), recipient.publicKey)
      .accounts({ ... })
      .rpc();

    // Simulate release — should fail
    const sim = await program.methods
      .releaseEscrow()
      .accounts({ ... })
      .simulate()
      .catch((e) => e);

    assert.include(
      sim.message ?? JSON.stringify(sim),
      "NotUnlockedYet",
      "Expected NotUnlockedYet error"
    );
  });

  it("stream: correct claimable after N slots", async () => {
    // Advance slots (local validator only)
    const startSlot = (await program.provider.connection.getSlot());
    
    // ... create stream with rate 1000 per slot ...
    
    // Advance 10 slots
    for (let i = 0; i < 10; i++) {
      await program.provider.connection.requestAirdrop(
        anchor.web3.Keypair.generate().publicKey,
        1
      );
    }
    
    const endSlot = (await program.provider.connection.getSlot());
    const elapsed = endSlot - startSlot;
    const expectedClaimable = elapsed * 1000;
    
    // Simulate withdraw and verify logs
    const sim = await program.methods.withdrawFromStream()
      .accounts({ ... })
      .simulate();
    
    assert.isNull(sim.raw[0]?.err);
    const cuUsed = sim.raw[0]?.unitsConsumed ?? 0;
    assert.isBelow(cuUsed, 20_000, `Stream withdraw should use < 20k CU, used ${cuUsed}`);
  });

  it("x402: payment fails with expired quote", async () => {
    const expiredQuote = {
      reference: anchor.web3.Keypair.generate().publicKey.toBuffer(),
      amount: BigInt(1_000_000), // 1 USDC
      expiry: Math.floor(Date.now() / 1000) - 60, // already expired
    };
    
    const sim = await program.methods
      .payForRequest(
        Array.from(expiredQuote.reference),
        new anchor.BN(expiredQuote.amount.toString()),
        new anchor.BN(expiredQuote.expiry)
      )
      .accounts({ ... })
      .simulate()
      .catch((e) => e);
    
    assert.include(
      JSON.stringify(sim),
      "QuoteExpired",
      "Should reject expired quote"
    );
  });
});
```

## Monitoring live payment programs

```typescript
// Watch for stale escrows (unlock time passed but not yet released)
async function findStaleEscrows(
  program: Program<EscrowProgram>,
  connection: Connection
): Promise<PublicKey[]> {
  const slot = await connection.getSlot("finalized");
  const blockTime = await connection.getBlockTime(slot);
  if (!blockTime) return [];

  const allEscrows = await program.account.escrow.all();
  
  return allEscrows
    .filter((e) => e.account.unlockAt.toNumber() <= blockTime)
    .map((e) => e.publicKey);
}

// Watch for streams about to run dry
async function findLowStreams(
  program: Program<StreamProgram>
): Promise<{ stream: PublicKey; remainingSlots: number }[]> {
  const streams = await program.account.stream.all();
  const slot = await program.provider.connection.getSlot();
  
  return streams
    .filter((s) => s.account.endSlot.toNumber() > slot)
    .map((s) => ({
      stream: s.publicKey,
      remainingSlots: s.account.endSlot.toNumber() - slot,
    }))
    .filter((s) => s.remainingSlots < 1000); // alert if < 1000 slots remaining
}
```
