# Step 4 — AppDaemon Integration (Reactive HA Wiring)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` (anchor: step-discipline) through (anchor: signoff-format)
- Implementation Steps index: `esphome_display_solver_plan.md` (anchor: implementation-steps)

## Plan section references

- Phase 4 goals: (anchor: phase4)
- What moves out of Node-RED: (anchor: moves-out-of-nodered)
- ESPHome service contract (stable): (anchor: phase1-contract-table)
- Icon page cycling dwell timer: (anchor: icon-page-cycling-dwell)
- Icon page cycling solver pipeline: (anchor: icon-page-cycling-solver)
- Multi-display principle: (anchor: multi-display)

## Prerequisites

Step 3 (`python_solver/solver.py` and `solve_all`) must be complete and all its
tests must pass before starting this step.

## Context

AppDaemon is an HA add-on that lets you write Python apps that react to entity state
changes. This step wires the Python solver (Steps 2–3) to HA: subscribing to state
changes, running the solver on change, and dispatching ESPHome service calls.

The AppDaemon app is the **intermediate delivery vehicle** — it replaces Node-RED
while the Lovelace card (Steps 5–14) is being built. It is also retained as a
headless/fallback mode for users who prefer Python over YAML card config.

## Repository layout additions

```
appdaemon/
├── apps/
│   └── display_solver/
│       ├── __init__.py
│       └── app.py          # AppDaemon app class
│       └── config.py       # config loading and validation
└── README.md               # AppDaemon-specific install and config docs
```

AppDaemon app configuration lives in the user's `apps.yaml`; this step also provides
an example `apps.yaml` stanza in `appdaemon/README.md`.

## Deliverables

### `appdaemon/apps/display_solver/config.py`

```python
def load_config(path: str) -> tuple[list[EntityConfig], list[DisplayProfile], list[str], Defaults, list[GroupConfig]]:
    """
    Load and validate the solver YAML config file.
    Returns (entity_configs, display_profiles, tiers, defaults, groups).
    Raises ValueError with a clear message on schema errors.
    """
```

Config file format: a YAML file whose top-level keys map directly to the schema
defined in Steps 2–3. Example structure (mirrors the Lovelace card YAML schema
from anchor: entity-config-schema):

```yaml
tiers: [critical, alert, status, ambient]
defaults:
  unavailable_action: hide
  show_info: true
  color_scale: [orange, red, purple]
entities:
  - id: garage_door
    entity_id: binary_sensor.garage_door
    ...
display_profiles:
  - id: living_room_oled
    type: esphome
    service: esphome.living_room_iaq_set_display_glyphs
    ...
```

Validation must catch: missing required fields, unknown profile types, invalid tier
references in rules, thresholds not strictly increasing. Raise `ValueError` per
violation (collect all errors before raising).

### `appdaemon/apps/display_solver/app.py`

AppDaemon `hass.Hass` subclass:

```python
class DisplaySolverApp(hass.Hass):
    def initialize(self):
        ...

    def _on_state_change(self, entity, attribute, old, new, kwargs):
        ...

    def _dispatch(self, results: list[SolverResult]):
        ...
```

`initialize`:
1. Load config via `load_config` using `self.args["config_path"]`.
2. Subscribe to state changes for all `entity_id` values in `entity_configs` via
   `self.listen_state`.
3. Run a full solve immediately on startup so displays are up-to-date.
4. Debounce: accumulate change events; schedule a solve 500ms after the last change.
   Use `self.run_in` for the debounce timer; cancel a pending timer before scheduling
   a new one.
5. Initialise per-profile `PageState` tracking (anchor: icon-page-cycling-solver).

`_on_state_change`:
- Collect the changed entity; trigger the debounced solve.
- Cancel any pending dwell timer for all profiles; reset `current_page = 0` for
  all profiles (content change takes priority over mid-cycle position).

`_dispatch`:
- For each `SolverResult` where `profile.type == "esphome"` and `error == False`:
  call `self.call_service(profile.service, **payload)` where `payload` is the
  packed ESPHome payload from the ESPHome adapter (anchor: phase1-contract-table).
- Log `result.warnings` at WARNING level.
- Log `result.error == True` at ERROR level with `profile_id`.
- After dispatch, if `result.page_count > 1`, schedule a dwell callback for
  `profile.page_dwell_s` seconds using `self.run_in`. On expiry, increment
  `current_page` (wrap at `page_count`) and re-run the solver for that profile only
  (no rule re-evaluation — same state snapshot).

### ESPHome payload packing in AppDaemon context

Because the TypeScript ESPHome adapter (Step 11) does not exist yet, implement a
minimal `pack_esphome_payload(result: SolverResult) -> dict` function in
`appdaemon/apps/display_solver/app.py` or a sibling `esphome.py` file. This function
packs a `SolverResult` into the flat arrays required by the stable service contract
(anchor: phase1-contract-table). This is a temporary implementation; it will be superseded by
the TypeScript adapter in Step 11.

Payload arrays:
- `x`, `y`, `r`, `g`, `b`, `glyph` — from `result.glyphs`
- `glyph_font` — hardcoded to the font index for the selected layout size (derive
  from profile.glyph_sizes order: index 0 = largest)
- `info_glyph`, `info_glyph_y`, `info_glyph_x`, `info_glyph_r`, `info_glyph_g`,
  `info_glyph_b` — info row glyph entries
- `info_text`, `info_text_y`, `info_text_x`, `info_text_r`, `info_text_g`,
  `info_text_b` — info row text entries
- `info_scroll` — `True` if `len(result.info) > layout.info_max`, else `False`
- `draw_shape`, `draw_shape_x`, `draw_shape_y`, `draw_shape_d2`, `draw_shape_d3`,
  `draw_shape_r`, `draw_shape_g`, `draw_shape_b` — from `result.zones` and
  `result.severity_bar` (packed as `filled_rectangle`)
- `error` — `result.error`

All arrays must have equal length. Pad with zeros/empty strings as needed.

### `appdaemon/README.md`

Document:
- Prerequisites (AppDaemon add-on installed)
- Where to place the app files
- Example `apps.yaml` stanza
- Example solver config YAML with one entity and one ESPHome profile
- How to view logs in the AppDaemon UI

## Tests

AppDaemon's `hass.Hass` base class cannot be instantiated without a running HA
instance. Test the logic that can be unit-tested in isolation:

### `tests/test_appdaemon_config.py`

- Valid config loads without error
- Missing `tiers` field → `ValueError`
- Invalid tier reference in a rule → `ValueError`
- Thresholds not strictly increasing → `ValueError`
- Unknown profile `type` → `ValueError`

### `tests/test_esphome_payload.py`

- Pack a `SolverResult` with 2 glyphs, 1 info line, 1 zone, 1 severity bar →
  verify all arrays have equal length and correct values
- Idle result (empty glyphs) → arrays are all-empty but still equal length (0)
- `info_scroll: True` when info count exceeds `info_max`

## Constraints

- AppDaemon 4.x API (`hass.Hass` base class, `self.listen_state`, `self.run_in`,
  `self.call_service`)
- No polling; only `listen_state` subscriptions
- Debounce timer: 500ms, cancel-and-reschedule on rapid state bursts
- Dwell timer: per-profile, cancel on state change, schedule after dispatch when
  `page_count > 1`
- `pack_esphome_payload` is temporary; it should be marked with a `# TODO: replace
  with TypeScript adapter (Step 11)` comment

## Agent instructions

### dev agent

Implement all files listed. Focus on correct debounce logic, payload packing, and
per-profile dwell timer management (anchor: icon-page-cycling-dwell). The `_dispatch`
method should be robust: a failure on one profile must not prevent dispatch to other
profiles (catch exceptions per profile, log, continue).

### test agent

Implement `tests/test_appdaemon_config.py` and `tests/test_esphome_payload.py`.
Run `pytest tests/ -v`. All listed test cases must pass.

The `app.py` AppDaemon-specific code (`initialize`, `_on_state_change`) cannot be
unit tested without a running HA instance — this is expected and acceptable. Document
this limitation in a comment at the top of the test file.

### user-review agent

Review `appdaemon/README.md` for:
- Is the install path clear for a user coming from Node-RED?
- Is the example `apps.yaml` stanza complete and copy-pasteable?
- Are error messages from `load_config` actionable without reading source code?
- Does the README explain what to expect when a display is not reachable?

File issues as numbered list.

### code-review agent

Review `app.py` for:
- Debounce: is the cancel-and-reschedule pattern correct for AppDaemon's `run_in`
  API? Verify that the timer handle is stored and cancelled before rescheduling.
- Dwell timer: is it correctly cancelled on state change before scheduling a new
  one? Is the per-profile isolation correct?
- `_dispatch`: is the per-profile exception isolation correct?
- `pack_esphome_payload`: array length equality — is it guaranteed even when some
  result fields are empty?
- Any mutable class-level state that could cause cross-call contamination
