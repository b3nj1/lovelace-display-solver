# User Review — Step 06: TypeScript Core Interfaces (`solver/types.ts`)

Reviewed `src/solver/types.ts` against `esphome_display_solver_plan.md` anchors:
`entity-config-schema`, `rule-syntax`, `zone-indicators`, `defaults`, `thresholds`,
`groups`, `display-profile-schema`, `severity-bar`.

---

## Findings — Round 1 (original) and Resolution Status

1. **`SeverityBarConfig.hide_when_idle` should be optional.**
   Interface: `SeverityBarConfig`, field: `hide_when_idle: boolean`.
   Fix: change `hide_when_idle: boolean` to `hide_when_idle?: boolean`.
   **STATUS: RESOLVED** — field is now `hide_when_idle?: boolean` (line 89).

2. **`Defaults` fields should all be optional.**
   Interface: `Defaults`, fields: `unavailable_action`, `show_info`, `color_scale` — all marked required (no `?`).
   Fix: change all three fields to optional. Also mark `defaults` optional in `CardConfig`.
   **STATUS: RESOLVED** — all three fields are now `?: ...` (lines 52-54).

3. **`SolverResult.severityBar` field name does not match the plan's documented key.**
   Fix: rename `severityBar` to `severity_bar` in `SolverResult`.
   **STATUS: RESOLVED** — field is now `severity_bar: SeverityBarEntry | null` (line 177).

4. **`SolverResult.pageCount` field name does not match the plan's documented key.**
   Fix: rename `pageCount` to `page_count` in `SolverResult`.
   **STATUS: RESOLVED** — field is now `page_count: number` (line 181).

5. **`SolverResult.profileId` field name does not match the plan's documented schema.**
   Fix: rename `profileId` to `profile_id` or remove it.
   **STATUS: RESOLVED** — field is now `profile_id: string` (line 173).

6. **`CardConfig.defaults` is required but should be optional.**
   Fix: change to `defaults?: Defaults`.
   **STATUS: RESOLVED** — field is now `defaults?: Defaults` (line 189).

---

## Fresh Check (Round 2)

A full re-read of `src/solver/types.ts` against `esphome_display_solver_plan.md` found no new issues:

- All snake_case YAML keys (`entity_id`, `value_format`, `color_scale`, `unavailable_action`,
  `time_range`, `page_dwell_s`, `burn_in_drift`, `margin_px`, `screen_px`, `glyph_sizes`,
  `idle_glyph`, `font_glyphs`, `hide_when_idle`, `thickness_px`) remain correctly snake_case.
- `ZonePosition` covers all 8 named shortcuts and the `{x, y, w, h}` object form.
- `action`, `collapse`, `color_policy`, `type`, `edge`, `viewing_distance` unions are
  complete per the plan.
- `SolverResult.error` and `SolverResult.warnings` fields are present and justified by
  the pipeline spec (`error: true` when no layout matches; warnings for missing glyphs).
- `GroupConfig.collapse` and `GroupConfig.color_policy` are correctly required (all plan
  examples provide them and the plan gives no defaults for either).
- No new fields were introduced that diverge from the plan.

---

SIGN-OFF: approved
