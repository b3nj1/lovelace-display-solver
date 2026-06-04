# Step 9 — Layout Selection and Coordinate Computation (`solver/layout.ts`)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` (anchor: step-discipline) through (anchor: signoff-format)
- Implementation Steps index: `esphome_display_solver_plan.md` (anchor: implementation-steps)

## Plan section references

- Viewing distance → layout density presets: (anchor: multi-display)
- Display Profile Schema (layouts, glyph_sizes, margin_px, burn_in_drift): (anchor: display-profile-schema)
- Solver pipeline steps 5–8: (anchor: solver-pipeline)
- Burn-in drift formula: (anchor: solver-pipeline)

## Prerequisites

- Step 6 (`src/solver/types.ts`) complete
- Step 7 utilities complete
- `npm run typecheck` passing

## Context

`src/solver/layout.ts` handles the display-specific portion of the solver pipeline:
selecting which layout to use and computing pixel coordinates for each glyph entry.
Pure functions only.

## Deliverables

### `src/solver/layout.ts`

```ts
import type { DisplayProfile, LayoutEntry, ActiveEntry, GlyphEntry } from './types';
```

#### Viewing distance expansion

```ts
export const VIEWING_DISTANCE_PRESETS: Record<string, {
  max_size: string;
  max_info_rows: number;
  prefer_fewer_icons: boolean;
}> = {
  far:   { max_size: 'medium', max_info_rows: 0, prefer_fewer_icons: true  },
  near:  { max_size: 'tiny',   max_info_rows: 4, prefer_fewer_icons: false },
  close: { max_size: 'tiny',   max_info_rows: 6, prefer_fewer_icons: false },
};

export function expandViewingDistance(profile: DisplayProfile): {
  max_size: string;
  max_info_rows: number;
  prefer_fewer_icons: boolean;
}
```

Returns the constraints for the profile's `viewing_distance` preset. (anchor: multi-display)

#### Layout selection

```ts
export function selectLayout(
  profile: DisplayProfile,
  iconCount: number,
  hasInfo: boolean,
): LayoutEntry | null
```

Algorithm (anchor: solver-pipeline):

1. Get constraints via `expandViewingDistance(profile)`.
2. Get available glyph size names ordered largest-to-smallest from `profile.glyph_sizes`.
   Filter layouts to those whose `icon.size` is at or below `constraints.max_size`
   in that order.
3. Filter: `iconCount >= layout.icon.min && iconCount <= layout.icon.max`.
4. Filter: skip layouts where `layout.info.min > 0` when `hasInfo === false`.
5. Filter: if `constraints.max_info_rows === 0`, skip layouts with `layout.info.min > 0`
   (this is the `far` distance filter — anchor: multi-display).
6. Return the first matching layout (user-declared order). Return `null` if none match.

#### Coordinate computation

```ts
export function computeGlyphCoordinates(
  profile: DisplayProfile,
  layout: LayoutEntry,
  entries: ActiveEntry[],
  now?: Date,  // injected for burn-in drift tests
): GlyphEntry[]
```

Algorithm (anchor: solver-pipeline):

1. If `profile.burn_in_drift`:
   ```
   xOffset = Math.floor(now.getHours() / 23 * profile.margin_px[0])
   yOffset = Math.floor(now.getMinutes() / 59 * profile.margin_px[1])
   ```
   When `now` is not provided, use `new Date()`.

2. Content area origin: `(profile.margin_px[0] + xOffset, profile.margin_px[1] + yOffset)`.

3. Cell size = `profile.glyph_sizes[layout.icon.size].px`.

4. Place each entry in a grid of `layout.icon.cols` columns, left-to-right,
   top-to-bottom. Cell `i` is at:
   ```
   col = i % layout.icon.cols
   row = Math.floor(i / layout.icon.cols)
   x = originX + col * cellSize
   y = originY + row * cellSize
   ```

5. Entries that are `indicatorOnly` are skipped (they do not appear in the glyph grid).

6. For each placed entry, resolve `r, g, b` from the entry's `color` via
   `resolveColor` (import from `utils/color.ts`).

7. Return `GlyphEntry[]`. The `codepoint` field is left as `""` — codepoint
   resolution happens in the next pipeline stage (Step 10, solver/index.ts) via the
   `GlyphResolver` function. Setting it here would require the layout module to depend
   on the glyph resolver, which the caller injects.

#### Info line coordinate helper

```ts
export function computeInfoCoordinates(
  profile: DisplayProfile,
  layout: LayoutEntry,
  now?: Date,
): { x: number; y: number; lineHeight: number }
```

Returns the top-left origin and line height for the info text area. The info area is
positioned below the glyph grid within `screen_px`. Exact formula:

```
glyphAreaHeight = Math.ceil(iconCount / layout.icon.cols) * glyph_sizes[layout.icon.size].px
infoOriginY = margin_px[1] + yOffset + glyphAreaHeight
infoOriginX = margin_px[0] + xOffset
lineHeight = 12  // fixed; font size for info text is not in the profile schema yet
```

Note: `iconCount` is not available here; this helper returns a factory that takes
`iconCount` as a parameter, or accepts it directly. Use whichever is cleaner.

## Tests (`tests/layout.test.ts`)

Required test cases:

1. `expandViewingDistance`: `"far"` → `max_info_rows: 0`, `prefer_fewer_icons: true`
2. `expandViewingDistance`: `"near"` → `max_info_rows: 4`
3. `expandViewingDistance`: `"close"` → `max_info_rows: 6`
4. `selectLayout`: 1 icon, `far` profile with only `info.min: 0` layouts → matches
   the layout with `icon.min <= 1 <= icon.max`
5. `selectLayout`: 5 icons, layout `icon.max: 4` → skipped; next layout with larger
   `icon.max` selected
6. `selectLayout`: `hasInfo: false`, layout has `info.min: 1` → skipped
7. `selectLayout`: no matching layout → `null`
8. `selectLayout`: `far` distance, layout with `info.min > 0` → skipped even if icon
   count matches
9. `computeGlyphCoordinates`: 4 entries in a 2-column layout →
   entries 0 and 1 share row 0; entries 2 and 3 share row 1
10. `computeGlyphCoordinates`: `indicatorOnly` entry not included in output
11. `computeGlyphCoordinates`: burn-in drift at hour=23, minute=59 → coordinates
    shifted by `margin_px`
12. `computeGlyphCoordinates`: burn-in drift at hour=0, minute=0 → no shift
13. `computeGlyphCoordinates`: `burn_in_drift: false` → no shift regardless of time

## Constraints

- No DOM, no `hass`, no `any`
- `now` parameter defaults to `new Date()` — tests always inject
- `computeGlyphCoordinates` does **not** resolve codepoints; `GlyphEntry.codepoint`
  is `""` on output
- `computeGlyphCoordinates` does **not** handle group placement; groups are handled
  by the pipeline in Step 10

## Agent instructions

### dev agent

Implement `src/solver/layout.ts` as specified.

### test agent

Implement `tests/layout.test.ts` with all 13 cases. Run `npm test`. Zero failures.

### user-review agent

Review from a user-config perspective:
- If a user declares a `viewing_distance: far` profile but accidentally adds a layout
  with `info.min: 0` and `info.max: 2`, will it be selected or filtered? The plan says
  `far` filters OUT layouts with `info.min > 0`. Layouts with `info.min: 0` are fine.
  Is this clearly documented / is the filter logic correct?
- `selectLayout` returns `null` on no match. What does the solver do with this?
  (Step 10 returns `error: true`.) Is this silent or is there a useful warning for the
  user? Should `selectLayout` also return a reason string?

File issues as numbered list.

### code-review agent

Review:
- `expandViewingDistance`: is the `max_size` comparison against layout sizes correct?
  Sizes are strings (`'large'`, `'medium'`, etc.); comparison requires ordering.
  The ordering comes from the display profile's `glyph_sizes` keys. Is the ordering
  derivation correct?
- `computeGlyphCoordinates` integer math: `Math.floor` used consistently (no floats
  in pixel coordinates)?
- burn-in drift formula: `hour / 23` at hour=0 gives 0; at hour=23 gives 1.0 —
  confirm this is intentional and matches anchor: solver-pipeline exactly
