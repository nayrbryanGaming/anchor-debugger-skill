# /check-upgrade — Verify Anchor Program Upgrade Safety

## Usage

```
/check-upgrade <NEW_IDL_PATH> <DEPLOYED_IDL_PATH>
/check-upgrade <NEW_IDL_PATH> --program-id <PROGRAM_ID> --cluster mainnet-beta
/check-upgrade --diff-structs <OLD_RS> <NEW_RS>
```

## What this command does

1. Fetches deployed IDL from chain (or uses provided file)
2. Diffs instruction names, accounts, and account struct field layouts
3. Flags breaking changes (renamed fields, reordered fields, type changes, removed instructions)
4. Flags additive changes that need migration (new fields, space increases)
5. Outputs a go/no-go with specific issues to fix

## Checks performed

```
Instruction compatibility:
  [ ] No instruction names removed
  [ ] No instruction names changed
  [ ] New instructions are additive only

Account struct compatibility:
  [ ] No fields removed from existing structs
  [ ] No fields reordered (position changed)
  [ ] No field types changed
  [ ] New fields are only appended at end
  [ ] Space calculation updated to include new fields

PDA compatibility:
  [ ] No seed changes for existing PDAs
  [ ] No bump seed logic changed

IDL:
  [ ] anchor idl upgrade queued for after deploy
```

## Output format

```
Upgrade Safety Report: MyProgram v1 → v2
Cluster: mainnet-beta
Program ID: <ID>

✅ Instructions: No breaking changes
   + Added: process_v2 (new instruction, additive)

⚠️  Account structs:
   VaultAccount: NEW FIELD appended — needs realloc + migration
   + new_field: u32 at end (safe if realloc is included)
   Space change: 52 → 56 bytes

❌ BLOCKING:
   None

Migration required:
   - Add migrate_vault instruction with realloc = 8 + 56
   - Set new_field default = 0 for existing accounts

VERDICT: Safe to upgrade — add migration instruction first
```

## Related

- Full upgrade guide → read `skill/upgrade-safety.md`
