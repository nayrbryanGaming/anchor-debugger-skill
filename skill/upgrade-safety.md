# Program Upgrade Safety — Anchor Debugger Skill

## The upgrade risk model

Solana programs are upgradeable via `BPFLoaderUpgradeable`. Anchor adds account discriminators and IDL versioning on top. Breaking an upgrade can corrupt every account in your program — affecting all users instantly, irreversibly.

**Core risks:**
1. Account struct layout changes → deserialization failure for existing accounts
2. Discriminator changes → all existing accounts become "unknown"
3. Instruction discriminator changes → client SDKs break silently
4. PDA seed changes → all derived addresses change, losing access to existing accounts

## Pre-upgrade checklist

### 1. Check account struct compatibility

```rust
// SAFE — adding new fields at the END with realloc
#[account]
pub struct VaultV2 {
    pub authority: Pubkey,  // existing: offset 8
    pub amount: u64,         // existing: offset 40
    pub new_field: u64,      // NEW — append at end, use realloc
}

// UNSAFE — inserting in the middle (shifts all offsets)
#[account]
pub struct VaultBROKEN {
    pub authority: Pubkey,
    pub new_field: u64,  // ← WRONG: this shifts `amount` to offset 48
    pub amount: u64,     // now at wrong offset
}

// UNSAFE — changing field type
#[account]
pub struct VaultBROKEN2 {
    pub authority: Pubkey,
    pub amount: i64,  // was u64 — same size but semantically breaking
}
```

**Rule**: Existing fields must keep their name, type, and position. New fields go at the END.

### 2. Calculate new space requirements

```rust
// Add to Cargo.toml: anchor-lang = { features = ["derive"] }
use anchor_lang::prelude::*;

#[account]
pub struct VaultV2 {
    pub authority: Pubkey,   // 32
    pub amount: u64,          // 8
    pub created_at: i64,      // 8
    pub new_counter: u32,     // 4  ← new
}

// INIT_SPACE gives you the right number
// Total: 32 + 8 + 8 + 4 = 52
// With discriminator: 8 + 52 = 60 bytes
impl VaultV2 {
    pub const SIZE: usize = 8 + 32 + 8 + 8 + 4; // 60
}
```

### 3. Verify IDL compatibility

```bash
# Generate current IDL
anchor build

# Diff against deployed IDL (fetch from chain)
solana program dump <PROGRAM_ID> current.so
anchor idl fetch <PROGRAM_ID> --url mainnet-beta > deployed_idl.json

# Compare instruction discriminators
jq '.instructions[].name' deployed_idl.json
jq '.instructions[].name' target/idl/your_program.json
```

**Critical**: if any instruction NAME changes, its discriminator (first 8 bytes of sha256("global:<name>")) changes, breaking all existing client calls.

### 4. Write a migration instruction (for struct changes)

```rust
// Add a migration instruction that runs BEFORE users interact
pub fn migrate_vault_v1_to_v2(ctx: Context<MigrateVault>) -> Result<()> {
    let vault = &mut ctx.accounts.vault;
    // Set default for new field — old accounts have zeroes here
    if vault.new_counter == 0 && vault.authority != Pubkey::default() {
        vault.new_counter = 1; // sensible default
    }
    Ok(())
}

#[derive(Accounts)]
pub struct MigrateVault<'info> {
    #[account(
        mut,
        realloc = VaultV2::SIZE,       // new size
        realloc::payer = authority,
        realloc::zero = false,          // keep existing data
    )]
    pub vault: Account<'info, VaultV2>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}
```

### 5. Test the upgrade locally before mainnet

```bash
# Save current program state
solana program dump <PROGRAM_ID> before_upgrade.so --url mainnet-beta

# Test on local validator with mainnet state
solana-test-validator \
  --bpf-program <PROGRAM_ID> ./before_upgrade.so \
  --reset

# Deploy new version to local
anchor deploy --program-keypair ./target/deploy/your_program-keypair.json \
  --url localhost

# Run upgrade-specific tests
anchor test --skip-deploy -- --grep "migration"
```

## Upgrade execution

```bash
# Check current upgrade authority
solana program show <PROGRAM_ID>

# Build
anchor build

# Deploy upgrade (NOT a new deploy)
anchor upgrade \
  target/deploy/your_program.so \
  --program-id <PROGRAM_ID> \
  --provider.cluster mainnet-beta

# Verify the new program hash
solana program show <PROGRAM_ID>
```

## Freeze/lock upgrade authority (after audit)

```bash
# IRREVERSIBLE — only do after full audit + confidence
solana program set-upgrade-authority <PROGRAM_ID> --final

# Or transfer to multisig (Squads)
solana program set-upgrade-authority <PROGRAM_ID> \
  --new-upgrade-authority <SQUADS_MULTISIG_PUBKEY>
```

## Anchor IDL upgrade

```bash
# Update on-chain IDL after upgrade (for clients/explorers)
anchor idl upgrade <PROGRAM_ID> \
  --filepath target/idl/your_program.json \
  --provider.cluster mainnet-beta
```

## Breaking change detection script

```typescript
import deployedIdl from "./deployed_idl.json";
import newIdl from "./target/idl/your_program.json";

function checkBreakingChanges() {
  // Check instruction discriminators
  const deployedInstructions = new Map(
    deployedIdl.instructions.map((ix: any) => [ix.name, ix])
  );
  
  for (const ix of newIdl.instructions) {
    if (!deployedInstructions.has(ix.name)) {
      console.warn(`NEW instruction: ${ix.name} — clients need update`);
    }
  }
  
  for (const [name] of deployedInstructions) {
    if (!newIdl.instructions.find((ix: any) => ix.name === name)) {
      console.error(`REMOVED instruction: ${name} — BREAKING CHANGE`);
    }
  }
  
  // Check account types
  const deployedAccounts = new Map(
    deployedIdl.accounts?.map((a: any) => [a.name, a]) ?? []
  );
  
  for (const account of newIdl.accounts ?? []) {
    const deployed = deployedAccounts.get(account.name);
    if (!deployed) {
      console.log(`NEW account type: ${account.name}`);
      continue;
    }
    
    const deployedFields = deployed.type.fields;
    const newFields = account.type.fields;
    
    // Check existing fields weren't reordered or retyped
    for (let i = 0; i < Math.min(deployedFields.length, newFields.length); i++) {
      if (deployedFields[i].name !== newFields[i].name) {
        console.error(`BREAKING: ${account.name}.${deployedFields[i].name} renamed/moved to position ${i}`);
      }
      if (deployedFields[i].type !== newFields[i].type) {
        console.error(`BREAKING: ${account.name}.${deployedFields[i].name} type changed`);
      }
    }
  }
}

checkBreakingChanges();
```

## Common upgrade mistakes

| Mistake | Consequence | Prevention |
|---------|------------|------------|
| Renaming an instruction | Discriminator changes, all client calls fail | Never rename — add new instruction, deprecate old |
| Adding field in middle of struct | All existing accounts corrupt | Always append at end |
| Changing PDA seeds | All existing PDAs become unreachable | Never change seeds — use versioned PDAs |
| Upgrading without IDL update | Explorers/clients show stale interface | Always run `anchor idl upgrade` after deploy |
| No migration for new required fields | Existing accounts have zeroes in new fields | Write migration instruction with sensible defaults |
| Forgetting to realloc for new fields | New fields corrupt adjacent memory | Always realloc when adding fields |
