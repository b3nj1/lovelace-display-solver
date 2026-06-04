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

`viewing_distance` is a pre-filter on layout candidates, applied before icon-count
matching. It encodes the perceptual constraint: how many pixels map to a perceivable
unit at this distance.

| Distance | Typical scenario | Effect |
|---|---|---|
| `far` | TV across room, OLED on a shelf | Filter out layouts with `info.min > 0` or `font > 2`; prefer fewer, larger icons |
| `near` | Wall tablet at arm's length | No filter; full layout table available |
| `close` | Dashboard card on desk screen | No filter; prefer higher-density layouts |

A `far` display will never select a dense layout even if icon count would allow it.

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
    viewing_distance: far
    idle_glyph: "check_circle"
    layouts:
      - icon: {min: 1, max: 1,  font: 1, cols: 1}
        info: {min: 0, max: 0}
      - icon: {min: 1, max: 4,  font: 2, cols: 2}
        info: {min: 0, max: 0}
      - icon: {min: 1, max: 4,  font: 4, cols: 4}
        info: {min: 2, max: 2}
      - icon: {min: 1, max: 1,  font: 2, cols: 2}
        info: {min: 1, max: 2}

  - id: kitchen_matrix
    type: esphome
    service: esphome.kitchen_matrix_set_display_glyphs
    screen_px: [256, 64]
    margin_px: [0, 0]
    burn_in_drift: false
    viewing_distance: near
    idle_glyph: "check_circle"
    layouts:
      - icon: {min: 1, max: 8, font: 3, cols: 8}
        info: {min: 0, max: 1}

  - id: dashboard_card
    type: canvas
    screen_px: [400, 400]
    margin_px: [0, 0]
    burn_in_drift: false
    viewing_distance: close
    idle_glyph: "check_circle"
    layouts:
      - icon: {min: 1, max: 16, font: 4, cols: 4}
        info: {min: 0, max: 3}

  - id: living_room_tv
    type: cast            # PNG → camera entity → HA Cast
    screen_px: [1920, 1080]
    margin_px: [0, 0]
    burn_in_drift: false
    viewing_distance: far
    idle_glyph: "check_circle"
    layouts:
      - icon: {min: 1, max: 8, font: 1, cols: 8}
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
`action: hide` terminates evaluation for that entity \u2014 the entity does not appear.

Range matches use **inclusive bounds on both ends**: `{range: [1000, 2000]}` matches
values where `1000 <= value <= 2000`. When two adjacent ranges share a boundary (e.g.
`[1000, 2000]` and `[2000, 4500]`), value 2000 matches the first rule encountered and
evaluation stops there.

`null` as the upper bound means unbounded: `{range: [4500, null]}` matches any value
`>= 4500`.

If the entity is absent from `hass.states` or its state is `"unavailable"` or
`"unknown"`, only rules with `match: {state: "unavailable"}` can match. If no such
rule exists, the entity is silently skipped.

### Info format strings

The `info` field on an entity config is a template string. Supported substitutions:
- `{value}` \u2014 the raw state string
- `{value:.0f}` \u2014 state parsed as float, formatted with 0 decimal places
- `{friendly_name}` \u2014 `attributes.friendly_name`
- `{unit}` \u2014 `attributes.unit_of_measurement`

Info strings are built by the solver; ESPHome receives pre-rendered strings.

### Priority ceiling

An entity rule can carry `priority_ceiling: N`. When that rule fires, the solver
restricts the active set to priorities 0..N for this solver run, discarding entries
with priority > N. This implements "focus mode" \u2014 when something critical is
happening, suppress lower-urgency background icons. Multiple active ceilings take the
lowest (most restrictive) value.

Example: security system armed away \u2192 hide all priority-2 background glyphs.

### Info lines

Multiple entities can have `include_info: true` active simultaneously. The solver
collects all active info entries into an ordered array (sorted by priority, then by
entity order). ESPHome scrolls through them when the count exceeds the layout's
`info.max`.

```yaml
entities:
  # Named MSS glyph — straightforward alert entity
  - id: garage_door
    entity_id: binary_sensor.garage_door
    glyph: "garage"                    # Material Symbols Sharp name
    rules:
      - match: {state: "unavailable"}
        action: hide
      - match: {state: "off"}
        action: hide
      - match: {state: "on"}
        action: show
        priority: 0
        color: red

  # MDI glyph — resolved to MSS equivalent for ESPHome, MDI webfont for canvas
  - id: co2
    entity_id: sensor.living_room_co2
    glyph: "mdi:molecule-co2"
    info: "{value:.0f} ppm {friendly_name}"
    rules:
      - match: {range: [0, 1000]}
        action: hide
      - match: {range: [1000, 2000]}
        action: show
        priority: 1
        color: orange
        include_info: true
      - match: {range: [2000, 4500]}
        action: show
        priority: 0
        color: red
        include_info: true
      - match: {range: [4500, null]}
        action: show
        priority: 0
        color: purple
        include_info: true

  # Entity-inherit glyph + priority ceiling
  - id: security
    entity_id: alarm_control_panel.house
    glyph: "entity"                    # uses HA's icon for this entity at runtime
    rules:
      - match: {state: "disarmed"}
        action: hide
      - match: {state: "armed_away"}
        action: show
        priority: 0
        color: red
        priority_ceiling: 1            # suppress all priority-2 background icons

  # Zone indicator only — never appears in icon grid
  - id: lights_downstairs
    entity_id: light.downstairs
    zone: downstairs                   # drives the "downstairs" zone slot in each profile
    rules:
      - match: {state: "on"}
        action: indicator              # zone layer only; no grid glyph needed
        priority: 2
        color: yellow

  # Zone indicator AND grid glyph at high-severity threshold
  - id: pool_filter
    entity_id: switch.pool_filter
    glyph: "mdi:pool"
    zone: pool_area
    rules:
      - match: {state: "on"}
        action: indicator              # normal operation: ambient indicator only
        priority: 2
        color: blue
      - match: {state: "unavailable"}
        action: show                   # fault: show in grid AND zone
        indicator: true
        priority: 0
        color: red
```

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
runtime. The `font_glyphs` list does not need to be maintained by hand — it can be
extracted from the ESPHome YAML by the Phase 1 tooling.

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
  glyphs: GlyphEntry[]   // resolved glyph codepoint + position + color, one per placed icon
  info:   InfoEntry[]    // info-row entries in priority order (may exceed layout.info.max)
  zones:  ZoneEntry[]    // resolved zone indicator shapes with color
  layout: Layout         // the selected layout entry
}
```

One solver call per display profile per state change. Profiles are independent.
`GlyphResolver` is a pure lookup function injected into the solver; it maps a glyph
name + target font to a codepoint string. The solver never performs I/O.

### Pipeline (in order)

1. For each entity config: evaluate rules against current state → `ActiveEntry | null`
   - State `"unavailable"` / `"unknown"` / entity absent → match `{state: "unavailable"}`
     rules only; skip entity if no such rule matches.
   - Resolve `glyph: "entity"` by reading `hass.entities[entity_id].icon` before
     rule evaluation so the resolved name is available to all rules.
2. Collect active entries; bucket by priority.
3. Apply priority ceiling: find the minimum `priority_ceiling` across all active
   entries; discard entries with priority > that ceiling.
4. Resolve all glyph names to codepoints via `GlyphResolver`. For ESPHome targets,
   warn if the resolved glyph is absent from `font_glyphs`; for canvas/PNG targets,
   note which font to load (MSS or MDI fallback).
5. Count visible icons (groups collapse to 1 slot regardless of member count).
6. Filter layout candidates by `viewing_distance`, then by icon count vs `icon.min/max`,
   then by info requirement: skip layouts with `info.min > 0` when no info is active.
   Select the first matching layout (user-defined order).
7. If no layout matches, emit `error: true`; do not dispatch.
8. Compute pixel coordinates. Apply burn-in offset if `burn_in_drift: true`:
   `x_offset = floor(hour / 23 * margin_px[0])`
   `y_offset = floor(minute / 59 * margin_px[1])`
9. Collect all info lines in priority order. ESPHome will scroll through them if count
   exceeds `layout.info.max`.
10. Resolve zone indicators: for each zone defined in the profile, find the highest-
    priority active entry that references that zone and emits an indicator; compute
    the shape position in pixels from the zone's fractional position definition.
11. If active set is empty after ceiling, emit idle glyph (resolved via GlyphResolver).
12. Pack into adapter-specific payload.

### Group placement

When the placement loop encounters any member of a group for the first time, all
members of that group are placed at the current slot together. Each member is drawn at
the same (x, y) coordinate with `place_with_next = true` for all but the last —
meaning the column counter advances once for the whole group. Members are drawn in
insertion order (across all priority buckets); later members visually overwrite
earlier ones at the same pixel position.

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

Color = the color of the highest-priority (lowest priority number) active member
in that zone. Multiple members active at different priorities take the most urgent
color. If all members are equal priority, the color of the first one encountered is
used.

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
      - match: {state: "on"}
        action: indicator              # zone layer only; never appears in icon grid
        priority: 2
        color: yellow

  - id: pool_filter
    entity_id: switch.pool_filter
    zone: pool_area
    rules:
      - match: {state: "on"}
        action: show                   # grid glyph + zone indicator
        indicator: true
        priority: 1
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
- Implement `viewing_distance` pre-filter on layout candidates

### Phase 3 — Multi-display support in Python solver
- Solver accepts a list of display profiles
- Runs layout selection independently per profile
- Dispatches to each target's output adapter
- Validate that two profiles with different `viewing_distance` and `screen_px`
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
- Each display independently selects layout based on its own `screen_px` and `viewing_distance`
- Layout behaviour is fully described in config, not in solver code
- Solver is independently unit-testable (pure functions, no HA or browser required)
- The Lovelace card preview is pixel-accurate to what each physical display renders
- ESPHome YAML has no entity-specific logic (no hardcoded `if co2 > 1000`)
- Install path for end users: HACS → Frontend → search "Display Solver" → Download
