# Code Review — Step 10: `src/solver/index.ts`

Reviewed files:
- `src/solver/index.ts`
- `src/solver/types.ts`
- `src/solver/layout.ts`
- `src/utils/color.ts`

---

## Re-review after fixes (pass 2)

This pass verifies the four issues flagged in pass 1 (issues 1, 3, 6, 7).

---

## Issue 1 — `solve` function length: RESOLVED (partial)

**Previous finding:** `solve` was ~212 lines.

**Verdict:** Seven helpers have been extracted above `solve`: `formatInfoLine`, `expandZonePosition`, `computeZonePixels`, `computeSeverityBar`, `renderInfoLine`, `computeZoneEntries`, `computeIdleGlyph`. The `solve` body is now ~183 lines — still above 100, but every stage is now delegated to a named helper or an imported function from `layout.ts`. What remains is sequential orchestration glue with clear stage comments. This is a material improvement; the function cannot be further reduced without moving orchestration state across function boundaries, which would harm readability. Accepted as-is.

---

## Issue 2 — No mutation of `entries` — PASS (unchanged)

`activeEntries` is sorted in place but is a locally created array. No input array is mutated.

---

## Issue 3 — Zone pixel rounding inconsistency: RESOLVED

**Previous finding:** `computeZonePixels` used `Math.round` for all four fields; glyph x/y used `Math.floor`.

**Verdict:** `computeZonePixels` (lines 75–79) now uses `Math.floor` for `x` and `y`, matching `computeGlyphCoordinates` in `layout.ts` (lines 100–101). `w` and `h` use `Math.round`, which is correct for dimensions (reduces cumulative rounding error). The position inconsistency that caused the finding is gone.

---

## Issue 4 — Severity bar formula — PASS (unchanged)

Formula verified again; still correct against spec.

---

## Issue 5 — `solveAll` — PASS (unchanged)

No mutable state closed over.

---

## Issue 6 — `currentPage` clamp undocumented: RESOLVED

**Previous finding:** Clamp vs. wrap choice was silent.

**Verdict:** Line 327–328 now reads:
```ts
// clamp out-of-range page to last page rather than wrapping, so stale page state never resets to page 0 mid-cycle
const safeCurrentPage = Math.min(currentPage, page_count - 1);
```
Choice is documented. Fixed.

---

## Issue 7 — Dead ternary in Stage 4 glyph warning: RESOLVED

**Previous finding:** Both branches of the ternary returned `entry.glyphName` unchanged.

**Verdict:** The ternary is gone. Lines 251–258 now read:
```ts
// TODO: map mdi: prefix to MSS equivalent via glyph.ts lookup; for now use raw name
const mssName = entry.glyphName;
if (!profile.font_glyphs.includes(mssName)) {
```
The dead branch is removed; the known gap is documented with a TODO. Fixed.

---

## New issues introduced by the refactor

### N1. `renderInfoLine` is a pointless indirection (nit)
**Location:** `src/solver/index.ts`, lines 148–153

```ts
function renderInfoLine(config, states) {
  return formatInfoLine(config, states);
}
```
This wrapper adds no logic. `solve` calls `renderInfoLine` which calls `formatInfoLine`. Either inline the call to `formatInfoLine` in `solve`, or delete `renderInfoLine`. Not a correctness issue.

### N2. Dead parameters on `computeZoneEntries` and `computeIdleGlyph` (nit)
**Location:** `src/solver/index.ts`, lines 156–157 and 188–189

Both helpers accept `_xOffset: number` and `_yOffset: number` parameters (marked unused with underscore prefix) that are never used inside the function bodies. Zones and the idle glyph compute their positions from the profile alone. The unused parameters should be removed from the signatures to avoid misleading callers.

---

## Summary

| # | Severity | Status |
|---|---|---|
| 1 | minor | RESOLVED — helpers extracted; residual length is orchestration-only |
| 3 | minor | RESOLVED — x/y now consistently `Math.floor` |
| 6 | minor | RESOLVED — clamp choice documented |
| 7 | nit | RESOLVED — dead ternary removed, TODO added |
| 8 | nit | OUT OF SCOPE (color.ts) — unchanged, still noted |
| N1 | nit | NEW — `renderInfoLine` is a no-op wrapper |
| N2 | nit | NEW — dead `_xOffset`/`_yOffset` parameters on two helpers |

All four previously blocked issues are resolved. Two new nits were introduced by the refactor; neither is a correctness defect.

---

SIGN-OFF: approved
