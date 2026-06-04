# Step 6 — TypeScript Core Interfaces (`solver/types.ts`)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` (anchor: step-discipline) through (anchor: signoff-format)
- Implementation Steps index: `esphome_display_solver_plan.md` (anchor: implementation-steps)

## Plan section references

- Entity Config Schema: (anchor: entity-config-schema)
- Defaults block: (anchor: defaults)
- Thresholds sugar: (anchor: thresholds)
- Groups: (anchor: groups)
- Rule Syntax Reference: (anchor: rule-syntax)
- Glyph Resolution forms: (anchor: glyph-resolution)
- Display Profile Schema: (anchor: display-profile-schema)
- Solver Architecture (inputs/outputs): (anchor: solver-architecture)
- Severity bar schema: (anchor: severity-bar)
- Zone indicator schema: (anchor: zone-indicators)
- Solver pipeline output types: (anchor: solver-architecture)

## Prerequisites

Step 5 (TypeScript scaffold) must be complete and `npm run build` must succeed.

## Context

This step defines every TypeScript interface used by the solver, adapters, and card.
All other TypeScript steps import from `solver/types.ts`; getting the types right now
prevents cascading changes later. This step has **no runtime logic** — only type
definitions and a config validator.

The rule: no `any` types anywhere in this file (CLAUDE.md constraint).

## Deliverables

### `src/solver/types.ts`

Define the following interfaces/types. Use `interface` for objects that may be
extended; use `type` aliases for unions and literals.

#### Config input types

```ts
export type GlyphName = string;  // MSS name, "mdi:xxx", "entity", or raw unicode

export interface WhenCondition {
  state?: string;
  range?: [number | null, number | null];
  above?: number;
  time_range?: [string, string];  // "HH:MM"
  also?: CrossEntityCondition[];
}

export interface CrossEntityCondition {
  entity: string;
  state: string;
}

export interface ThenAction {
  action: 'show' | 'hide' | 'indicator';
  tier?: string;
  color?: string;
  show_info?: boolean;
  indicator?: boolean;     // drive zone even when action is 'show'
  focus_mode?: boolean;
}

export interface Rule {
  when: WhenCondition;
  then: ThenAction;
}

export interface ThresholdStep {
  above: number;
  tier: string;
  color?: string;
}

export interface EntityConfig {
  id: string;
  entity_id: string;
  glyph?: GlyphName;
  label?: string;
  value_format?: string;
  zone?: string;
  group?: string;
  rules?: Rule[];
  thresholds?: ThresholdStep[];
  color_scale?: string[];
}

export interface Defaults {
  unavailable_action: 'hide' | 'show';
  show_info: boolean;
  color_scale: string[];
}

export interface GroupConfig {
  id: string;
  collapse: 'overlay' | 'separate';
  color_policy: 'most_urgent' | 'first_active' | 'member';
}
```

#### Display profile types

```ts
export interface GlyphSize {
  px: number;
  fits_cols: number;
}

export interface LayoutEntry {
  icon: { min: number; max: number; size: string; cols: number };
  info: { min: number; max: number };
}

export interface ZoneSlot {
  id: string;
  position: ZonePosition;
}

export type ZonePosition =
  | 'top-edge' | 'bottom-edge' | 'left-edge' | 'right-edge'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | { x: number; y: number; w: number; h: number };

export interface SeverityBarConfig {
  edge: 'top' | 'bottom' | 'left' | 'right';
  thickness_px: number;
  color: string;          // 'entity' or a color name
  hide_when_idle: boolean;
}

export interface DisplayProfile {
  id: string;
  type: 'esphome' | 'canvas' | 'cast' | 'png_file';
  service?: string;        // required when type === 'esphome'
  screen_px: [number, number];
  margin_px: [number, number];
  burn_in_drift: boolean;
  viewing_distance: 'far' | 'near' | 'close';
  idle_glyph: GlyphName;
  page_dwell_s?: number;   // seconds per icon page; defaults to 5.0; host layer uses this
  glyph_sizes: Record<string, GlyphSize>;
  layouts: LayoutEntry[];
  zones?: ZoneSlot[];
  severity_bar?: SeverityBarConfig;
  font_glyphs?: string[];  // ESPHome targets only
}
```

#### Solver intermediate types

```ts
export interface StateObject {
  state: string;
  attributes: Record<string, unknown>;
}

export interface ActiveEntry {
  entityConfig: EntityConfig;
  tier: string;
  color: string;
  glyphName: GlyphName;
  showInfo: boolean;
  focusMode: boolean;
  indicatorOnly: boolean;    // true when action === 'indicator'
  driveZoneIndicator: boolean; // true when indicator: true on an action: 'show' rule
}

export type GlyphResolver = (name: GlyphName) => string;  // returns codepoint string
```

#### Solver output types

```ts
export interface GlyphEntry {
  codepoint: string;
  x: number;
  y: number;
  sizePx: number;
  r: number;
  g: number;
  b: number;
}

export interface InfoEntry {
  text: string;
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

export interface ZoneEntry {
  zoneId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  g: number;
  b: number;
  shape: 'filled_rectangle' | 'circle' | 'filled_circle';
}

export interface SeverityBarEntry {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  g: number;
  b: number;
}

export interface SolverResult {
  profileId: string;
  glyphs: GlyphEntry[];      // current page's glyph slice only
  info: InfoEntry[];
  zones: ZoneEntry[];
  severityBar: SeverityBarEntry | null;
  layout: LayoutEntry;
  error: boolean;
  warnings: string[];
  pageCount: number;         // 1 = no overflow; >1 = caller must schedule dwell
}
```

#### Top-level card config type

```ts
export interface CardConfig {
  tiers: string[];
  defaults: Defaults;
  entities: EntityConfig[];
  display_profiles: DisplayProfile[];
  groups?: GroupConfig[];
}
```

### Config validation (`src/solver/types.ts` — exported function)

```ts
export function validateCardConfig(config: unknown): string[]
```

Returns a list of human-readable error strings. Empty array = valid. Checks:

- `tiers` is a non-empty array of strings
- `entities` is a non-empty array; each has `id` and `entity_id`
- Each entity has `rules` OR `thresholds`, not both
- Each `rule.then.tier` (and `threshold.tier`) references a name in `tiers`
- `thresholds[*].above` values are strictly increasing per entity
- `display_profiles` is a non-empty array; each has `id`, `type`, `screen_px`
- ESPHome profiles have `service`
- `groups[*].id` values are unique
- `entities[*].group` references only declared group IDs

## Tests (`tests/types.test.ts`)

- `validateCardConfig` with a complete valid config → empty array
- Missing `tiers` → error string mentioning "tiers"
- Entity with both `rules` and `thresholds` → error
- Rule `tier` not in declared tiers → error
- Thresholds not strictly increasing → error
- ESPHome profile without `service` → error
- Entity referencing undeclared group → error
- TypeScript: all interfaces are correctly typed (compile-time check via
  `npm run typecheck`)

## Constraints

- No `any` types
- No runtime logic other than `validateCardConfig`
- All interfaces exported from `src/solver/types.ts`
- `CardConfig` must align exactly with the YAML schema in the plan (anchor: entity-config-schema
  shows the user-facing YAML; the TypeScript interface must mirror it)

## Agent instructions

### dev agent

Implement `src/solver/types.ts` exactly as specified. Run `npm run typecheck` to
confirm zero type errors.

### test agent

Implement `tests/types.test.ts`. Run `npm test`. All validation cases must pass.

### user-review agent

Review the TypeScript interface field names against the YAML schema in anchor: entity-config-schema:
- Every YAML key the user writes must have a corresponding TypeScript field with the
  **same name** (camelCase vs snake_case mismatches cause silent config failures)
- `value_format` in YAML → should be `value_format` in TypeScript (not `valueFormat`)
  to avoid needing a transformation layer
- Are the union types for `action` (`'show' | 'hide' | 'indicator'`) complete?
- Does `ZonePosition` cover all position shortcuts listed in anchor: zone-indicators?

File issues as numbered list.

### code-review agent

Review `validateCardConfig` for:
- Collect-all-errors pattern (do not stop at first error)
- No `any` casts internally
- Return type accurately reflects `string[]` (not `string[] | null`)
- Group ID uniqueness check is O(n log n) or better, not O(n²)
