# /optimize-cu — Profile and Optimize Compute Units

## Usage

```
/optimize-cu <FILE_PATH>          # analyze an Anchor instruction handler
/optimize-cu --measure <SIGNATURE> --cluster devnet
/optimize-cu --budget <TARGET_CU>  # suggest how to hit a CU target
```

## What this command does

1. If given a Rust file: static analysis of CU-expensive patterns
2. If given a transaction signature: fetch actual CU consumption
3. Suggests specific optimizations ranked by estimated CU savings
4. Recommends correct `ComputeBudgetProgram.setComputeUnitLimit` value

## Analysis checklist

When analyzing Rust handler code:

```
[ ] Large Account<T> deserialization — suggest AccountInfo for read-only fields
[ ] Loops over Vec — suggest iterator adapters, avoid clone
[ ] String fields in account structs — suggest [u8; N] fixed arrays  
[ ] Multiple CPI calls — check if any can be batched or eliminated
[ ] SHA256/hash calls in loops — suggest caching
[ ] sol_log_compute_units missing — add for profiling
[ ] Zero-copy candidates — accounts > 1KB with tight CU budget
[ ] Realloc inside instruction — flag as expensive
```

## Output format

```
Instruction: deposit
Measured CU: 183,240

Optimization opportunities (estimated savings):
  1. Use AccountLoader<LargePool> instead of Account<LargePool>: -40,000 CU
  2. Remove String fields, use [u8; 32] in VaultName: -8,000 CU  
  3. Cache SHA256 result outside loop (called 10x): -4,050 CU
  4. Eliminate redundant token balance check CPI: -5,500 CU

Estimated post-optimization: ~125,690 CU
Recommended budget: 145,000 CU (15% buffer)

Priority fee suggestion: use getRecentPrioritizationFees() at send time
```

## Related

- Detailed CU optimization guide → read `skill/compute-optimization.md`
