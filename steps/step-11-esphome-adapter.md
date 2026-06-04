# Step 11 — ESPHome Output Adapter (`adapters/esphome.ts`)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` lines 1080–1125
- Implementation Steps index: `esphome_display_solver_plan.md` lines 1127–1145

## Plan section references

- Stable ESPHome service contract: lines 982–994
- ESPHome Service Contract section: lines 968–998
- Severity bar adapter encoding: lines 779–806
- Glyph resolution / font_glyphs validation: lines 581–620
- Output adapters table: lines 222–232

## Prerequisites

- Step 10 (solver pipeline) complete, `npm test` passing
- `docs/esphome-service-contract.md` from Step 1 (reference only)

## Context

`src/adapters/esphome.ts` takes a `SolverResult` and packs it into the flat arrays
required by the stable ESPHome service contract. It does not call `hass.callService`
— that is the card's responsibility (Step 13). This keeps the adapter pure and unit-
testable without a browser or HA instance.

## Deliverables

### `src/adapters/esphome.ts`

```ts
import type { SolverResult, DisplayProfile } from '../solver/types';

export interface ESPhomePayload {
  // glyph grid
  x: number[];
  y: number[];
  r: number[];
  g: number[];
  b: number[];
  glyph: string[];
  glyph_font: number;         // single int: font index for selected layout size
  // info row glyphs
  info_glyph: string[];
  info_glyph_y: number[];
  info_glyph_x: number[];
  info_glyph_r: number[];
  info_glyph_g: number[];
  info_glyph_b: number[];
  // info row text
  info_text: string[];
  info_text_y: number[];
  info_text_x: number[];
  info_text_r: number[];
  info_text_g: number[];
  info_text_b: number[];
  info_scroll: boolean;
  // shapes (zones + severity bar)
  draw_shape: string[];       // shape type: 'filled_rectangle' etc.
  draw_shape_x: number[];
  draw_shape_y: number[];
  draw_shape_d2: number[];    // width for rectangle; radius for circle
  draw_shape_d3: number[];    // height for rectangle; unused for circle
  draw_shape_r: number[];
  draw_shape_g: number[];
  draw_shape_b: number[];
  // status
  error: boolean;
}

export function packESPhomePayload(
  result: SolverResult,
  profile: DisplayProfile,
): ESPhomePayload
```

Packing rules:

**Glyph arrays** (`x`, `y`, `r`, `g`, `b`, `glyph`):
- One entry per `result.glyphs` entry
- `glyph` = `entry.codepoint`
- `glyph_font` = font index derived from the selected layout's `icon.size`:
  the index of `layout.icon.size` in the list of `profile.glyph_sizes` keys
  sorted largest-to-smallest (largest = index 0, as in the `font:` declaration order
  in typical ESPHome configs)

**Info arrays** (`info_glyph_*`, `info_text_*`):
- One entry per `result.info` entry
- `info_glyph`: for each info row, a glyph codepoint if the entity's `glyph` is not
  empty, else `""`. If non-empty, the glyph is placed at the left of the info row.
- All six arrays must have equal length.
- `info_scroll`: `result.info.length > result.layout.info.max`

**Shape arrays** (`draw_shape_*`):
- First, pack all `result.zones` entries:
  - `draw_shape`: `entry.shape` (e.g. `"filled_rectangle"`)
  - `draw_shape_d2`: `entry.w` (width)
  - `draw_shape_d3`: `entry.h` (height)
- Then, if `result.severityBar !== null`, append it:
  - `draw_shape`: `"filled_rectangle"`
  - `draw_shape_d2`: `entry.w`
  - `draw_shape_d3`: `entry.h`
- All eight shape arrays must have equal length.

**Array length invariant**: All arrays within each group (glyph group, info group,
shape group) must have equal length. The function must enforce this — if any group's
arrays have unequal length, that is a programmer error; throw `Error`.

### Glyph font index derivation

The font index maps a size name to an integer that ESPHome uses to select the right
`font:` entry in the display lambda. The convention:
- Sort `profile.glyph_sizes` keys by `px` descending (largest = index 0).
- `glyph_font` = index of `layout.icon.size` in that sorted list.

Example: `glyph_sizes: {large: {px:116}, medium: {px:58}, small: {px:38}, tiny: {px:30}}`
→ sorted: `[large, medium, small, tiny]` → font indices `0, 1, 2, 3`.
If the layout uses `size: medium`, `glyph_font = 1`.

## Tests (`tests/esphome-adapter.test.ts`)

Required test cases:

1. 2 glyphs, 1 info line, 1 zone → all arrays populated; all glyph arrays length 2;
   all info arrays length 1; all shape arrays length 1
2. Idle result (no glyphs, no info, no zones, no severity bar) → all arrays are empty
   (`[]`), `glyph_font = 0`, `error: false`
3. Severity bar present → shape arrays length = zones + 1
4. `info_scroll: true` when `info.length > layout.info.max`
5. `info_scroll: false` when `info.length <= layout.info.max`
6. `glyph_font` correct for a profile with 4 sizes; layout uses size `"medium"` →
   `glyph_font = 1`
7. Array length invariant: manually crafted malformed `SolverResult` with mismatched
   arrays → function throws `Error` (this tests the invariant check)
8. `error: true` in SolverResult → `ESPhomePayload.error === true`

## Constraints

- Pure function — no `hass`, no DOM
- All parallel arrays must be equal length within their group
- No `any` types
- `packESPhomePayload` does not call any external service

## Agent instructions

### dev agent

Implement `src/adapters/esphome.ts` as specified.

### test agent

Implement `tests/esphome-adapter.test.ts` with all 8 cases. Run `npm test`. Zero
failures.

### user-review agent

Review `ESPhomePayload` field names:
- Do the field names match what the user's ESPHome YAML expects? (They must match the
  service parameter names in `docs/esphome-service-contract.md` from Step 1 exactly.)
- If a user adds a new glyph size to their firmware but forgets to update
  `profile.glyph_sizes`, will the wrong `glyph_font` index be sent silently? Should
  there be a warning?

File issues as numbered list.

### code-review agent

Review:
- Array length invariant enforcement: is it applied after each group is constructed,
  or only at the end? It should fail fast (at construction) for debuggability.
- `glyph_font` derivation: is the sort stable for sizes with identical `px` values?
  (Should not happen in practice but worth noting.)
- No mutation of `result` or `profile` inputs
- `info_glyph` for entries where `glyph` is empty — is `""` the correct sentinel for
  ESPHome (does it display nothing, or does it display the replacement character)?
