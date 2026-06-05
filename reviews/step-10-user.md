# Step 10 User Review — `src/solver/index.ts`

Reviewed files:
- `src/solver/index.ts`
- `src/solver/types.ts`
- `src/solver/layout.ts` (for `selectLayout` context)
- `src/solver/rules.ts` (for pipeline context)

---

## Re-review verdict (post-fix)

All 6 prior issues were addressed. Details below.

---

## Issue 1 — No diagnostic reason when `error: true`

**Prior severity: major | Status: RESOLVED**

`SolverResult` now has `errorReason?: string` in `types.ts` (line 180). The error
branch in `index.ts` (lines 318-319) populates it:

```
No layout matches: icon_count=${totalVisibleIcons}, hasInfo=${hasInfo}. Check your profile's layouts table.
```

This gives the caller an actionable message. The non-error path omits `errorReason`
(optional field, undefined = no error), which is clean.

---

## Issue 2 — Glyph warning does not say what to add to ESPHome YAML

**Prior severity: minor | Status: RESOLVED**

The warning (index.ts line 255) now reads:

```
Glyph 'X' not in profile 'Y' font_glyphs — will render blank.
Add 'X' to the glyphs: list in your ESPHome device YAML and recompile.
```

The actionable instruction ("Add 'X' to the glyphs: list in your ESPHome device
YAML and recompile") is present. The fix matches the suggested wording.

---

## Issue 3 — Trailing/double space when `unit` is empty

**Prior severity: minor | Status: RESOLVED**

`formatInfoLine` (index.ts line 45) now does `${text.trim()} ${label}`.trimEnd()`.
The `.trim()` call on `text` collapses the trailing space produced by the empty
`{unit}` substitution before the label is appended, so no double-space artifact
appears.

---

## Issue 4 — `page_count` JSDoc missing dwell contract

**Prior severity: minor | Status: PARTIALLY RESOLVED**

Sub-part (a) — JSDoc comment — is present (types.ts lines 182-184):

```ts
/** Total icon pages. 1 = no overflow. If >1, the caller must schedule a dwell
 *  callback (profile.page_dwell_s seconds) to advance currentPage and re-call solve(). */
page_count: number;
```

Sub-part (b) — mirror `page_dwell_s` into `SolverResult` so adapters need no
separate profile reference — was NOT implemented. `SolverResult` has no
`page_dwell_s` field.

The JSDoc does explicitly direct callers to read `profile.page_dwell_s`, so the
contract is documented even if the convenience field is absent. Because this was a
"minor" improvement rather than a correctness fix, and the workaround is one
attribute read, this is recorded as a known gap but does not block sign-off.

---

## Issue 5 — Entity with no rules/thresholds silently dropped

**Prior severity: nit | Status: RESOLVED**

`index.ts` lines 228-232 now push a warning for every entity config that has
neither `rules` nor `thresholds`:

```ts
warnings.push(`Entity '${config.id}' has no rules or thresholds and will never be active.`);
```

The check happens regardless of whether `evaluateEntity` returned an entry or null
(since such entities can only return null). Warning is always emitted for this case.

---

## Issue 6 — Burn-in offset formula duplicated in index.ts

**Prior severity: nit | Status: RESOLVED**

`computeBurnInOffsets` is now imported from `layout.ts` (index.ts line 18) and
called in both `computeSeverityBar` (line 96) and the main pipeline (line 378). No
inline arithmetic duplication remains.

---

## New issues introduced by fixes

None found. The changes are surgical: no new public API surface added beyond
`errorReason?: string`, no logic paths altered outside the targeted locations, and
the burn-in import is a clean extraction.

---

## Summary

| # | Severity | One-liner | Status |
|---|----------|-----------|--------|
| 1 | major    | `error: true` gives no actionable reason | RESOLVED |
| 2 | minor    | Font-glyph warning did not explain ESPHome fix | RESOLVED |
| 3 | minor    | Default format double-spaced label when unit absent | RESOLVED |
| 4 | minor    | `page_count` dwell contract undocumented; `page_dwell_s` not in result | PARTIALLY RESOLVED (JSDoc done; `page_dwell_s` field not added — acceptable gap) |
| 5 | nit      | Entity with no rules/thresholds silently dropped | RESOLVED |
| 6 | nit      | Burn-in offset formula duplicated | RESOLVED |

---

SIGN-OFF: approved
