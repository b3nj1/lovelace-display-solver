# Step 16 — Info Text Font Scaling

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` (anchor: step-discipline) through (anchor: signoff-format)
- Implementation Steps index: `esphome_display_solver_plan.md` (anchor: implementation-steps)

## Plan section references

- Display profile schema: (anchor: display-profile-schema)
- Info line rendering: (anchor: info-lines)
- Canvas adapter: Step 12

## Prerequisites

- Step 15 (HACS distribution) complete
- All prior step tests passing

## Context

Info text is currently rendered at a hardcoded `12px monospace` in `canvas.ts`
regardless of glyph size or viewing distance. At `far` with 96px glyphs, the 12px
label is barely legible next to the icon. At `close` with a 12px glyph after
size_scale, the label and icon are the same height and collide.

The fix has two layers:

1. **Profile-level opt-in** — `DisplayProfile` gains an optional `info_font_px`
   field. When set, it overrides the 12px default for that profile. This lets
   ESPHome profiles that only scroll text still control font size independently of
   glyph size.

2. **Proportional default** — when `info_font_px` is absent, derive the info font
   size from the selected layout's glyph `sizePx`:

   ```
   info_font_px = max(10, round(sizePx * INFO_FONT_RATIO))
   INFO_FONT_RATIO = 0.25   (quarter of icon height, tunable)
   ```

   With 96px glyphs this gives 24px info text — clearly readable from a distance.
   With 24px glyphs it gives 10px (clamped minimum) — compact but legible.
   `near` with 48px glyphs gives 12px — the current hardcoded value, so no change
   for the common case without an explicit setting.

The `INFO_CAP_HALF` vertical centering offset in `solver/index.ts` (currently a
hardcoded `5`) must also scale:

```
INFO_CAP_HALF = round(info_font_px * 0.4)
```

For 12px: `round(12 * 0.4) = 5` — same as today.
For 24px: `round(24 * 0.4) = 10` — vertically centres 24px text correctly.

## Schema change

```ts
// src/solver/types.ts — DisplayProfile
info_font_px?: number;   // optional; overrides proportional default
```

No validator change required — the field is optional and unconstrained beyond
being a positive number.

## Data flow

```
DisplayProfile.info_font_px
        │
        ▼
solver/index.ts stage 9
  resolved_info_font = profile.info_font_px
                       ?? max(10, round(glyph.sizePx * 0.25))
  INFO_CAP_HALF      = round(resolved_info_font * 0.4)

  info.push({
    text,
    x:         glyph.x + glyph.sizePx + INFO_SIDE_GAP,
    y:         glyph.y + floor(glyph.sizePx / 2) + INFO_CAP_HALF,
    fontSize:  resolved_info_font,   ← new field on InfoEntry
    r, g, b,
  })
```

`InfoEntry` gains a `fontSize: number` field. `drawInfoRows` in `canvas.ts` uses
`entry.fontSize` instead of the hardcoded `12`.

ESPHome adapter: info font size is already passed as a service parameter
(`text_sizes` array); update `packESPhomePayload` to use `entry.fontSize`.

## Files changed

| File | Change |
|---|---|
| `src/solver/types.ts` | Add `info_font_px?: number` to `DisplayProfile`; add `fontSize: number` to `InfoEntry` |
| `src/solver/index.ts` | Stage 9: compute `resolved_info_font` from profile or glyph size; compute `INFO_CAP_HALF` from font size; write `fontSize` into each `InfoEntry` |
| `src/adapters/canvas.ts` | `drawInfoRows`: replace `'12px monospace'` with `'${entry.fontSize}px monospace'` |
| `src/adapters/esphome.ts` | `packESPhomePayload`: use `entry.fontSize` for `text_sizes` |

## Tests

### `tests/solver.test.ts` additions

**Test 23 — Proportional info font size**

```
profile: info_font_px absent, glyph sizePx=96
expected: info[0].fontSize = max(10, round(96 * 0.25)) = 24
```

```
profile: info_font_px absent, glyph sizePx=48
expected: info[0].fontSize = max(10, round(48 * 0.25)) = 12
```

```
profile: info_font_px absent, glyph sizePx=24 (after size_scale close=0.5 → 12px)
expected: info[0].fontSize = max(10, round(12 * 0.25)) = max(10, 3) = 10
```

**Test 24 — Explicit info_font_px overrides proportional**

```
profile: info_font_px=18, glyph sizePx=96
expected: info[0].fontSize = 18   (not 24)
```

**Test 25 — INFO_CAP_HALF scales with font size**

Two entities, same glyph.y, different info_font_px values on two different
profile runs. Verify that `info.y - glyph.y - floor(sizePx/2)` equals
`round(fontSize * 0.4)` in each case.

### `tests/layout.test.ts` — no changes needed

Size scaling is a solver stage 9 concern; layout tests are unaffected.

### `tests/canvas.test.ts` (if it exists, otherwise add)

Mock a `CanvasRenderingContext2D`. Call `drawInfoRows` with `InfoEntry[]`
entries carrying different `fontSize` values. Assert that `ctx.font` is set to
`'${entry.fontSize}px monospace'` for each entry.

## Constraints

- `INFO_FONT_RATIO = 0.25` is a named constant in `index.ts`, not a magic number
- Minimum info font size is `10` regardless of ratio or declared value
- `fontSize` is a required field on `InfoEntry` (not optional) — the solver always
  resolves it; no consumer needs to handle `undefined`
- ESPHome service payload must not break if `text_sizes` is updated; array lengths
  must remain consistent with the other payload arrays

## Agent instructions

### dev agent

Implement all file changes above. Use `INFO_FONT_RATIO = 0.25` and `MIN_INFO_FONT
= 10` as named constants. Do not change `InfoEntry.x` / `InfoEntry.y` semantics —
only add `fontSize`. Update the ESPHome adapter's `text_sizes` array to use
`entry.fontSize`.

### test agent

Implement tests 23–25 in `solver.test.ts`. Add or extend `canvas.test.ts` for
`drawInfoRows` font size assertion. Run `npm test`. Zero failures.

### user-review agent

Load the card in HA with each viewing distance. Confirm that:
1. At `far`, info text is visibly larger than at `near`
2. At `close`, info text is smaller (or at minimum 10px) relative to `near`
3. Setting `info_font_px: 18` in a profile YAML overrides the proportional size
4. The text still aligns vertically next to its glyph — no overlap with the icon

### code-review agent

1. Confirm `INFO_FONT_RATIO` and `MIN_INFO_FONT` are named constants, not
   inline magic numbers
2. Confirm `fontSize` is always populated on every `InfoEntry` — no code path
   leaves it undefined
3. Confirm `text_sizes` array in ESPHome payload remains the same length as all
   other payload arrays after the change
4. Confirm `drawInfoRows` does not fall back to `'12px'` anywhere
