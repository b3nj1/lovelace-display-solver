# ESPHome Display Solver — Architecture Plan

## Project Name

**`lovelace-display-solver`**

Naming rationale:
- `lovelace-` prefix is the HACS convention for frontend plugins; HACS strips it when
  resolving the JS filename → built artifact is `display-solver.js`
- `display-solver` describes what it does (solves layout for displays) without
  locking it to ESPHome, a resolution, or a device type
- Avoids overloaded terms like "dashboard" (HA uses that for Lovelace itself) or
  "panel" (HA reserved term)
- Short enough to type; descriptive enough to find in HACS search

**Custom element tag:** `display-solver-card`
**HA service calls from:** `custom:display-solver-card`

---

## Problem Statement

The current system drives a 128×128 SSD1351 OLED with a dynamic icon/alert dashboard
sourced from Home Assistant entity states. The intelligence is split across:

- **Node-RED** — polls HA global state, runs a priority/layout solver, packs glyph
  arrays, calls an ESPHome service
- **ESPHome** — receives pre-solved render instructions via `set_display_glyphs`,
  stores them in `std::vector` globals, draws them each display cycle

This works but is fragile: the solver logic is hard to configure, the Node-RED↔ESPHome
service contract is large and opaque, and adding a new tracked entity requires editing
both sides. It also targets only one display at a fixed resolution.

---

## Why the Solver Cannot Live in ESPHome

ESPHome is a code generator that emits a flat C++ program. Every `id:` is a compile-time
global singleton. At runtime there is no:

| Missing capability | Impact on solver |
|---|---|
| Runtime-keyed map/dict | Cannot iterate "all active alerts" — must hardcode each entity check |
| Entity reflection/registry | No way to ask what sensors exist; each is an explicit global |
| Dynamic dispatch / callbacks | Cannot store per-entity handler; logic is a hand-written if-chain |
| Priority queue or sort | No abstraction; manual index juggling in vectors |
| Runtime config layer | YAML is consumed entirely at compile time; no data-driven rules |

The consequence: reproducing the Node-RED solver in an ESPHome lambda would be an
unmaintainable hand-enumerated sequence of `if (id(garage).state != "closed") { ... }`
blocks. Every new entity requires editing the lambda.

**The boundary is correct: solver off-device, renderer on-device.** The problem is
the solver's implementation and configuration, not its location.

---

## Why the Solver Doesn't Fit Existing Projects

| Project | Model | Gap |
|---|---|---|
| **EspHoMaTriXv2** | Queue/playlist — HA pushes pre-rendered frames | Display side is dumb by design; adding a solver forks it into a different product |
| **LVGL** | Retained-mode widget toolkit — manipulate named widgets | Widget tree is fixed at compile time; a solver would live *above* LVGL, not inside it |
| **esphome-modular-lvgl-buttons** | Compile-time `!include` tile composition | `!include` is a preprocessor operation; dynamic layout is categorically out of scope |

No existing ESPHome display project implements a runtime layout solver. The gap is real
and unoccupied.

---

## Solver Host: Options and Recommendation

The solver needs to run somewhere with access to live HA entity state, a data structure
runtime, and a way to dispatch to multiple display targets.

| Option | Install friction | Config UX | Multi-display | Testable | Notes |
|---|---|---|---|---|---|
| **Lovelace custom card** ✓ | HACS one-click | Visual editor built into card | Yes — one card instance per profile, or card drives all | Solver core is pure JS, unit-testable without HA | Recommended end state |
| Custom HA integration | HACS + restart | Config flow wizard (form UI) | Yes | Yes (Python) | Good intermediate; no visual preview |
| AppDaemon | Add-on + YAML text edit | Text editor only | Yes | Yes (Python) | Right for Phase 2 port; not end-user-friendly |
| Node-RED (current) | Already installed | Flow graph — visual but opaque | Painful | No | Replace this |

**Recommendation:** AppDaemon for Phase 2 (testable Python port), Lovelace custom card
for Phase 5 (end state with visual config editor and pixel-accurate preview).

The card collapses solver + live preview + config editor into one artifact. It receives
entity state updates reactively via the `hass` property HA injects on every state
change — no polling. The canvas it renders in the browser is pixel-accurate to what
the physical display shows, providing a direct authoring feedback loop.

---

## Multi-Display and Tailored Output

### Core Principle

Entity rules are **display-agnostic**. A CO2 reading above 2000 ppm is priority 0,
red, regardless of what display shows it. The *display profile* then translates that
abstract active set into concrete pixels appropriate for that display's resolution,
viewing distance, and output format. Each display profile is independent — adding a
second display requires only a new profile stanza, no solver code changes.

### Viewing Distance → Layout Density

`viewing_distance` is a shorthand preset that expands into a `layout_constraints` block.
The constraints are the mechanical filter applied during layout selection; the preset
just fills them in automatically for common cases. Users can override individual
constraints without changing the preset.

| Preset | Typical scenario | Expands to |
|---|---|---|
| `far` | TV across room, OLED on a shelf | `max_size: medium`, `max_info_rows: 0`, `prefer_fewer_icons: true` |
| `near` | Wall tablet at arm's length | `max_size: tiny`, `max_info_rows: 4`, `prefer_fewer_icons: false` |
| `close` | Dashboard card on desk | `max_size: tiny`, `max_info_rows: 6`, `prefer_fewer_icons: false` |

`layout_constraints` can be written explicitly to express combinations no preset
covers (e.g. a large display mounted far away):

```yaml
viewing_distance: far
layout_constraints:
  max_info_rows: 2    # override: allow some info even at far distance
```

The config editor shows the expanded constraints as inline comments when a preset is
selected, so the effect is always visible without reading documentation.

### Display Profile Schema

Layout `info` has two fields:
- `min` — minimum info rows needed to select this layout. Layouts with `min > 0` are
  skipped when no info is active, allowing the solver to prefer denser icon-only
  layouts when there is nothing to say.
- `max` — how many info rows the layout allocates on screen. If total active info
  lines exceed `max`, ESPHome scrolls through them on each display cycle.

`margin_px` reserves a pixel border on all sides used for burn-in drift (see below).
Content is offset by a time-derived amount within this margin. Defaults to `[0,0]`.

`burn_in_drift` enables the time-based pixel drift for OLED displays. When `true`,
x-offset cycles across `margin_px[0]` pixels over 23 hours and y-offset cycles across
`margin_px[1]` pixels over 59 minutes. This is a no-op for non-OLED targets.

`idle_glyph` is the glyph shown when all active entries are suppressed or the active
set is empty. Uses the same name resolution as entity glyphs. Defaults to
`"check_circle"` (Material Symbols: all-clear). The Glyph Resolution section
covers the `idle_glyph` field in full; see there for details.

```yaml
display_profiles:
  - id: living_room_oled
    type: esphome
    service: esphome.living_room_iaq_set_display_glyphs
    screen_px: [128, 128]
    margin_px: [4, 4]       # burn-in drift zone; content never reaches edge pixels
    burn_in_drift: true
    viewing_distance: far   # expands to: max_size: medium, max_info_rows: 0, prefer_fewer_icons: true
    idle_glyph: "check_circle"
    glyph_sizes:            # named sizes compiled into firmware; solver maps size: name → px
      large:  {px: 116, fits_cols: 1}
      medium: {px:  58, fits_cols: 2}
      small:  {px:  38, fits_cols: 3}
      tiny:   {px:  30, fits_cols: 4}
    layouts:
      - icon: {min: 1, max: 1,  size: large,  cols: 1}
        info: {min: 0, max: 0}
      - icon: {min: 1, max: 4,  size: medium, cols: 2}
        info: {min: 0, max: 0}
      - icon: {min: 1, max: 4,  size: tiny,   cols: 4}
        info: {min: 2, max: 2}
      - icon: {min: 1, max: 1,  size: medium, cols: 2}
        info: {min: 1, max: 2}

  - id: kitchen_matrix
    type: esphome
    service: esphome.kitchen_matrix_set_display_glyphs
    screen_px: [256, 64]
    margin_px: [0, 0]
    burn_in_drift: false
    viewing_distance: near
    idle_glyph: "check_circle"
    glyph_sizes:
      small: {px: 38, fits_cols: 3}
      tiny:  {px: 30, fits_cols: 4}
    layouts:
      - icon: {min: 1, max: 8, size: small, cols: 8}
        info: {min: 0, max: 1}

  - id: dashboard_card
    type: canvas
    screen_px: [400, 400]
    margin_px: [0, 0]
    burn_in_drift: false
    viewing_distance: close
    idle_glyph: "check_circle"
    glyph_sizes:
      tiny: {px: 30, fits_cols: 4}
    layouts:
      - icon: {min: 1, max: 16, size: tiny, cols: 4}
        info: {min: 0, max: 3}

  - id: living_room_tv
    type: cast            # PNG → camera entity → HA Cast
    screen_px: [1920, 1080]
    margin_px: [0, 0]
    burn_in_drift: false
    viewing_distance: far
    idle_glyph: "check_circle"
    severity_bar:
      edge: bottom
      thickness_px: 8
      color: entity         # color of highest-priority active entry
      hide_when_idle: true  # omit shape entirely when active set is empty
    glyph_sizes:
      large: {px: 116, fits_cols: 1}
    layouts:
      - icon: {min: 1, max: 8, size: large, cols: 8}
        info: {min: 0, max: 1}
```

### Output Adapters

| Type | Output | Infrastructure needed |
|---|---|---|
| `esphome` | `set_display_glyphs` service call | ESPHome device on HA; existing contract |
| `canvas` | `<canvas>` draw calls in the Lovelace card | None — in-browser |
| `cast` | PNG → HA static file → camera entity | Pillow renderer (Phase 6); `continuously_casting_dashboards` HACS integration for persistence |
| `png_file` | Write PNG to `www/` folder | Phase 6; useful for notifications and snapshots |

HA Cast renders any Lovelace view including custom cards, so a `canvas` profile
automatically becomes Chromecast-castable with zero extra work.

---

## Full Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  Home Assistant                                                  │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  lovelace-display-solver  (Lovelace custom card)           │  │
│  │                                                            │  │
│  │  entities_config (in card YAML)   ← shared across targets  │  │
│  │    entity_id, glyph, rules, priority, color, info format   │  │
│  │                                                            │  │
│  │  display_profiles (in card YAML)  ← one per target         │  │
│  │    type, screen_px, viewing_distance, layout table         │  │
│  │                                                            │  │
│  │  SOLVER CORE  (pure JS, no DOM, unit-testable)             │  │
│  │    1. hass property update → fresh entity states           │  │
│  │    2. Evaluate rules → build prioritised active set        │  │
│  │    3. For each display profile independently:              │  │
│  │       a. Filter layouts by viewing_distance                │  │
│  │       b. Match layout by icon count                        │  │
│  │       c. Compute coordinates for screen_px                 │  │
│  │    4. Dispatch to output adapter per profile               │  │
│  │                                                            │  │
│  │  ┌──────────┐  ┌──────────────┐  ┌──────────────────────┐ │  │
│  │  │ canvas   │  │ esphome      │  │ cast / png           │ │  │
│  │  │ adapter  │  │ adapter      │  │ adapter (Phase 6)    │ │  │
│  │  │ (in card)│  │ callService  │  │ Pillow → www/        │ │  │
│  │  └──────────┘  └──────────────┘  └──────────────────────┘ │  │
│  └─────────┬──────────────┬───────────────────────┬──────────┘  │
└────────────┼──────────────┼───────────────────────┼─────────────┘
             │              │                       │
             ▼              ▼                       ▼
    ┌──────────────┐ ┌─────────────────┐ ┌──────────────────────┐
    │ Dashboard    │ │ ESPHome device  │ │ Chromecast /         │
    │ preview      │ │ SSD1351 128×128 │ │ Nest Hub             │
    │ (any screen, │ │ or any other    │ │ (via HA Cast or      │
    │  any size)   │ │ resolution      │ │  camera entity PNG)  │
    └──────────────┘ └─────────────────┘ └──────────────────────┘
```

---

## Entity Config Schema (shared, display-agnostic)

### Rule evaluation semantics

Rules are evaluated in order; **first match wins** and no further rules are checked.
`action: hide` terminates evaluation for that entity — the entity does not appear.

If the entity is absent from `hass.states` or its state is `"unavailable"` or
`"unknown"`, `defaults.unavailable_action` applies (default: `hide`). An explicit
`when: {state: "unavailable"}` rule overrides the default for that entity.

See the Rule Syntax Reference section for the full `when`/`then` field list, and the
Thresholds section for the numeric shorthand.

### Info format strings

Each entity has two optional fields that control what appears in info rows:

- `label` — human-readable name for the entity. Fallback: `attributes.friendly_name`.
  Override when the HA entity ID or friendly name is ugly.
- `value_format` — template string for the value portion. Supported substitutions:
  - `{value}` — raw state string
  - `{value:.0f}` — state parsed as float, formatted with 0 decimal places
  - `{unit}` — `attributes.unit_of_measurement`

The rendered info row is `"{value_format} {label}"`. Example: `value_format: "{value:.0f}
{unit}"` + `label: "CO₂"` → `"1423 ppm CO₂"`.

Info strings are built by the solver; ESPHome receives pre-rendered strings.
`show_info: true` on a rule (or via `defaults`) controls whether the info row is
included when that rule fires.

### Tiers (replaces numeric priority)

Urgency is expressed with named tiers rather than integers. The tier list is declared
once at the top level; order defines precedence (first = most urgent).

```yaml
tiers:
  - critical   # shown first; triggers focus_mode suppression when active
  - alert
  - status     # normal background icons
  - ambient    # never suppresses others; always lowest
```

Rules reference tiers by name: `tier: critical`. Custom tiers can be inserted anywhere
in the list; all existing rules that reference other tier names continue to work
unchanged.

**Focus mode** — a rule carrying `focus_mode: true` causes the solver to suppress all
tiers below `critical` for that run. Multiple active `focus_mode` rules are additive;
the suppression is always "critical only". This replaces the former numeric
`priority_ceiling` field.

Example: security system armed away → hide all `status` and `ambient` glyphs.

### Info lines

Multiple entities can have `show_info: true` on a rule simultaneously. The solver
collects all active info entries into an ordered array (sorted by tier, then by entity
order). ESPHome scrolls through them when the count exceeds the layout's `info.max`.

`show_info` is a per-rule flag — the same entity can expose info at `alert` tier but
suppress it at `status` tier. The top-level `defaults` block sets the baseline (see
Defaults section below).

```yaml
# ── top-level defaults ────────────────────────────────────────────────────────
defaults:
  unavailable_action: hide      # applied to every entity; no per-entity rule needed
  show_info: true               # show info row at every non-hide tier unless overridden
  color_scale: [orange, red, purple]   # used by thresholds blocks in order

# ── named tiers (most → least urgent) ─────────────────────────────────────────
tiers:
  - critical
  - alert
  - status
  - ambient

# ── entity configs ─────────────────────────────────────────────────────────────
entities:

  # Boolean alert — straightforward show/hide
  - id: garage_door
    entity_id: binary_sensor.garage_door
    glyph: "garage"
    rules:
      - when: {state: "off"}
        then: {action: hide}
      - when: {state: "on"}
        then:
          action: show
          tier: critical
          color: red

  # Numeric escalation — thresholds block; colors from defaults.color_scale
  - id: co2
    entity_id: sensor.living_room_co2
    glyph: "mdi:molecule-co2"
    label: "CO₂"
    value_format: "{value:.0f} {unit}"   # rendered: "1423 ppm CO₂"
    thresholds:
      - above: 1000
        tier: alert
      - above: 2000
        tier: critical
      - above: 4500
        tier: critical   # color advances to purple per color_scale

  # Entity-inherit glyph + focus_mode (replaces priority_ceiling)
  - id: security
    entity_id: alarm_control_panel.house
    glyph: "entity"
    rules:
      - when: {state: "disarmed"}
        then: {action: hide}
      - when: {state: "armed_away"}
        then:
          action: show
          tier: critical
          color: red
          focus_mode: true    # suppresses all tiers below critical while active

  # Cross-entity condition via when.also
  - id: lock_alert
    entity_id: lock.front_door
    glyph: "lock"
    rules:
      - when:
          state: "unlocked"
          also:
            - entity: binary_sensor.front_door
              state: "on"          # door also open → escalate
        then:
          tier: critical
          color: red
          show_info: true
      - when: {state: "unlocked"}
        then:
          tier: alert
          color: orange
      - when: {state: "locked"}
        then: {action: hide}

  # Zone indicator only — never appears in icon grid
  - id: lights_downstairs
    entity_id: light.downstairs
    zone: downstairs
    rules:
      - when: {state: "on"}
        then:
          action: indicator
          tier: ambient
          color: yellow

  # Zone indicator AND grid glyph at fault threshold
  - id: pool_filter
    entity_id: switch.pool_filter
    glyph: "mdi:pool"
    zone: pool_area
    rules:
      - when: {state: "on"}
        then:
          action: indicator   # ambient: zone layer only
          tier: ambient
          color: blue
      - when: {state: "unavailable"}
        then:
          action: show        # fault: grid glyph + zone
          indicator: true
          tier: critical
          color: red
```
---

## Defaults

A top-level `defaults` block sets baseline behaviour for all entities. Any field can
be overridden per entity or per rule.

```yaml
defaults:
  unavailable_action: hide      # hide every entity that is unavailable; no per-entity rule needed
  show_info: true               # include info row at every non-hide tier unless rule says false
  color_scale: [orange, red, purple]   # assigned to thresholds in order; override per entity
```

`unavailable_action: hide` eliminates the most commonly forgotten per-entity rule. If
an entity needs special unavailable handling (e.g. show a fault icon), it can override
with an explicit `when: {state: "unavailable"}` rule.

---

## Thresholds (numeric shorthand for rules)

`thresholds` is sugar for numeric entities that follow a hide-then-escalate pattern.
It replaces a sequence of `when: {range: ...}` rules with a compact ascending list.

```yaml
thresholds:
  - above: 1000      # hide implied for values below the first entry
    tier: alert
  - above: 2000
    tier: critical
  - above: 4500
    tier: critical   # color advances to next in color_scale automatically
```

Rules:
- Values below the first `above` threshold → `action: hide` (implicit).
- Each step only declares what changes from the previous step; unspecified fields
  inherit from the step above.
- Colors are assigned from `defaults.color_scale` (or entity-level `color_scale`) in
  order of threshold steps. An explicit `color:` on a step overrides the auto-assign.
- The solver validates at load time that all `above` values are strictly increasing.
- `thresholds` and `rules` are mutually exclusive on a single entity.

---

## Groups

Groups are declared explicitly at the top level. Entities reference them by ID.
Typos in `group:` on an entity are caught at validation time.

```yaml
groups:
  - id: lights
    collapse: overlay       # all members drawn at same grid cell; last-placed wins visually
    color_policy: most_urgent   # cell color = color of highest-tier active member
    # color_policy options: most_urgent | first_active | member (each keeps its own color)

  - id: hvac_zones
    collapse: separate      # members occupy adjacent cells in insertion order
    color_policy: member
```

`collapse: overlay` reproduces the legacy behaviour (same x,y, column advances once
for the whole group). `collapse: separate` places members in consecutive columns
without consuming extra layout slots. `color_policy: member` is the only option
compatible with `collapse: separate`.

---

## Rule Syntax Reference

Rules use `when` / `then` to separate match conditions from actions.

### `when` conditions

| Key | Type | Matches when |
|---|---|---|
| `state` | string | entity state equals this value exactly |
| `range` | `[low, high]` | numeric state within inclusive bounds; `null` = unbounded |
| `above` | number | numeric state strictly greater than value (use in `thresholds`) |
| `time_range` | `["HH:MM", "HH:MM"]` | current wall-clock time is within the window |
| `also` | list of `{entity, state}` | all listed cross-entity conditions must also hold |

`when` conditions on the same rule are all required (AND). Multiple rules are OR —
first match wins.

### `then` actions

| Key | Values | Notes |
|---|---|---|
| `action` | `show` \| `hide` \| `indicator` | `indicator`: zone layer only, no grid glyph |
| `tier` | tier name | required when action is `show` or `indicator` |
| `color` | color name | overrides `color_scale` auto-assign |
| `show_info` | bool | overrides `defaults.show_info` for this rule |
| `indicator` | bool | also drive zone layer when `action: show` |
| `focus_mode` | bool | suppress all tiers below `critical` while this rule is active |


---

## Glyph Resolution

Glyph values in entity configs are **names, not raw unicode codepoints**. The solver
resolves them before packing the adapter payload. This makes configs readable,
validatable, and display-target-aware.

### Reference formats

| Form | Example | Description |
|---|---|---|
| Material Symbols name | `garage` | Name in the Material Symbols Sharp set; this is what ESPHome compiles in |
| MDI name | `mdi:garage-open` | Name from the Material Design Icons set; native to HA |
| Entity inherit | `entity` | Solver reads `hass.entities[entity_id].icon` at runtime and resolves it |
| Raw unicode | `` | Passed through unchanged; legacy / advanced fallback |

### Font alignment between ESPHome and canvas

ESPHome compiles glyphs from `Material+Symbols+Sharp` (Google). The canvas adapter
loads the same font from Google Fonts at the same point sizes used in the display
profile layouts. This makes the browser preview pixel-accurate to the physical display.

MDI names (`mdi:`) are resolved to their closest Material Symbols Sharp equivalent
via a lookup table in `src/utils/glyph.ts`. If no mapping exists the adapter falls
back to loading the MDI webfont for canvas/PNG targets, and emits a warning for
ESPHome targets (where only compiled glyphs are available).

`entity` resolution reads the entity's icon from `hass.entities[entity_id].icon`
(an `mdi:` name) and then applies the same MDI → MSS resolution above. Entities
without an explicit icon use the HA domain default.

### ESPHome glyph validation

The display profile for an ESPHome target should declare a `font_glyphs` list — the
set of glyph names compiled into the firmware. The ESPHome adapter warns at config
time if a resolved glyph is absent from this list; the glyph will render as blank at
runtime.

`font_glyphs` does not need to be maintained by hand: the Phase 1 tooling extracts
it from the ESPHome YAML, and the `glyph_sizes` block in the display profile tells
the tooling which font sizes to compile. If `glyph_sizes` is present and complete,
the tooling can regenerate the ESPHome `font:` section entirely.

```yaml
display_profiles:
  - id: living_room_oled
    type: esphome
    font_glyphs:              # names of MSS glyphs compiled into this device's firmware
      - garage
      - door_open
      - lock
      - security
      - co2
      - air
      - factory
      - mode_fan_off
      - thermostat
      - water_drop
      - outdoor_grill
      - pool
      - device_thermostat
      - lightbulb
      - arrow_upward
      - arrow_downward
      - check_circle
      - kitchen
      - electric_car
```

### `idle_glyph`

The `idle_glyph` field on a display profile follows the same name resolution as entity
glyphs. It defaults to `"check_circle"` (Material Symbols: verified / all-clear).

---

## Solver Architecture Rules

The solver is **pure functions only** — no DOM access, no `hass` references, no side
effects. This keeps it unit-testable without a browser.

```
Input:  EntityConfig[] + Record<string, StateObject> + DisplayProfile + GlyphResolver
Output: SolverResult {
  glyphs:       GlyphEntry[]          // resolved glyph codepoint + position + color, one per placed icon
  info:         InfoEntry[]           // info-row entries in tier order (may exceed layout.info.max)
  zones:        ZoneEntry[]           // resolved zone indicator shapes with color
  severity_bar: SeverityBarEntry | null  // null when idle and hide_when_idle: true
  layout:       Layout                // the selected layout entry
}
```

One solver call per display profile per state change. Profiles are independent.
`GlyphResolver` is a pure lookup function injected into the solver; it maps a glyph
name + target font to a codepoint string. The solver never performs I/O.

### Pipeline (in order)

1. For each entity config: evaluate `rules` / `thresholds` against current state →
   `ActiveEntry | null`.
   - State `"unavailable"` / `"unknown"` / entity absent → apply `defaults.unavailable_action`
     (default: hide). Skip entity if action is hide.
   - Evaluate `when.also` cross-entity conditions using the same state snapshot.
   - Resolve `glyph: "entity"` by reading `hass.entities[entity_id].icon` before
     rule evaluation so the resolved name is available to all rules.
   - For `thresholds` blocks: find the highest `above` value not exceeded by the state;
     assign `color` from `defaults.color_scale` in threshold order if not explicitly set.
2. Collect active entries; bucket by tier using the declared `tiers` order.
3. Apply focus mode: if any active entry carries `focus_mode: true`, discard all
   entries whose tier is not `critical`.
4. Resolve all glyph names to codepoints via `GlyphResolver`. For ESPHome targets,
   warn if the resolved glyph is absent from `font_glyphs`; for canvas/PNG targets,
   note which font to load (MSS or MDI fallback).
5. Count visible icons (groups collapse to 1 slot regardless of member count).
6. Expand `viewing_distance` preset into `layout_constraints`. Filter layout candidates
   by constraints, then by icon count vs `icon.min/max`, then by info requirement:
   skip layouts with `info.min > 0` when no info is active. Select the first matching
   layout (user-defined order).
7. If no layout matches, emit `error: true`; do not dispatch.
8. Compute pixel coordinates. Map `size:` name to px via `glyph_sizes`. Apply burn-in
   offset if `burn_in_drift: true`:
   `x_offset = floor(hour / 23 * margin_px[0])`
   `y_offset = floor(minute / 59 * margin_px[1])`
9. Collect all info lines (entries where `show_info: true` fired) in tier order.
   Render each line using `value_format` + `label`. ESPHome scrolls through them
   if count exceeds `layout.info.max`.
10. Resolve zone indicators: for each zone defined in the profile, find the highest-
    tier active entry that references that zone and emits an indicator; compute
    the shape position in pixels from the zone's fractional position definition.
11. Compute severity bar (if `severity_bar` is configured on the profile):
    - Determine `tier_index` = 0-based position in the `tiers` list of the highest
      active tier remaining after focus mode. If active set is empty, `fill_ratio = 0`.
    - `fill_ratio = (N - tier_index) / N` where N = len(tiers).
    - Color = resolved `{r,g,b}` of the highest-priority active entry (same selection
      as zone indicator color). If idle, color is omitted.
    - Compute pixel rect from `edge`, `thickness_px`, `screen_px`, and `margin_px`.
    - Emit `SeverityBarEntry` (or `null` if idle and `hide_when_idle: true`).
12. If active set is empty after focus mode, emit idle glyph (resolved via GlyphResolver).
13. Pack into adapter-specific payload.

### Group placement

When the placement loop encounters any member of a group for the first time, all
members of that group are placed at the current slot together. Each member is drawn at
the same (x, y) coordinate with `place_with_next = true` for all but the last —
meaning the column counter advances once for the whole group. Members are drawn in
insertion order (across all priority buckets); later members visually overwrite
earlier ones at the same pixel position.

---

## Severity Bar

The severity bar is a filled edge bar that encodes the overall urgency level of the
active set — a single glanceable indicator of "how bad is it right now?"

### Concept

The bar lives along one edge of the display. Its fill length grows as the highest
active tier escalates, and its color tracks the highest-priority active entry's color.
At idle (no active entries) the bar is hidden. At the least urgent active tier the bar
is at its shortest; at the most urgent tier it fills the edge completely.

This is separate from zone indicators. Zone indicators say *where* activity is;
the severity bar says *how urgent* the overall situation is.

### Fill calculation

Let N = total number of tiers declared in the `tiers` list, and tier_index = 0-based
position of the highest active tier (0 = most urgent, N-1 = least urgent).

```
fill_ratio = (N - tier_index) / N
```

With the default 4-tier list `[critical, alert, status, ambient]`:

| Highest active tier | tier_index | fill_ratio |
|---|---|---|
| (idle) | — | 0.0 (hidden) |
| ambient | 3 | 0.25 |
| status | 2 | 0.50 |
| alert | 1 | 0.75 |
| critical | 0 | 1.0 (full edge) |

The fill is discrete — it steps between tier levels, it does not interpolate.

The bar reflects the post-focus-mode active set. If focus_mode suppresses all but
`critical` entries, only `critical` entries contribute to fill.

### Direction

The bar always grows from the "start" end of its edge toward the "end":
- `top` or `bottom` edge: grows left-to-right
- `left` or `right` edge: grows top-to-bottom

The unfilled portion of the edge is transparent (not drawn).

### Color

`color: entity` (default) — resolves to the `{r,g,b}` color of the highest-priority
active entry using the same selection as zone indicators. This means the bar color
naturally matches the most urgent alert's declared color (e.g., red for critical,
orange for alert).

`color: <name>` — a fixed color name from `src/utils/color.ts`. The bar is always
that color regardless of which tier is active. Use when the color should be static
and only the length encodes severity.

### Schema

```yaml
severity_bar:
  edge: bottom          # top | bottom | left | right
  thickness_px: 4       # bar depth perpendicular to edge, in pixels
  color: entity         # 'entity' = highest-priority active entry color, or a color name
  hide_when_idle: true  # default true; false renders zero-length bar frame (canvas preview aid)
```

`hide_when_idle: false` is useful in the canvas adapter to show the bar rail even
when idle — it makes the bar's position visible while authoring the config. For
ESPHome targets it has no effect because a zero-length rectangle is invisible.

`severity_bar` is optional. Omitting it means no severity bar is rendered for that
profile.

### Adapter encoding

**ESPHome:** the bar is packed as one entry in the existing `draw_shape` arrays —
no new service parameters are needed. Shape type `filled_rectangle`.

For a 128×128 display with a 4px bottom bar at 75% fill (alert tier):
```
x=0, y=124, d2=96 (75% of 128), d3=4, r/g/b from resolved color
```

When `hide_when_idle: true` and active set is empty, the entry is omitted from the
arrays entirely.

**Canvas:** draw a filled rectangle at the computed edge position and pixel
dimensions. When `hide_when_idle: false`, draw an unfilled rectangle outline first
(using the card's `--secondary-background-color` CSS variable) to show the rail.

### Interaction with margin and burn-in drift

The severity bar is positioned against the edge of the usable content area, which
is inset by `margin_px`. For a 128×128 display with `margin_px: [4, 4]` and the bar
on the `bottom` edge with `thickness_px: 4`, the bar occupies `y=120..124` (inside
the 4px drift zone, above the 4px bottom margin). This means the bar drifts with the
rest of the content — it does not anchor to the physical edge.

If the bar should anchor to the absolute bottom pixel row regardless of drift, set
`margin_px: [0, 0]` and use the zone indicator mechanism instead for zone edge bars.

---

## Zone Indicators

Zone indicators are a parallel rendering layer — ambient peripheral shapes that show
"something is active in this zone" without consuming icon grid slots. They are the
generalized form of the legacy light-bar shapes.

### Concept

An entity declares a `zone` (a name string). The display profile defines one slot per
zone, specifying where and how it is drawn. When any entity in a zone fires a rule with
`action: indicator` or `action: show` + `indicator: true`, the zone's shape is rendered
in that profile. Zone indicators are display-specific — the same entity can drive a
thin edge bar on an OLED and a wider strip on a TV dashboard.

### Zone color

Color = the color of the most urgent (earliest in the `tiers` list) active member
in that zone. Multiple members active at different tiers take the most urgent color.
If all members share the same tier, the color of the first one encountered is used.

### `action: indicator` vs `action: show` + `indicator: true`

- `action: indicator` — entity contributes only to the zone layer; it never appears
  in the icon grid. Use for background-status entities that should not compete with
  alerts for grid space.
- `action: show` + `indicator: true` — entity appears in the icon grid AND drives its
  zone indicator simultaneously. Use when the entity is alert-worthy at some thresholds
  but ambient-only at others (separate rules for each case).

### Position specification

Zone positions are expressed as fractions of `screen_px` so they scale across
display sizes. Named shortcuts cover the common cases:

| Shortcut | Equivalent |
|---|---|
| `top-edge` | `{x: 0, y: 0, w: 1.0, h: margin_y}` |
| `bottom-edge` | `{x: 0, y: 1-margin_y, w: 1.0, h: margin_y}` |
| `left-edge` | `{x: 0, y: 0, w: margin_x, h: 1.0}` |
| `right-edge` | `{x: 1-margin_x, y: 0, w: margin_x, h: 1.0}` |
| `top-left` | `{x: 0, y: 0, w: margin_x, h: margin_y}` |
| `top-right` | `{x: 1-margin_x, y: 0, w: margin_x, h: margin_y}` |
| `bottom-left` | `{x: 0, y: 1-margin_y, w: margin_x, h: margin_y}` |
| `bottom-right` | `{x: 1-margin_x, y: 1-margin_y, w: margin_x, h: margin_y}` |

`margin_x` and `margin_y` are derived from `margin_px / screen_px` for that axis.
Explicit `{x, y, w, h}` (all 0.0–1.0 fractions) can express any sub-region of the
screen — a narrow strip, a corner notch, a custom badge area. Shape type defaults to
`filled_rectangle`; `circle` and `filled_circle` are also supported (in which case
`w` is used as the radius fraction).

### N zones

There is no hard limit. The display profile defines as many zone slots as needed.
A 128×128 OLED fits 4 cleanly within its 4px margin (one per edge). A 1920×1080 TV
could carry 8 or more using edge segments or corner badges.

To place multiple zones on the same edge, use explicit fractional positions:
```yaml
zones:
  - id: lights_front
    position: {x: 0.0, y: 0.97, w: 0.5, h: 0.03}   # left half of bottom edge
  - id: lights_rear
    position: {x: 0.5, y: 0.97, w: 0.5, h: 0.03}   # right half of bottom edge
```

### Schema examples

**Entity config:**
```yaml
entities:
  - id: lights_downstairs
    entity_id: light.downstairs
    zone: downstairs                   # maps to a zone slot in each display profile
    rules:
      - when: {state: "on"}
        then:
          action: indicator            # zone layer only; never appears in icon grid
          tier: ambient
          color: yellow

  - id: pool_filter
    entity_id: switch.pool_filter
    zone: pool_area
    rules:
      - when: {state: "on"}
        then:
          action: show                 # grid glyph + zone indicator
          indicator: true
          tier: status
          color: blue
```

**Display profile zones section:**
```yaml
display_profiles:
  - id: living_room_oled
    # ...
    zones:
      - id: downstairs
        position: bottom-edge
      - id: upstairs
        position: top-edge
      - id: exterior_left
        position: left-edge
      - id: pool_area
        position: right-edge

  - id: living_room_tv
    # ...
    zones:
      - id: downstairs
        position: {x: 0.0, y: 0.97, w: 0.25, h: 0.03}
      - id: upstairs
        position: {x: 0.25, y: 0.97, w: 0.25, h: 0.03}
      - id: exterior_left
        position: {x: 0.5, y: 0.97, w: 0.25, h: 0.03}
      - id: pool_area
        position: {x: 0.75, y: 0.97, w: 0.25, h: 0.03}
```

Zones not defined in a profile are silently skipped for that profile. An entity with
a `zone` that has no matching slot in the current profile still evaluates normally for
its grid glyph and info entries.

---

## Lovelace Custom Card: Technical Requirements

### API contract (HA-enforced)

| Method | Required | Notes |
|---|---|---|
| `setConfig(config)` | Yes | Throw on invalid config; never mutate the frozen config object |
| `set hass(hass)` | Yes | Called on every entity state change |
| `getCardSize()` | Recommended | Return height in 50px units for masonry layout |
| `getGridOptions()` | Recommended | `{rows, columns, min_rows, max_rows}` for sections view |
| `static getConfigElement()` | Recommended | Returns editor element (lazy-loaded) |
| `static getStubConfig(hass)` | Optional | Returns example config for card picker |

### Toolchain (non-negotiable)
- **Lit 3** + **TypeScript 5** + **Rollup 4**
- Terser output target: **ES2022** (Lit 3 uses native class syntax; ES5 target breaks it)
- Single bundled output: `dist/display-solver.js`

### HACS plugin requirements
- `hacs.json` at repo root with `name` and `filename` keys
- `dist/display-solver.js` (or `display-solver.js` in root) must match repo name
- Public GitHub repo with description, topics, and README
- Publish GitHub Releases (not just tags) for versioned install/upgrade UX

### HA design system
- Use HA CSS variables (`--primary-color`, `--card-background-color`, etc.)
- Reference: https://design.home-assistant.io
- Use `<ha-card>` as the outer container to match HA card styling

---

## Implementation Phases

### Phase 1 — Clean up the ESPHome service contract

The current `set_display_glyphs` service has ~35 parameters. The following are
candidates for removal; each requires an ESPHome YAML change and reflash.

| Parameter | Status | Action |
|---|---|---|
| `icon_scroll` | Accepted but never read by the display lambda | Remove |
| `info_glyph_font` | Sent as hardcoded `3` by the solver; never varies | Remove; hardcode font3 in ESPHome lambda |
| `info_glyph_x[]` | Follows a fixed layout formula; solver computes it | Keep for now — removes a lambda computation but adds complexity |
| `info_text_x[]` | Same as above | Keep for now |
| `error` | Useful for debugging; low cost | Keep |

**Target contract after Phase 1** (parameters to keep):

```
x[], y[], r[], g[], b[], glyph[], glyph_font
info_glyph[], info_glyph_y[], info_glyph_x[], info_glyph_r[], info_glyph_g[], info_glyph_b[]
info_text[], info_text_y[], info_text_x[], info_text_r[], info_text_g[], info_text_b[]
info_scroll
draw_shape[], draw_shape_x[], draw_shape_y[], draw_shape_d2[], draw_shape_d3[],
draw_shape_r[], draw_shape_g[], draw_shape_b[]
error
```

Removed: `icon_scroll`, `info_glyph_font`.

- Document the resulting contract as a stable, versioned API surface
- No change to display rendering logic beyond removing the two unused parameters

### Phase 2 — Standalone Python solver module
- Port Node-RED JS logic to Python with identical behaviour
- Input: entity state snapshot + entities config dict + one display profile
- Output: service call payload for that display
- Fully unit-testable without HA, ESPHome, or a browser
- Implement `defaults`, `tiers`, `thresholds`, and `layout_constraints` expansion
- Implement `viewing_distance` preset → `layout_constraints` expansion

### Phase 3 — Multi-display support in Python solver
- Solver accepts a list of display profiles
- Runs layout selection independently per profile
- Dispatches to each target's output adapter
- Validate that two profiles with different `viewing_distance` / `layout_constraints` and `screen_px`
  produce correctly different layouts from the same active set

### Phase 4 — Wire to HA via AppDaemon
- AppDaemon app subscribes to entity state changes reactively (no polling)
- On change: run solver for all profiles, dispatch all outputs with debounce
- Validate multi-display pipeline end-to-end before building the card

### Phase 5 — Lovelace Custom Card (`lovelace-display-solver`)
- Scaffold from `custom-cards/boilerplate-card` (Lit 3 + TypeScript + Rollup)
- Port Python solver core to TypeScript (pure functions, no DOM)
- Config editor UI built into card (entity rule authoring, profile setup)
- Canvas adapter renders pixel-accurate preview per selected profile
- ESPHome adapter calls `hass.callService` directly, replacing AppDaemon
- Register in HACS as frontend plugin
- AppDaemon retained as headless/fallback mode

### Phase 6 — Cast and PNG targets
- PNG renderer using Pillow + MDI fonts → HA `www/` static file server
- Camera entity wraps PNG for dashboard embedding and Chromecast casting
- `continuously_casting_dashboards` HACS integration for persistent cast

---

## What ESPHome Side Keeps

- All sensor hardware (SGP30, SCD4x, PMS5003) — published to HA as today
- Display driver and render lambda — receives and draws pre-solved instructions
- `set_display_glyphs` service — minimal, stable, versioned API surface
- Brightness/occupancy globals — fed from HA, unchanged

## What Moves Out of Node-RED

- Entity state polling loop → reactive `hass` property or AppDaemon `listen_state`
- Priority bucketing logic → solver core (Python Phase 2, JS Phase 5)
- Layout selection table → display profile YAML
- Coordinate computation → solver, per display profile
- Glyph array packing → solver output adapter

---

## Key External References

| Resource | URL |
|---|---|
| HA custom card API | https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card |
| hass object reference | https://developers.home-assistant.io/docs/frontend/data |
| HA design system | https://design.home-assistant.io |
| HACS plugin requirements | https://hacs.xyz/docs/publish/plugin/ |
| HACS general requirements | https://hacs.xyz/docs/publish/start/ |
| Boilerplate card (canonical reference) | https://github.com/custom-cards/boilerplate-card |
| HA Cast | https://cast.home-assistant.io |
| Continuously Casting Dashboards | https://github.com/b0mbays/continuously_casting_dashboards |

---

## Success Criteria

- Adding a new tracked entity = one new YAML stanza, no code changes anywhere
- Adding a new display = one new display profile stanza, no solver code changes
- Each display independently selects layout based on its own `screen_px`, `glyph_sizes`, and `layout_constraints`
- Layout behaviour is fully described in config, not in solver code
- Solver is independently unit-testable (pure functions, no HA or browser required)
- The Lovelace card preview is pixel-accurate to what each physical display renders
- ESPHome YAML has no entity-specific logic (no hardcoded `if co2 > 1000`)
- Install path for end users: HACS → Frontend → search "Display Solver" → Download

---

## Step Discipline

Every implementation step follows this multi-agent discipline. All four agents run
for every step; none is optional.

### Agents

| Agent | Role |
|---|---|
| **dev** | Implement the code described in the step spec |
| **test** | Implement unit and integration tests for all deliverables |
| **user-review** | Review docs, config schemas, error messages, and help text for user friendliness |
| **code-review** | Review code for correctness, maintainability, and execution efficiency (memory and speed) |

### Zero-trust handoff

Each step spec (the per-step `.md` file in `steps/`) is the **sole source of truth**
passed to every agent working that step. A dev agent implementing step N does not
inherit any context from the agent that implemented step N-1. The spec must be
self-contained: it references the relevant sections of `esphome_display_solver_plan.md`
by line number and describes exactly what is expected.

### Completion gate

A step is not complete until all four of the following are true:

1. **dev** has implemented all deliverables listed in the step spec.
2. **test** has implemented all required tests and they pass with zero failures.
3. **user-review** has reviewed all user-facing surfaces and signed off (or raised
   issues that were addressed and re-reviewed).
4. **code-review** has reviewed quality, maintainability, and efficiency and signed
   off (or raised issues that were addressed and re-reviewed).

Issues found by any agent — including nits — must be fixed **within the same step**
before the step closes. No deferred issues.

### Sign-off format

Each reviewing agent ends its final report with one of:

- `SIGN-OFF: approved` — no issues remain
- `SIGN-OFF: blocked — <one-line reason>` — outstanding issues not yet fixed

The step does not close until all four agents report `SIGN-OFF: approved`.

---

## Implementation Steps

Each step has a dedicated spec file in `steps/`. The spec is the single source of
truth passed to every agent for that step. It lists deliverables, references the
relevant sections of this plan by line number, and states any constraints agents
must respect.

| Step | Spec file | Phase | Description |
|---|---|---|---|
| 1 | [steps/step-01-esphome-contract.md](steps/step-01-esphome-contract.md) | Phase 1 | ESPHome service contract cleanup and documentation |
| 2 | [steps/step-02-python-types-rules.md](steps/step-02-python-types-rules.md) | Phase 2 | Python solver: data types and rule evaluation engine |
| 3 | [steps/step-03-python-layout-pipeline.md](steps/step-03-python-layout-pipeline.md) | Phase 2–3 | Python solver: layout selection + full pipeline + multi-display |
| 4 | [steps/step-04-appdaemon.md](steps/step-04-appdaemon.md) | Phase 4 | AppDaemon integration (reactive HA wiring) |
| 5 | [steps/step-05-ts-scaffold.md](steps/step-05-ts-scaffold.md) | Phase 5 | TypeScript project scaffold (Lit 3 + Rollup + HACS skeleton) |
| 6 | [steps/step-06-ts-types.md](steps/step-06-ts-types.md) | Phase 5 | TypeScript core interfaces (`solver/types.ts`) |
| 7 | [steps/step-07-utilities.md](steps/step-07-utilities.md) | Phase 5 | Utilities: color lookup and glyph resolution (`utils/`) |
| 8 | [steps/step-08-rules.md](steps/step-08-rules.md) | Phase 5 | Rule evaluation engine (`solver/rules.ts`) |
| 9 | [steps/step-09-layout.md](steps/step-09-layout.md) | Phase 5 | Layout selection and coordinate computation (`solver/layout.ts`) |
| 10 | [steps/step-10-solver-pipeline.md](steps/step-10-solver-pipeline.md) | Phase 5 | Solver pipeline core (`solver/index.ts`) |
| 11 | [steps/step-11-esphome-adapter.md](steps/step-11-esphome-adapter.md) | Phase 5 | ESPHome output adapter (`adapters/esphome.ts`) |
| 12 | [steps/step-12-canvas-adapter.md](steps/step-12-canvas-adapter.md) | Phase 5 | Canvas output adapter (`adapters/canvas.ts`) |
| 13 | [steps/step-13-main-card.md](steps/step-13-main-card.md) | Phase 5 | Main Lovelace card element (`display-solver-card.ts`) |
| 14 | [steps/step-14-editor.md](steps/step-14-editor.md) | Phase 5 | Visual config editor (`editor.ts`) |
| 15 | [steps/step-15-hacs-distribution.md](steps/step-15-hacs-distribution.md) | Phase 5–6 | HACS compliance, README, and release workflow |
