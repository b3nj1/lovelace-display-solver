# Step 8 — Rule Evaluation Engine (`solver/rules.ts`)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` (anchor: step-discipline) through (anchor: signoff-format)
- Implementation Steps index: `esphome_display_solver_plan.md` (anchor: implementation-steps)

## Plan section references

- Rule Syntax Reference: (anchor: rule-syntax)
- Entity Config Schema (rules, thresholds): (anchor: entity-config-schema)
- Defaults block: (anchor: defaults)
- Thresholds sugar: (anchor: thresholds)
- Focus mode: (anchor: tiers)
- Solver pipeline step 1: (anchor: solver-pipeline)
- Glyph "entity" resolution: (anchor: glyph-resolution)

## Prerequisites

- Step 6 (`src/solver/types.ts`) complete
- Step 7 (`src/utils/color.ts`, `src/utils/glyph.ts`) complete
- `npm run typecheck` passing

## Context

`src/solver/rules.ts` contains the rule and threshold evaluation logic — the first
stage of the solver pipeline. It takes a single entity config and current entity
states, and returns an `ActiveEntry | null`.

This is the most test-critical file in the solver: every edge case in rule matching
must have a test. Pure functions only.

## Deliverables

### `src/solver/rules.ts`

```ts
import type { EntityConfig, ActiveEntry, Defaults, StateObject, WhenCondition } from './types';

export function evaluateEntity(
  config: EntityConfig,
  states: Record<string, StateObject>,
  tiers: string[],
  defaults: Defaults,
): ActiveEntry | null
```

Full behaviour (plan pipeline step 1, anchor: solver-pipeline):

1. **Unavailable/missing state handling**: If `config.entity_id` is absent from
   `states`, or `states[config.entity_id].state` is `"unavailable"` or `"unknown"`:
   - Check if any rule has `when.state === "unavailable"` — if so, proceed to rule
     evaluation normally (the explicit rule overrides the default).
   - Otherwise apply `defaults.unavailable_action`. If `"hide"`, return `null`.
   - If `"show"`, construct a minimal `ActiveEntry` with tier = `tiers[tiers.length-1]`
     (least urgent) and empty glyph.

2. **`glyph: "entity"` pre-resolution**: Before rule evaluation, if
   `config.glyph === "entity"`, read
   `states[config.entity_id]?.attributes?.icon as string | undefined`.
   Store the resolved icon name (an `mdi:` string, or `""` if absent). All rules
   in this entity's evaluation will use this resolved name.

3. **Rules evaluation**: Evaluate `config.rules` in order. First match wins.
   - `when.state`: exact string equality against `states[entity_id].state`
   - `when.range: [low, high]`: parse state as float. `null` = unbounded.
     `low <= value <= high`.
   - `when.time_range: ["HH:MM", "HH:MM"]`: compare current wall clock.
     Inject `now?: Date` parameter for testability; default to `new Date()`.
     Handle midnight-crossing windows (e.g. `["22:00", "06:00"]`).
   - `when.also`: all cross-entity conditions must hold. Each checks
     `states[cond.entity]?.state === cond.state`. Missing entity → condition fails.
   - `when` conditions on the same rule are AND. Multiple rules are OR.
   - On `then.action === "hide"`: return `null`.
   - On match: build and return `ActiveEntry`.

4. **Thresholds evaluation**: `config.thresholds` only (mutually exclusive with
   `rules`). Parse state as float. Find the highest `above` threshold not exceeded.
   Below first threshold → return `null`. Assign colors from `defaults.color_scale`
   (or `config.color_scale`) in threshold order; explicit `color` on a step overrides.

5. **ActiveEntry construction**: populate all fields:
   - `entityConfig`: the original config
   - `tier`: from matched rule/threshold
   - `color`: from matched rule, threshold, or `color_scale` auto-assign
   - `glyphName`: resolved from pre-resolution step, or `config.glyph ?? ""`
   - `showInfo`: `then.show_info ?? defaults.show_info` (false when action is hide)
   - `focusMode`: `then.focus_mode ?? false`
   - `indicatorOnly`: `then.action === "indicator"`
   - `driveZoneIndicator`: `then.indicator === true` when `then.action === "show"`

```ts
export function applyFocusMode(
  entries: ActiveEntry[],
  tiers: string[],
): ActiveEntry[]
```

If any entry has `focusMode === true`, return only entries where
`entry.tier === tiers[0]`. Otherwise return `entries` unchanged.
(anchor: tiers, Focus mode section)

## Tests (`tests/rules.test.ts`)

All tests use vitest, run in Node with no DOM. Inject a fixed `now` for time_range
tests.

Required test cases:

1. Boolean rule: `state: "off"` → `null`; `state: "on"` → `ActiveEntry` with correct tier and color
2. Unavailable entity: `states` missing entity → `null` (default `unavailable_action: hide`)
3. Unavailable entity: `defaults.unavailable_action: "show"` → `ActiveEntry` returned
4. Explicit `when: {state: "unavailable"}` rule: overrides default → rule fires
5. `glyph: "entity"`: resolved from `attributes.icon` before rule evaluation
6. `glyph: "entity"`: entity has no icon attribute → `glyphName` is `""`
7. `when.range`: value within `[1000, 2000]` → match; `0` → no match; `2001` → no
   match
8. `when.range` with null bounds: `[null, 100]` → matches everything ≤ 100;
   `[100, null]` → matches everything ≥ 100
9. `when.time_range`: within window → match; outside → no match
10. `when.time_range` midnight-crossing: `["22:00", "06:00"]` at `23:00` → match;
    at `12:00` → no match
11. `when.also`: both conditions hold → match; one fails → no match; entity absent →
    no match
12. Thresholds: below first `above` → `null`
13. Thresholds: at each boundary → correct tier
14. Thresholds: color auto-assigned from `color_scale` in order
15. Thresholds: explicit `color` on a step overrides auto-assign
16. `applyFocusMode`: no focus_mode entries → all entries returned unchanged
17. `applyFocusMode`: one focus_mode entry → only `tiers[0]` entries returned
18. `applyFocusMode`: multiple focus_mode entries → still only `tiers[0]` entries

## Constraints

- No DOM access, no `hass` references
- No `any` types
- `now` parameter defaults to `new Date()` when not provided — tests always inject it
- `evaluateEntity` must not mutate `config` or `states`
- `when.time_range` midnight-crossing: the window `["22:00", "06:00"]` means the
  range that crosses midnight. Implementation must handle this correctly.

## Agent instructions

### dev agent

Implement `src/solver/rules.ts` as specified. Do not implement layout selection or
the full pipeline — those are later steps.

### test agent

Implement `tests/rules.test.ts` with all 18 cases listed. Run `npm test`. Zero
failures required.

### user-review agent

Review the rule matching logic from a **user config-authoring perspective**:
- If a user writes a `range` condition and accidentally uses integers, will the float
  parse handle it correctly?
- If `when.also` references an entity that does not exist yet in their HA instance,
  is the failure mode silent (condition fails = rule doesn't fire) or does it throw?
  Which is more user-friendly? (Plan: missing entity → condition fails, which is
  silent. Is this the right default? Should there be a warning?)
- Is `indicatorOnly` vs `driveZoneIndicator` naming clear from the perspective of
  someone reading the `ActiveEntry` type?

File issues as numbered list.

### code-review agent

Review for:
- `evaluateEntity` length: if over 70 lines, extract `evaluateRules` and
  `evaluateThresholds` helper functions
- `time_range` midnight-crossing: is the string-comparison approach correct or
  does it need numeric comparison?
- No mutation of inputs
- `applyFocusMode` correctly uses `tiers[0]` not a hardcoded string
- `color_scale` auto-assign: is the index tracked correctly across threshold steps,
  especially when some steps have explicit colors that skip the auto-assign?
