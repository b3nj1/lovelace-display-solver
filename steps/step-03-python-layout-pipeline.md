# Step 3 — Python Solver: Layout Selection + Full Pipeline + Multi-display

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` lines 1080–1125
- Implementation Steps index: `esphome_display_solver_plan.md` lines 1127–1145

## Plan section references

- Phase 2 goals: lines 999–1006
- Phase 3 goals: lines 1007–1013
- Display Profile Schema: lines 128–220
- Viewing distance → layout density: lines 96–127
- Solver pipeline steps 4–13: lines 662–692
- Group placement: lines 693–703
- Severity bar: lines 704–806
- Zone indicators: lines 807–933
- Solver Architecture Rules (pure functions): lines 629–648

## Prerequisites

Step 2 (`python_solver/types.py` and `python_solver/rules.py`) must be complete and
all its tests must pass before starting this step.

## Context

This step completes the Python solver by adding:
- `python_solver/layout.py` — viewing_distance expansion + layout selection + coordinate computation
- `python_solver/solver.py` — the full pipeline integrating rules, layout, groups, info, zones, severity bar
- Multi-display: `solve_all` accepts a list of display profiles and calls `solve` for each independently

The solver remains pure functions: no I/O, no HA client.

## Repository layout additions

```
python_solver/
├── layout.py       # viewing_distance expansion; layout filtering; coordinate computation
└── solver.py       # full pipeline: solve() + solve_all()
tests/
├── test_layout.py
└── test_solver.py
```

## Deliverables

### `python_solver/types.py` additions

Add these types (extend the file from Step 2):

- `GlyphSize` — fields: `px: int`, `fits_cols: int`
- `LayoutEntry` — fields: `icon_min: int`, `icon_max: int`, `size: str`,
  `cols: int`, `info_min: int`, `info_max: int`
- `ZoneSlot` — fields: `id: str`, `position: str | dict`  (str = named shortcut,
  dict = explicit `{x, y, w, h}`)
- `SeverityBarConfig` — fields: `edge: str`, `thickness_px: int`, `color: str`,
  `hide_when_idle: bool`
- `DisplayProfile` — fields: `id: str`, `type: str`, `service: str | None`,
  `screen_px: tuple[int,int]`, `margin_px: tuple[int,int]`, `burn_in_drift: bool`,
  `viewing_distance: str`, `idle_glyph: str`, `glyph_sizes: dict[str, GlyphSize]`,
  `layouts: list[LayoutEntry]`, `zones: list[ZoneSlot]`,
  `severity_bar: SeverityBarConfig | None`, `font_glyphs: list[str]`
- `GlyphEntry` — fields: `glyph_name: str`, `x: int`, `y: int`, `size_px: int`,
  `r: int`, `g: int`, `b: int`
- `InfoEntry` — fields: `text: str`, `x: int`, `y: int`, `r: int`, `g: int`, `b: int`
- `ZoneEntry` — fields: `zone_id: str`, `x: int`, `y: int`, `w: int`, `h: int`,
  `r: int`, `g: int`, `b: int`, `shape: str`
- `SeverityBarEntry` — fields: `x: int`, `y: int`, `w: int`, `h: int`,
  `r: int`, `g: int`, `b: int`
- `SolverResult` — fields: `profile_id: str`, `glyphs: list[GlyphEntry]`,
  `info: list[InfoEntry]`, `zones: list[ZoneEntry]`,
  `severity_bar: SeverityBarEntry | None`, `layout: LayoutEntry`,
  `error: bool`, `warnings: list[str]`

### `python_solver/layout.py`

```python
VIEWING_DISTANCE_PRESETS: dict[str, dict]  # maps preset name → layout_constraints dict

def expand_viewing_distance(profile: DisplayProfile) -> dict:
    """Return the merged layout_constraints dict (preset + overrides)."""

def select_layout(
    profile: DisplayProfile,
    icon_count: int,
    has_info: bool,
) -> LayoutEntry | None:
    """
    Filter layouts by viewing_distance constraints, then by icon.min/max,
    then skip layouts where info.min > 0 when has_info is False.
    Return first match (user-defined order). Return None if no layout matches.
    """

def compute_coordinates(
    profile: DisplayProfile,
    layout: LayoutEntry,
    entries: list[ActiveEntry],
    burn_in_now: datetime | None = None,
) -> list[GlyphEntry]:
    """
    Compute pixel x,y for each placed entry. Apply burn-in drift if enabled.
    burn_in_now defaults to datetime.now(); inject for tests.
    """
```

Viewing distance preset expansion (plan lines 107–127):

| Preset | Expands to |
|---|---|
| `far` | `max_size: medium`, `max_info_rows: 0`, `prefer_fewer_icons: true` |
| `near` | `max_size: tiny`, `max_info_rows: 4`, `prefer_fewer_icons: false` |
| `close` | `max_size: tiny`, `max_info_rows: 6`, `prefer_fewer_icons: false` |

Layout filtering (plan lines 662–672):
1. Expand `viewing_distance` to `layout_constraints`
2. For `far`/`max_info_rows: 0`: filter OUT layouts where `info_min > 0`
3. Filter by `icon_count >= icon.min` AND `icon_count <= icon.max`
4. Skip layouts where `info_min > 0` when `has_info` is False
5. Return first remaining layout

Burn-in drift offsets (plan lines 672–678):
```
x_offset = floor(now.hour / 23 * margin_px[0])
y_offset = floor(now.minute / 59 * margin_px[1])
```
Content coordinates are shifted by `(x_offset, y_offset)`.

Grid coordinate computation:
- Icons are placed left-to-right in rows of `layout.cols` columns
- Each cell is `layout_size_px` wide and tall (from `profile.glyph_sizes[layout.size].px`)
- Content area starts at `(margin_px[0] + x_offset, margin_px[1] + y_offset)`

### `python_solver/solver.py`

```python
def solve(
    entity_configs: list[EntityConfig],
    states: dict[str, StateObject],
    tiers: list[str],
    defaults: Defaults,
    profile: DisplayProfile,
    glyph_resolver: Callable[[str], str],  # name → codepoint string
    groups: list[GroupConfig],
    now: datetime | None = None,
) -> SolverResult:
```

Pipeline (plan lines 649–692):

1. Evaluate each entity config via `evaluate_entity` (from `rules.py`).
2. Collect `ActiveEntry` results; bucket by tier order.
3. Apply `apply_focus_mode` (from `rules.py`).
4. Resolve glyph names to codepoints via `glyph_resolver`. Log warning if a name is
   absent from `profile.font_glyphs` (ESPHome targets only); add to `warnings`.
5. Count visible icons (groups: all members that share a `group` id count as 1 slot
   regardless of member count).
6. Select layout via `select_layout`. If `None`, return `SolverResult(error=True, ...)`.
7. Compute glyph coordinates via `compute_coordinates`.
8. Collect info lines: all active entries where `show_info` is True; render each as
   `f"{value_format} {label}"` using `states[entity_id]`; sort by tier order then
   entity config order.
9. Resolve zone indicators: for each `ZoneSlot` in the profile, find the highest-tier
   active entry referencing that zone; compute pixel rect from `ZoneSlot.position`.
10. Compute severity bar (plan lines 680–692): `fill_ratio = (N - tier_index) / N`.
    Compute pixel rect. Emit `None` when idle and `hide_when_idle: True`.
11. If active set is empty, resolve idle glyph and emit it centered.
12. Return `SolverResult`.

```python
def solve_all(
    entity_configs: list[EntityConfig],
    states: dict[str, StateObject],
    tiers: list[str],
    defaults: Defaults,
    profiles: list[DisplayProfile],
    glyph_resolver: Callable[[str], str],
    groups: list[GroupConfig],
    now: datetime | None = None,
) -> list[SolverResult]:
    """Run solve() independently for each profile. Returns results in profile order."""
```

Also add `GroupConfig` to `types.py`:
- `id: str`, `collapse: Literal["overlay","separate"]`,
  `color_policy: Literal["most_urgent","first_active","member"]`

### Group placement rules (plan lines 693–703)

When the placement loop encounters a group member for the first time:
- `collapse: overlay`: place all active members at the same (x,y); advance the column
  counter by 1 for the whole group. Members draw in insertion order (later overwrites earlier).
- `collapse: separate`: place members in consecutive columns; advance column counter
  by 1 per member. `color_policy: member` required.

## Tests (`tests/test_layout.py` and `tests/test_solver.py`)

### `test_layout.py`

- `expand_viewing_distance`: verify `far` expands to `max_info_rows: 0`
- `select_layout`: `far` profile with 0 info-having layouts available → no match when
  icon count is 0; correct layout selected for various icon counts
- `select_layout`: layout with `info_min > 0` skipped when `has_info=False`
- `compute_coordinates`: 4-icon 2-column layout produces correct x,y pairs
- Burn-in drift: at hour=23, minute=59, offset equals `margin_px`; at hour=0,
  minute=0, offset is 0

### `test_solver.py`

- Single entity active: correct glyph, tier, color in result
- Multi-display: two profiles with different `viewing_distance` and `screen_px`
  produce different layouts from the same active set
- Focus mode: active `focus_mode` entry suppresses non-critical entries across profiles
- Groups overlay: two members active → 1 grid slot used
- Groups separate: two members active → 2 grid slots
- Info lines: sorted by tier order; exceed `info_max` does not truncate (ESPHome scrolls)
- Zone indicator: highest-tier active member's color used; inactive zone → no entry
- Severity bar: `fill_ratio` correct for each tier level; `None` when idle and
  `hide_when_idle: True`
- Idle glyph: emitted when active set is empty
- No layout match: `SolverResult.error == True`

## Constraints

- Python 3.11+; no external dependencies beyond stdlib
- All functions pure; `now` injected for determinism
- `solve_all` calls `solve` in a loop; no shared state between calls
- `glyph_resolver` is a plain function `(name: str) -> str`; tests use a dict-lookup stub

## Agent instructions

### dev agent

Implement the additions to `python_solver/types.py`, new files `python_solver/layout.py`
and `python_solver/solver.py`. Do not implement the ESPHome or canvas adapters — those
are Steps 11 and 12 (TypeScript).

### test agent

Implement `tests/test_layout.py` and `tests/test_solver.py`. Run `pytest tests/ -v`.
All listed test cases must pass.

### user-review agent

Review:
- `SolverResult.warnings` content: are warning messages actionable for a user
  debugging a misconfigured glyph name?
- `SolverResult.error: True` — is the reason for the error observable (should it
  include an `error_reason: str` field)?
- Field names in `DisplayProfile` and `GlyphEntry` — do they match the YAML schema
  the user writes (plan lines 150–220)?

File issues as numbered list.

### code-review agent

Review:
- `solve()` function length — if over 80 lines, extract helpers
- Zone indicator pixel rect computation for named shortcuts vs. explicit fractions:
  is the conversion consistent and correct?
- `solve_all` isolation: confirm no mutable state leaks between profile runs
- `compute_coordinates` grid math: off-by-one errors in row/column wraparound
