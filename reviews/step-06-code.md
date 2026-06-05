# Code Review — Step 06: `src/solver/types.ts`

Reviewed files:
- `src/solver/types.ts`
- `tests/types.test.ts`

---

## Findings

### 1. (minor) Early `return` on non-object input breaks collect-all-errors contract — `validateCardConfig`, line 202

When `config` is not an object (e.g. `null`, a string, a number) the function
pushes one error and then immediately `return errors`. This is the only
permissible early exit because there is genuinely nothing further to validate —
the rest of the checks all require property access on an object. The behavior is
correct in practice, but the spec says "only the final `return errors` is
acceptable." Strictly speaking this is a spec violation.

Fix: restructure as an `if/else` so the remainder of the function is inside an
`else` block and the only explicit `return` statement is the final one.

---

### 2. (minor) `as Record<string, unknown>` cast is not `any` but could be tightened — `validateCardConfig`, line 204

The cast `config as Record<string, unknown>` is the standard safe pattern for
narrowing `unknown` without reaching for `any`. It is acceptable. However, the
same pattern is repeated many times in the function body for nested objects
(lines 244, 267, 269, 284, 317, 343). This is repetitive but not incorrect.

No fix required; flagged for awareness.

---

### 3. (nit) `tiers[i] as string` cast on line 216 is redundant after `typeof` narrowing

Inside the `else` branch of `if (typeof tiers[i] !== 'string')`, TypeScript
already knows `tiers[i]` is a `string`, so the `as string` assertion is
unnecessary noise.

Fix: remove the `as string` cast: `tierSet.add(tiers[i])`.

---

### 4. (major) Group cross-check silently skips when `groups` is omitted entirely — `validateCardConfig`, line 300

The guard on line 300 is:

```ts
if (typeof e['group'] === 'string' && groupIds.size > 0 && !groupIds.has(e['group'] as string))
```

The `groupIds.size > 0` condition means that if an entity references a group
name but the top-level `groups` array is omitted (or empty), the cross-check
is skipped entirely and no error is emitted. An entity with `group: "foo"` and
no `groups` array defined will silently pass validation.

The test for this case (test 7) works around it by explicitly requiring the
caller to declare at least one real group — the comment in the test even
acknowledges: "Declare at least one group so the group cross-check runs."
This means a config with `entities[0].group = "nonexistent"` and no `groups`
key at all will produce zero errors, which is incorrect.

Fix: remove the `groupIds.size > 0` guard. When `groupIds` is empty (because
`groups` is absent or empty) and an entity carries a non-empty `group` field,
that entity references an undeclared group and should produce an error.

---

### 5. (minor) `display_profiles[i].type` is only checked to be a string, not a valid enum value — line 322

The validator checks `typeof p['type'] !== 'string'` but does not verify the
value is one of `'esphome' | 'canvas' | 'cast' | 'png_file'`. An invalid type
such as `"mqtt"` will pass without error.

Fix: add a check against the valid set after the string check:

```ts
const validTypes = new Set(['esphome', 'canvas', 'cast', 'png_file']);
if (typeof p['type'] !== 'string' || !validTypes.has(p['type'] as string)) {
  errors.push(`display_profiles[${i}].type must be one of esphome|canvas|cast|png_file`);
}
```

---

### 6. (nit) Profile error messages omit the profile `id` when it is known — e.g. line 330

For entities, errors include `id=<value>` (line 258). Profile errors (lines 320,
322, 325, 330) use only the array index. When the `id` field is valid, it should
be included for consistency and actionability.

Fix: after the `id` check passes, include the id in subsequent error strings,
e.g. `display_profiles[${i}] (id=${String(p['id'])}) must have a service field`.

---

### 7. (nit) `display_profiles[i].screen_px` check does not verify element types — line 325

The check only verifies that `screen_px` is an array of length 2. It does not
check that both elements are numbers. A value like `["a", "b"]` will pass.

Fix: add `&& typeof (p['screen_px'] as unknown[])[0] === 'number' && typeof (p['screen_px'] as unknown[])[1] === 'number'`.

---

### 8. (nit) No test for duplicate group IDs (check 8) — `tests/types.test.ts`

The nine validation checks listed in the step spec are: tiers, entities, rules+thresholds
conflict, rule tier reference, threshold ordering, profile required fields, ESPHome service,
group cross-check, and group id uniqueness. The test suite contains 7 runtime
`validateCardConfig` tests (tests 1–7) but has no test for group id uniqueness
(check 8). The uniqueness code in `validateCardConfig` lines 336-351 is correct
but entirely untested.

Fix: add a test that passes a config with two groups sharing the same `id` and
asserts an error is returned.

---

### 9. (nit) No test for `entities` being an empty array — `tests/types.test.ts`

The spec states entities must be a non-empty array. There is a test for missing
`tiers` but no corresponding test for an empty `entities: []`. The code on line
223 correctly rejects this, but the test gap means a future regression would not
be caught.

Fix: add a test that passes `entities: []` and asserts an error mentioning
`entities`.

---

### 10. (nit) Compile-time tests have no negative cases — `tests/types.test.ts`

All TypeScript shape tests confirm that valid shapes compile. None attempt to
assign an invalid shape to verify the type would reject it. Negative compile
checks can only be achieved with `@ts-expect-error` comments, but their absence
means type narrowing regressions (e.g. making a required field optional by
accident) would not be caught by the test file.

This is a documentation/coverage gap, not a correctness bug. No fix required for
shipping, but worth noting for future test hardening.

---

### 11. (minor) `interface-only` constraint: file contains runtime logic — `src/solver/types.ts`

The step spec says the file should contain interfaces and types (compile-time only)
plus `validateCardConfig`. Including a runtime function in `types.ts` is by design
per the step spec, so this is not a violation. Noted for clarity only.

No fix required.

---

## Summary

| # | Severity | Area |
|---|---|---|
| 1 | minor | Early return technically violates collect-all-errors contract |
| 2 | nit | Repeated cast pattern (no fix needed) |
| 3 | nit | Redundant `as string` cast |
| 4 | major | Group cross-check silently skips when `groups` is absent |
| 5 | minor | Profile `type` not validated against enum values |
| 6 | nit | Profile error messages lack `id` context |
| 7 | nit | `screen_px` element types not checked |
| 8 | nit | No test for duplicate group IDs |
| 9 | nit | No test for empty `entities` array |
| 10 | nit | No negative compile-time shape tests |
| 11 | nit | Runtime function in types file (by design, no fix needed) |

The only blocking issue is **finding 4**: an entity with a `group` reference and
no `groups` array silently passes validation, which is a correctness bug. The
test suite actively papers over this with a workaround comment rather than
testing the real failure path.

SIGN-OFF: blocked — group cross-check silently passes when `groups` key is absent, and the corresponding test masks this rather than exposing it

---

## Second-pass verification (2026-06-04)

Verified against `src/solver/types.ts` and `tests/types.test.ts` after fixes were applied.

### Finding 1 (minor) — Early `return` restructured to if/else
RESOLVED. The function body is now a single `if/else` block (lines 199-354) with the only explicit `return errors` at the end of the function.

### Finding 2 (nit) — Repeated `as Record<string, unknown>` cast
No fix required (original decision unchanged).

### Finding 3 (nit) — Redundant `tiers[i] as string` cast
RESOLVED. Line 214 now reads `tierSet.add(tiers[i])` with no cast.

### Finding 4 (major) — Group cross-check guard `groupIds.size > 0`
RESOLVED. The guard is removed. Line 298 now reads:
`if (typeof e['group'] === 'string' && !groupIds.has(e['group']))`.
Test 7 now passes `entities[0].group = 'nonexistent_group'` with no `groups`
key in the config at all — `groupIds` is an empty Set, so the check fires
correctly and an error is returned. The workaround comment is gone.

### Finding 5 (minor) — `display_profiles[i].type` not validated against enum
RESOLVED. Lines 320-323 declare a `validProfileTypes` Set and reject any type
string not in `['esphome', 'canvas', 'cast', 'png_file']`.

### Finding 6 (nit) — Profile error messages omit profile id
RESOLVED. Line 332 builds a `profileId` suffix from `p['id']` when the id is
a non-empty string, and the ESPHome-service error on line 333 includes it. The
`id`, `type`, and `screen_px` errors correctly omit it because the id has not
yet been confirmed valid when those checks run.

### Finding 7 (nit) — `screen_px` element types not checked
RESOLVED. Lines 324-328 now verify `typeof spx[0] !== 'number' || typeof spx[1] !== 'number'` in addition to the array-length check.

### Finding 8 (nit) — No test for duplicate group IDs
RESOLVED. Test 8 (lines 151-160) passes a config with two groups sharing id
`'lights'` and asserts an error is returned.

### Finding 9 (nit) — No test for empty `entities` array
RESOLVED. Test 9 (lines 162-168) passes `entities: []` and asserts an error
mentioning `'entities'`.

### Finding 10 (nit) — No negative compile-time shape tests
No fix required (original decision unchanged).

### Finding 11 (nit) — Runtime function in types file
No fix required (by design, original decision unchanged).

---

SIGN-OFF: approved
