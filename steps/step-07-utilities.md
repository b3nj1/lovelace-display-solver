# Step 7 — Utilities: Color Lookup and Glyph Resolution (`utils/`)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` lines 1080–1125
- Implementation Steps index: `esphome_display_solver_plan.md` lines 1127–1145

## Plan section references

- Glyph Resolution section: lines 555–620
- Glyph reference forms table: lines 561–567
- Font alignment between ESPHome and canvas: lines 568–580
- ESPHome glyph validation: lines 581–620
- `idle_glyph` field: lines 145–148 and 621–626
- Color utilities usage: plan lines 755–760 (severity bar color), 823–828 (zone color)

## Prerequisites

Step 6 (`src/solver/types.ts`) must be complete and `npm run typecheck` must pass.

## Context

`src/utils/color.ts` provides a lookup from color names (used in rules/thresholds)
to `{r, g, b}` triples consumed by the adapters.

`src/utils/glyph.ts` provides:
1. A lookup from Material Symbols Sharp glyph names to their unicode codepoints
2. An MDI → MSS mapping table (the primary concern — users write `mdi:` names
   because that is HA's native icon system)
3. The `GlyphResolver` function used throughout the solver

Both files must be pure: no DOM access, no `hass` references.

## Deliverables

### `src/utils/color.ts`

```ts
export interface RGB { r: number; g: number; b: number; }

const COLOR_TABLE: Record<string, RGB> = {
  red:    { r: 255, g: 0,   b: 0   },
  orange: { r: 255, g: 165, b: 0   },
  yellow: { r: 255, g: 255, b: 0   },
  green:  { r: 0,   g: 255, b: 0   },
  blue:   { r: 0,   g: 0,   b: 255 },
  purple: { r: 128, g: 0,   b: 128 },
  white:  { r: 255, g: 255, b: 255 },
  cyan:   { r: 0,   g: 255, b: 255 },
  magenta:{ r: 255, g: 0,   b: 255 },
  black:  { r: 0,   g: 0,   b: 0   },
  // add any additional named colors needed by the plan examples
};

export function resolveColor(name: string): RGB
```

`resolveColor` returns the RGB triple for the given name. If the name is not in the
table, returns `{ r: 255, g: 255, b: 255 }` (white) and logs a console warning once
per unknown name (use a `Set` to deduplicate warnings).

All color names used in plan examples (plan lines 365–452) must be in the table:
`red`, `orange`, `yellow`, `green`, `blue`, `purple`, `white`.

### `src/utils/glyph.ts`

```ts
export type GlyphName = string;   // re-export or import from types.ts

/** Maps MDI icon names to their nearest Material Symbols Sharp equivalent. */
export const MDI_TO_MSS: Record<string, string> = { ... };

/** Maps Material Symbols Sharp names to their unicode codepoint strings. */
export const MSS_CODEPOINTS: Record<string, string> = { ... };

/**
 * Resolve a glyph name to a codepoint string.
 * - MSS name → look up in MSS_CODEPOINTS
 * - "mdi:xxx" → look up MDI_TO_MSS; if found, look up codepoint; if not, return MDI_FALLBACK marker
 * - "entity" → caller must have already resolved to a concrete name before calling this
 * - Raw unicode → return as-is
 */
export function resolveGlyph(name: GlyphName): string

export const MDI_FALLBACK = '�';  // replacement character signals "load MDI webfont"
```

#### MDI → MSS mapping table

The table must cover at minimum all MDI names used in the plan's YAML examples
(plan lines 377, 439) plus a reasonable set of common HA icons:

| MDI name | MSS equivalent |
|---|---|
| `mdi:molecule-co2` | `co2` |
| `mdi:pool` | `pool` |
| `mdi:thermometer` | `thermostat` |
| `mdi:water` | `water_drop` |
| `mdi:car-electric` | `electric_car` |
| `mdi:fan` | `mode_fan_off` |
| `mdi:lightbulb` | `lightbulb` |
| `mdi:lock` | `lock` |
| `mdi:door` | `door_open` |
| `mdi:garage` | `garage` |
| `mdi:security` | `security` |
| `mdi:air-filter` | `air` |
| `mdi:factory` | `factory` |
| `mdi:grill` | `outdoor_grill` |
| `mdi:thermometer-auto` | `device_thermostat` |
| `mdi:arrow-up` | `arrow_upward` |
| `mdi:arrow-down` | `arrow_downward` |
| `mdi:check-circle` | `check_circle` |
| `mdi:chef-hat` | `kitchen` |

Add more entries that are clearly unambiguous mappings. Do not guess at mappings
where the semantic is unclear — leave them unmapped (triggering the MDI fallback
path).

#### MSS codepoints table

The `MSS_CODEPOINTS` table maps MSS glyph names to their unicode codepoints.
Include at minimum all names listed in plan lines 601–619 (`font_glyphs` example)
plus all names referenced anywhere in the plan YAML examples.

Obtain the correct codepoints from the Material Symbols metadata. Do not guess
codepoints — use only values you can verify from the official Material Symbols
character map. Document the source URL in a comment at the top of the table.

If the correct codepoints cannot be verified for every entry without access to the
official source, implement the table structure correctly but use placeholder values
and add a prominent `// TODO: verify codepoints from official Material Symbols metadata`
comment. The structure is what matters for this step; correct values can be filled
in during Step 11 (ESPHome adapter) when the font_glyphs list is validated.

#### `resolveGlyph` logic

1. If `name` is empty string, return `MDI_FALLBACK`.
2. If `name.startsWith('mdi:')`: look up in `MDI_TO_MSS`. If found, look up in
   `MSS_CODEPOINTS`. If not found in either table, return `MDI_FALLBACK`.
3. If `name === 'entity'`: this is a programmer error — `entity` must be resolved
   to a concrete name by the caller before calling `resolveGlyph`. Throw `Error`.
4. If `name` is a single character with codepoint > 127: treat as raw unicode,
   return as-is.
5. Otherwise: look up in `MSS_CODEPOINTS`. If found, return codepoint. If not
   found, return `MDI_FALLBACK` and log a warning.

## Tests (`tests/color.test.ts` and `tests/glyph.test.ts`)

### `tests/color.test.ts`

- All plan example colors resolve to non-zero RGB values
- Unknown color returns white and does not throw
- Duplicate warning logging: calling `resolveColor('unknown')` twice logs the
  warning once (verify with a spy or by inspecting the warning-set size)

### `tests/glyph.test.ts`

- MSS name `"garage"` → returns a codepoint (non-empty string, not `MDI_FALLBACK`)
- MDI name `"mdi:molecule-co2"` → maps to MSS `"co2"` → returns codepoint
- MDI name with no MSS mapping → returns `MDI_FALLBACK`
- `"entity"` → throws `Error`
- Single non-ASCII char → returned as-is
- Empty string → returns `MDI_FALLBACK`
- All names in the `font_glyphs` example (plan lines 601–619) are present in
  `MSS_CODEPOINTS` (even if placeholder values)

## Constraints

- No DOM access, no `hass` references
- Pure functions — no global mutable state except the dedup `Set` in `resolveColor`
  (acceptable since it only grows, never resets)
- No `any` types
- `MDI_FALLBACK` is a named export so adapters can detect the "load MDI webfont" case

## Agent instructions

### dev agent

Implement both utility files. For `MSS_CODEPOINTS`, populate the entries for all
names from the plan's `font_glyphs` example and all names used in YAML examples.
If you cannot verify codepoints without external access, use placeholder `""`
values and add a TODO comment as specified above.

### test agent

Implement `tests/color.test.ts` and `tests/glyph.test.ts`. Run `npm test`. All
cases must pass.

### user-review agent

Review:
- `resolveColor` warning message: is it clear which color name is unknown?
- `resolveGlyph` warning message: does it tell the user what to do when a glyph
  name is missing (e.g. "add 'xxx' to your ESPHome firmware's font_glyphs")?
- `MDI_TO_MSS` table completeness: are the most common HA icons covered? A user
  who uses HA's built-in entity icons (garage, lock, thermometer, lightbulb) should
  not see fallback characters on their display without any warning.

File issues as numbered list.

### code-review agent

Review:
- `resolveGlyph` control flow: are all 5 cases handled with no fall-through?
- The warning-dedup `Set` in `resolveColor`: is it scoped correctly (module-level
  is fine; function-level would reset on each call)?
- No circular imports between `types.ts`, `color.ts`, and `glyph.ts`
- `MDI_FALLBACK` exported correctly so adapters can import it
