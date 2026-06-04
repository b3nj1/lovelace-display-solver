# Step 10 — Solver Pipeline Core (`solver/index.ts`)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` (anchor: step-discipline) through (anchor: signoff-format)
- Implementation Steps index: `esphome_display_solver_plan.md` (anchor: implementation-steps)

## Plan section references

- Solver Architecture Rules: (anchor: solver-architecture)
- Full pipeline (steps 1–13): (anchor: solver-pipeline)
- Group placement: (anchor: group-placement)
- Icon page cycling — solver pipeline: (anchor: icon-page-cycling-solver)
- Icon page cycling — dwell timer: (anchor: icon-page-cycling-dwell)
- Severity bar calculation: (anchor: severity-bar)
- Zone indicators: (anchor: zone-indicators)
- Info format strings: (anchor: info-format-strings)
- Idle glyph: (anchor: idle-glyph)

## Prerequisites

- Step 6 (types), Step 7 (utilities), Step 8 (rules), Step 9 (layout) complete
- `npm run typecheck` passing, `npm test` passing

## Context

`src/solver/index.ts` is the top-level solver function. It orchestrates all
previous steps into the full pipeline and produces a `SolverResult`. Pure functions
only.

## Deliverables

### `src/solver/index.ts`

```ts
import type {
  EntityConfig, DisplayProfile, SolverResult, SolverInput,
  ActiveEntry, GlyphEntry, InfoEntry, ZoneEntry, SeverityBarEntry,
  Defaults, GroupConfig, StateObject, GlyphResolver, LayoutEntry,
} from './types';
import { evaluateEntity, applyFocusMode } from './rules';
import { selectLayout, computeGlyphCoordinates, computeInfoCoordinates } from './layout';
import { resolveColor } from '../utils/color';
import { resolveGlyph } from '../utils/glyph';

export function solve(
  entityConfigs: EntityConfig[],
  states: Record<string, StateObject>,
  tiers: string[],
  defaults: Defaults,
  groups: GroupConfig[],
  profile: DisplayProfile,
  glyphResolver: GlyphResolver,
  currentPage: number,   // 0-based; host layer manages paging state
  now?: Date,
): SolverResult
```

The `currentPage` parameter is 0 when paging is not active. The solver uses it to
slice the glyph output; it does not manage any timer state itself. This preserves
the pure-function contract (see anchor: icon-page-cycling-dwell).

#### Full pipeline

**Stage 1 — Rule evaluation** (step 1, anchor: solver-pipeline):

For each `EntityConfig`, call `evaluateEntity(config, states, tiers, defaults)`.
Collect non-null results into `activeEntries: ActiveEntry[]`.

**Stage 2 — Bucket by tier** (step 2, anchor: solver-pipeline):

Sort `activeEntries` by tier order (`tiers.indexOf(entry.tier)`), then by entity
config order (stable sort — entities declared first appear first within a tier).

**Stage 3 — Focus mode** (step 3, anchor: solver-pipeline):

Call `applyFocusMode(activeEntries, tiers)`.

**Stage 4 — Glyph name → codepoint** (step 4, anchor: solver-pipeline):

For each active entry, call `glyphResolver(entry.glyphName)` to get the codepoint.
If the profile has `font_glyphs` (ESPHome targets) and the resolved MSS name is not
in `profile.font_glyphs`, push a warning:
`"Glyph '${name}' not in profile ${profile.id} font_glyphs — will render blank"`.

**Stage 5 — Count visible icons** (step 5, anchor: solver-pipeline):

Group members collapse to 1 slot. Count = number of non-indicatorOnly active entries,
with all active members of the same group counted as 1 regardless of member count.

Build a group visibility map: for each group, record the first-encountered (highest
priority) active member as the representative entry. Other members are tracked for
placement but not counted.

**Stage 6 — Layout selection** (step 6, anchor: solver-pipeline):

`hasInfo = activeEntries.some(e => e.showInfo)`.
Call `selectLayout(profile, iconCount, hasInfo)`.
If `null`, return `SolverResult` with `error: true`.

**Stage 7 — Page mode** (step 7, anchor: solver-pipeline):

After layout selection, compute `page_count = Math.ceil(totalVisibleIcons / layout.icon.max)`.
If `page_count > 1`, the solver is in page mode. The `currentPage` parameter selects
which slice of placed entries to include in the output:
- Slice placed entries to `[currentPage * layout.icon.max .. (currentPage + 1) * layout.icon.max]`.
- Only the slice for the current page is included in `SolverResult.glyphs`.
- `page_count` is always returned in `SolverResult` so the caller knows whether to
  schedule a dwell callback (see anchor: icon-page-cycling-solver).
- Do NOT emit `error: true` for icon overflow — only emit for no-layout-match.

**Stage 8 — Coordinate computation** (step 8, anchor: solver-pipeline):

Call `computeGlyphCoordinates(profile, layout, gridEntries, now)` where `gridEntries`
is the current page's slice of entries that appear in the icon grid (non-indicatorOnly,
with group overlay/separate placement applied — see group placement below).

Fill in `codepoint` for each `GlyphEntry` using the codepoints resolved in stage 4.

**Stage 9 — Info lines** (step 9, anchor: solver-pipeline):

Collect entries where `entry.showInfo === true`, in tier order.
For each, render: substitute `{value}`, `{value:.0f}`, `{unit}` in `config.value_format`
using `states[config.entity_id]`. Append `config.label` or
`states[config.entity_id]?.attributes?.friendly_name ?? config.id`.

Format string substitution rules:
- `{value}` → `states[entity_id].state`
- `{value:.0f}` → `Math.round(parseFloat(states[entity_id].state)).toString()`
- `{unit}` → `states[entity_id].attributes?.unit_of_measurement ?? ""`

If `config.value_format` is absent, default to `"{value} {unit}"`.

Call `computeInfoCoordinates` for y positions of each info line.

**Stage 10 — Zone indicators** (step 10, anchor: solver-pipeline):

For each zone slot in `profile.zones ?? []`:
- Find the highest-tier active entry where `entry.entityConfig.zone === slot.id`
  AND (`entry.indicatorOnly === true` OR `entry.driveZoneIndicator === true`).
- If found, compute pixel rect from `slot.position` (see zone position section below).
- Resolve color via `resolveColor(entry.color)`.
- Emit `ZoneEntry`.

Zone position pixel computation:
- Expand named shortcuts to `{x, y, w, h}` fractions using `margin_px / screen_px`.
- Convert fractions to pixels: `pixelX = Math.round(frac.x * screen_px[0])` etc.
- `ZoneEntry.shape` = `"filled_rectangle"` for all named shortcuts and explicit rects.

Named shortcut expansion (anchor: zone-indicators):
```
margin_x = profile.margin_px[0] / profile.screen_px[0]
margin_y = profile.margin_px[1] / profile.screen_px[1]
top-edge    → { x: 0,         y: 0,         w: 1.0,     h: margin_y }
bottom-edge → { x: 0,         y: 1-margin_y, w: 1.0,    h: margin_y }
left-edge   → { x: 0,         y: 0,         w: margin_x, h: 1.0     }
right-edge  → { x: 1-margin_x, y: 0,        w: margin_x, h: 1.0     }
top-left    → { x: 0,         y: 0,         w: margin_x, h: margin_y }
top-right   → { x: 1-margin_x, y: 0,        w: margin_x, h: margin_y }
bottom-left → { x: 0,         y: 1-margin_y, w: margin_x, h: margin_y }
bottom-right→ { x: 1-margin_x, y: 1-margin_y, w: margin_x, h: margin_y }
```

**Stage 11 — Severity bar** (step 11, anchor: severity-bar):

If `profile.severity_bar` is not configured, skip.

```
N = tiers.length
activeAfterFocusMode = filtered entries from stage 3
if activeAfterFocusMode is empty:
  if profile.severity_bar.hide_when_idle: return null
  fill_ratio = 0
else:
  tier_index = tiers.indexOf(highest active tier)  // 0 = most urgent
  fill_ratio = (N - tier_index) / N

color = (profile.severity_bar.color === "entity")
  ? resolveColor(activeAfterFocusMode[0].color)   // highest priority entry
  : resolveColor(profile.severity_bar.color)
```

Pixel rect from `edge`, `thickness_px`, `screen_px`, and `margin_px` (anchor: severity-bar):
- `bottom` edge: `x=margin_px[0]+xOffset`, `y=screen_px[1]-margin_px[1]-thickness_px+yOffset`,
  `w=Math.round(fill_ratio * (screen_px[0] - 2*margin_px[0]))`, `h=thickness_px`
- Mirror formula for `top`, `left`, `right`.

Emit `SeverityBarEntry`.

**Stage 12 — Idle glyph** (step 12, anchor: solver-pipeline):

If `activeAfterFocusMode` is empty after stage 3, place the `profile.idle_glyph`
centered in the screen:
```
x = Math.floor((screen_px[0] - largeSizePx) / 2)
y = Math.floor((screen_px[1] - largeSizePx) / 2)
```
where `largeSizePx` is the largest glyph size in `profile.glyph_sizes`. Use the
`glyphResolver` to get its codepoint.

Emit a single `GlyphEntry` for the idle glyph.

#### Group placement

Applied in stage 8. (anchor: group-placement)

`collapse: overlay`:
- When the placement loop first encounters any member of a group:
  - Place all currently-active members at the current grid slot (same x, y).
  - Advance the column counter by 1.
  - Members draw in tier order (later draws overwrite earlier at the same pixel).

`collapse: separate`:
- Place each active member in consecutive grid slots.
- `color_policy` must be `"member"` — each keeps its own color.

For groups with no active members, skip the group slot entirely.

### `src/solver/index.ts` also exports:

```ts
export function solveAll(
  entityConfigs: EntityConfig[],
  states: Record<string, StateObject>,
  tiers: string[],
  defaults: Defaults,
  groups: GroupConfig[],
  profiles: DisplayProfile[],
  glyphResolver: GlyphResolver,
  currentPages: Record<string, number>,  // map of profile.id → currentPage
  now?: Date,
): SolverResult[]
```

Calls `solve` for each profile independently. No shared mutable state between calls.
`currentPages` maps each profile's ID to its current page index (0 when not paging).

## Tests (`tests/solver.test.ts`)

Required test cases:

1. Single active entity → `SolverResult.glyphs` has one entry with correct position
2. No active entities → idle glyph emitted, centered
3. Focus mode: `critical`-only entries remain after focus mode
4. Focus mode: non-critical entries suppressed
5. Group `collapse: overlay`: 2 active members → 1 grid slot used
6. Group `collapse: separate`: 2 active members → 2 grid slots
7. Info line rendered with `value_format: "{value:.0f} {unit}"` and `label: "CO₂"` →
   correct string
8. Info line: `{unit}` absent from attributes → renders as empty string (no crash)
9. Zone indicator: active entity with zone → `ZoneEntry` emitted with correct color
10. Zone indicator: inactive entity → no `ZoneEntry`
11. Zone indicator `bottom-edge` on 128×128 with `margin_px: [4,4]` → correct pixel rect
12. Severity bar: `alert` tier (index 1) with 4 tiers → `fill_ratio = 0.75`
13. Severity bar: idle with `hide_when_idle: true` → `null`
14. Severity bar: idle with `hide_when_idle: false` → `SeverityBarEntry` with `w=0`
15. `glyph not in font_glyphs` → warning in `result.warnings`
16. No matching layout → `result.error === true`
17. `solveAll`: two profiles produce independent results
18. `solveAll`: no shared mutable state — running twice with same input produces
    identical results
19. Icon paging: 5 icons, `layout.icon.max = 4` → `page_count = 2`; `currentPage=0`
    returns icons 0–3; `currentPage=1` returns icon 4
20. Icon paging: icon count exactly equals `layout.icon.max` → `page_count = 1`, no
    paging, `glyphs` contains all icons
21. Icon paging: `error: true` only when no layout matches, not on overflow

## Constraints

- Pure functions; `now` injected for determinism in tests
- No DOM, no `hass`, no `any`
- `solveAll` isolation: each `solve` call is independent
- Info line rendering must not throw on missing `value_format`, missing `unit`
  attribute, or unparseable float state
- `currentPage` is accepted as input but no timer is set inside the solver — timer
  management is exclusively the host layer's responsibility

## Agent instructions

### dev agent

Implement `src/solver/index.ts` as specified. Extract helper functions as needed for
readability; the `solve` function itself should not exceed ~100 lines.

### test agent

Implement `tests/solver.test.ts` with all 21 cases. Run `npm test`. Zero failures.

### user-review agent

Review from a user-debugging perspective:
- When `result.error === true` (no matching layout), is there enough information for
  the user to diagnose why? Should `SolverResult` have an `errorReason: string` field?
- `result.warnings` — are the messages actionable? A user seeing "Glyph X not in
  font_glyphs" should know exactly what to add to their ESPHome YAML.
- Info line default format `"{value} {unit}"` — if `unit` is empty, will this render
  as `"23.5 "` (trailing space)? Is that acceptable?
- `page_count > 1` in the result — is it clear to a card developer that they must
  schedule a dwell callback?

File issues as numbered list.

### code-review agent

Review:
- `solve` function: extract helpers if over 100 lines
- Group placement: no mutation of `entries` array; work on a copy
- Zone position `Math.round` vs `Math.floor`: consistency with coordinate computation
  in layout.ts
- Severity bar pixel rect formula: verify `bottom` edge formula matches anchor: severity-bar exactly
- `solveAll`: no closure over mutable state
- Page slicing: `currentPage` bounds — what happens if `currentPage >= page_count`?
  Should wrap or clamp? Document the chosen behaviour.
