# Anchor Coding Rules — Anchor Debugger Skill

These rules are enforced when generating or reviewing Anchor program code.

## Safety rules (never violate)

- **ALWAYS use checked arithmetic** (`checked_add`, `checked_sub`, `checked_mul`) — never bare `+`/`-`/`*` on token amounts or balances.
- **NEVER use `AccountInfo` without a safety comment** — any `/// CHECK:` field must have an explicit validation in the handler.
- **ALWAYS store the canonical bump** — never call `find_program_address` at runtime; compute once on init, store in the account struct.
- **NEVER close accounts by zeroing data** — always use the `close = destination` constraint to prevent revival attacks.
- **ALWAYS add `has_one` or `constraint` for authority checks** — never check authority only in handler logic without an account constraint.

## Performance rules

- **Use `#[derive(InitSpace)]`** for all new account structs — no hardcoded space magic numbers.
- **Prefer fixed-size arrays over `String`/`Vec`** in account structs when the size is bounded.
- **Use `AccountLoader<T>` (zero-copy) for accounts > 1KB** that are accessed frequently.
- **Add `sol_log_compute_units()`** at key points during development to profile CU usage before deploying.
- **Set explicit `ComputeBudgetProgram.setComputeUnitLimit`** — never rely on the 400k default in production.

## Upgrade safety rules

- **NEVER rename instruction handlers** — add new ones instead and deprecate old.
- **NEVER reorder or remove fields** from existing account structs — only append new fields at the end.
- **ALWAYS write a migration instruction** before deploying struct changes that add fields.
- **ALWAYS run `anchor idl upgrade`** after deploying a new program version.

## Testing rules

- **ALWAYS simulate before sending** on mainnet — assert CU consumption and absence of errors.
- **Test migration instructions** against accounts created by the previous program version.
- **Add a simulation test** (not just execution test) for each instruction to catch CU regressions.

## Code style

- Error codes must use descriptive names (not `Error001`).
- All `require!` calls must specify a custom error code — never use `require!(expr)` without error context.
- Log context in handlers with `msg!()` for debugging: key pubkeys, amounts, critical precondition values.
