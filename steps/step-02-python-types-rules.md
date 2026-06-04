# Step 2 — Python Solver: Data Types and Rule Evaluation Engine

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` lines 1080–1125
- Implementation Steps index: `esphome_display_solver_plan.md` lines 1127–1145

## Plan section references

- Phase 2 goals: lines 999–1006
- Entity Config Schema (rules, tiers, thresholds, defaults): lines 280–495
- Rule Syntax Reference: lines 522–550
- Solver pipeline steps 1–3: lines 649–663
- Glyph resolution (entity-inherit form only): lines 555–568
- Defaults block: lines 454–470
- Thresholds sugar: lines 472–495
- Focus mode: lines 328–332
- Groups (data model only, not placement): lines 499–519

## Context

This step creates the Python solver package that will be used in AppDaemon (Step 4).
The solver is **pure functions only** — no HA client calls, no I/O, no side effects.
All inputs arrive as plain Python dicts/dataclasses; all outputs are plain dicts.

The Python solver mirrors the TypeScript solver that will be built in Steps 6–10.
Both solvers implement the same specification; the Python version comes first because
it is easier to iterate on and test without a browser or HA instance.

## Repository layout for this step

```
python_solver/
├── __init__.py
├── types.py        # dataclasses for all input/output types
└── rules.py        # rule and threshold evaluation; returns ActiveEntry | None
tests/
├── __init__.py
├── test_types.py   # instantiation + validation tests
└── test_rules.py   # rule evaluation tests
```

`python_solver/` lives at the repo root alongside `src/` (TypeScript).

## Deliverables

### `python_solver/types.py`

Define Python dataclasses (or TypedDicts where appropriate) for:

**Inputs:**

- `StateObject` — mirrors `hass.states[id]`: fields `state: str`,
  `attributes: dict[str, Any]`
- `WhenCondition` — fields: `state: str | None`, `range: tuple[float|None, float|None] | None`,
  `above: float | None`, `time_range: tuple[str, str] | None`,
  `also: list[CrossEntityCondition] | None`
- `CrossEntityCondition` — fields: `entity: str`, `state: str`
- `ThenAction` — fields: `action: Literal["show","hide","indicator"]`,
  `tier: str | None`, `color: str | None`, `show_info: bool | None`,
  `indicator: bool`, `focus_mode: bool`
- `Rule` — fields: `when: WhenCondition`, `then: ThenAction`
- `ThresholdStep` — fields: `above: float`, `tier: str`, `color: str | None`
- `EntityConfig` — fields: `id: str`, `entity_id: str`, `glyph: str | None`,
  `label: str | None`, `value_format: str | None`, `zone: str | None`,
  `group: str | None`, `rules: list[Rule] | None`, `thresholds: list[ThresholdStep] | None`,
  `color_scale: list[str] | None`
- `Defaults` — fields: `unavailable_action: Literal["hide","show"]`,
  `show_info: bool`, `color_scale: list[str]`

**Outputs:**

- `ActiveEntry` — fields: `entity_config: EntityConfig`, `tier: str`,
  `color: str`, `glyph_name: str`, `show_info: bool`, `focus_mode: bool`,
  `indicator_only: bool`, `drive_zone_indicator: bool`

Include a `validate_entity_config(config: EntityConfig) -> list[str]` function that
returns a list of validation error strings (empty = valid). Checks:
- `rules` and `thresholds` are mutually exclusive
- All `tier` references are non-empty strings
- `thresholds` `above` values are strictly increasing

### `python_solver/rules.py`

Implement:

```python
def evaluate_entity(
    config: EntityConfig,
    states: dict[str, StateObject],
    tiers: list[str],
    defaults: Defaults,
    now: datetime | None = None,   # injected for time_range tests
) -> ActiveEntry | None
```

Behaviour (matches plan pipeline step 1, lines 649–663):

1. If `entity_id` is absent from `states`, or its state is `"unavailable"` or
   `"unknown"`: apply `defaults.unavailable_action`. If `hide`, return `None`.
   An explicit `when: {state: "unavailable"}` rule overrides this — evaluate rules
   first when such a rule exists.
2. Resolve `glyph: "entity"` by reading `states[entity_id].attributes.get("icon", "")`
   before rule evaluation. Store resolved name; fall back to `""` if absent.
3. For `rules`: evaluate in order; first match wins. On `action: hide` return `None`.
4. For `thresholds`: parse state as float. Find the highest `above` value not
   exceeded. Below the first threshold → return `None`. Assign `color` from
   `defaults.color_scale` (or entity-level `color_scale`) in threshold order if
   not explicitly set on the step.
5. `when.also`: all cross-entity conditions must hold (AND). Each checks
   `states[entity].state == state`. Missing entity → condition fails (treat as not
   matching).
6. `when.time_range`: compare `now.strftime("%H:%M")` against the window. Midnight-
   crossing ranges (e.g. `["22:00", "06:00"]`) must be handled correctly.
7. Return an `ActiveEntry` with all resolved fields populated.

Also implement:

```python
def apply_focus_mode(entries: list[ActiveEntry], tiers: list[str]) -> list[ActiveEntry]:
```

If any entry has `focus_mode: True`, return only entries whose tier is the first
element of `tiers` (i.e. `tiers[0]`, the most urgent tier). Otherwise return `entries`
unchanged. (Plan line 328–332.)

## Tests (`tests/test_rules.py`)

Tests must run with `pytest` and no HA or browser. Cover:

- Boolean entity: `state: "on"` → show; `state: "off"` → hide
- Unavailable entity: returns `None` with default `unavailable_action: hide`
- Unavailable with explicit override rule: returns `ActiveEntry`
- Threshold: below first step → `None`; at each step boundary → correct tier and
  color; colors auto-assigned from `color_scale`
- Threshold strictly increasing validation: error if not strictly increasing
- `when.also`: both conditions met → match; one condition fails → no match
- `when.time_range`: within window → match; outside window → no match; midnight-
  crossing window
- `glyph: "entity"`: resolved from attributes before rule evaluation
- `apply_focus_mode`: entries suppressed when focus_mode active; not suppressed when
  no focus_mode entry
- `rules` + `thresholds` mutual exclusion: `validate_entity_config` returns error

## Constraints

- Python 3.11+
- No external dependencies beyond the standard library (`dataclasses`, `datetime`,
  `typing`)
- Do not import anything from `src/` (TypeScript files) — the Python solver is
  standalone
- All functions must be pure: no global mutable state, no I/O
- `now` parameter in `evaluate_entity` defaults to `None`; when `None` use
  `datetime.now()`. Tests must inject a fixed `now` for determinism.

## Agent instructions

### dev agent

Implement `python_solver/types.py` and `python_solver/rules.py` exactly as specified.
Do not implement layout selection, the full pipeline, zone indicators, or severity
bar — those are Step 3.

### test agent

Implement `tests/test_types.py` and `tests/test_rules.py` as specified. Run
`python -m pytest tests/ -v` and confirm all tests pass. Every behaviour listed
in the Tests section must have at least one test case.

### user-review agent

Review `python_solver/types.py` field names and `python_solver/rules.py` function
signatures for:

- Field names match the YAML schema the user writes in their Lovelace card config
  (plan lines 360–452) — any mismatch causes silent config errors
- Error messages from `validate_entity_config` are actionable (state what is wrong
  and where)
- `ActiveEntry` fields are sufficient for Step 3 (pipeline) to produce correct output
  without needing to re-read the EntityConfig

File issues as a numbered list.

### code-review agent

Review both files for:

- No mutable default arguments in dataclasses or function signatures
- `evaluate_entity` cyclomatic complexity — should be readable; extract helpers if
  the function exceeds ~60 lines
- `time_range` midnight-crossing logic correctness
- `apply_focus_mode` correctly uses `tiers[0]` (the most urgent tier) not a
  hardcoded string
- Type annotations complete and correct throughout
