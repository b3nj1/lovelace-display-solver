# Display Solver Card

Display Solver Card is a Home Assistant frontend card that evaluates your entities against priority rules and automatically selects the best icon layout for your display. Configure your entities and alert levels once; the card handles layout, icon sizing, severity bars, and multi-page overflow automatically. Supported output targets include a browser canvas preview inside the Lovelace dashboard, ESPHome-driven OLED or LCD panels, and Chromecast devices.

## Installation

**Prerequisites:** [HACS](https://hacs.xyz) must be installed in your Home Assistant instance.

1. In Home Assistant, open **HACS → Frontend**.
2. Click the three-dot menu in the top right, then **Custom repositories**.
3. Add `https://github.com/b3nj1/lovelace-display-solver` and select category **Lovelace**.
4. Search for **Display Solver Card** and click **Download**.
5. Reload your browser.

After installing, open your Lovelace dashboard, enter Edit mode, click **Add Card**, and search for **Display Solver Card**. The visual editor will open for basic configuration. Advanced options (layouts, zones, severity bar) require editing the card YAML directly.

## Quick Start

Add this YAML to a new card to see the solver in action using the built-in `sun.sun` entity and a canvas preview:

This example tracks the sun. When the sun is above the horizon, the card shows an orange sun icon. When the sun sets, it hides and the idle check-circle glyph appears. Replace `sun.sun` with any entity from your Home Assistant instance.

```yaml
type: custom:display-solver-card

# Alert levels — from most urgent to least
tiers:
  - critical
  - alert
  - status

# Default behavior when an entity is unavailable
defaults:
  unavailable_action: hide
  show_info: false

# Entities to watch
entities:
  - id: sun           # arbitrary unique name — used internally, not shown to users
    entity_id: sun.sun
    glyph: sunny              # Material Symbols Sharp name
    rules:
      - when:
          state: above_horizon
        then:
          action: show
          tier: alert
          color: orange
      - when:
          state: below_horizon
        then:
          action: hide

# Where to render the output
display_profiles:
  - id: preview
    type: canvas              # browser canvas preview (no hardware needed)
    screen_px: [256, 256]
    margin_px: [8, 8]
    burn_in_drift: false
    viewing_distance: close
    idle_glyph: check_circle
    glyph_sizes:
      small:
        px: 48          # icon height in pixels
        fits_cols: 3    # how many of these icons fit in one row
    layouts:
      - icon:
          min: 1
          max: 9
          size: small
          cols: 3
        info:
          min: 0
          max: 2
```

When no entities are active (or all hide), the card shows the `idle_glyph` — in this example, a check-circle. Your `layouts` only need to cover the number of icons that can be active simultaneously; zero active icons always shows the idle glyph, not an error.

## Entity Configuration

Each item in the `entities` list describes one Home Assistant entity and the rules that determine when and how it appears on the display.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique identifier for this entity config (used internally) |
| `entity_id` | string | yes | Home Assistant entity ID (e.g. `binary_sensor.garage_door`) |
| `glyph` | string | no | Icon to show — see [Glyph Names](#glyph-names) |
| `label` | string | no | Override the entity's friendly name for display |
| `value_format` | string | no | Template for info text, e.g. `{value:.0f} {unit}` |
| `zone` | string | no | Zone indicator ID to drive when this entity is active |
| `group` | string | no | Group ID — multiple entities can share one icon slot |
| `rules` | Rule[] | no | State-match rules (use `rules` OR `thresholds`, not both) |
| `thresholds` | Threshold[] | no | Numeric threshold rules |

### Rule fields

| Field | Description |
|-------|-------------|
| `when.state` | Match if entity state equals this string |
| `when.range` | Match if numeric state is in `[low, high]` (use `null` for open-ended) |
| `when.above` | Match if numeric state is strictly above this value. (Note: `when.below` is not supported; use `when.range` for below-threshold matching, e.g. `range: [null, 25.0]` means 'below 25'.) |
| `then.action` | `show`, `hide`, or `indicator` (zone only, no icon slot) |
| `then.tier` | Which alert level this maps to (must be declared in `tiers`) |
| `then.color` | Color name or hex (e.g. `red`, `#ff6600`) |
| `then.show_info` | Show an info line with this entity's value |
| `then.focus_mode` | When true, hides all non-critical icons while this is active |

Rules are evaluated in order; the first matching rule wins. An entity with no matching rule is hidden.

### Threshold Configuration

Thresholds are an alternative to rules for numeric entities. Use `thresholds` OR `rules` — not both on the same entity.

| Field | Type | Description |
|-------|------|-------------|
| `above` | number | Trigger this threshold when the entity value is above this number |
| `tier` | string | Alert level to assign (must be declared in `tiers`) |
| `color` | string | Optional color override |

Thresholds are evaluated in order, lowest `above` first. Only the highest matching threshold is active.

Example:
```yaml
- id: co2
  entity_id: sensor.co2_level
  glyph: co2
  thresholds:
    - above: 800
      tier: status
      color: yellow
    - above: 1000
      tier: alert
      color: orange
    - above: 1500
      tier: critical
      color: red
```

## Display Profile Configuration

Each item in `display_profiles` describes one output target. A single card can drive multiple targets simultaneously.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique profile identifier |
| `type` | string | yes | `canvas`, `esphome`, `cast`, or `png_file` |
| `service` | string | esphome only | HA service to call, e.g. `esphome.living_room_set_display_glyphs` |
| `screen_px` | [w, h] | yes | Display resolution in pixels |
| `margin_px` | [x, y] | yes | Margin from edges in pixels |
| `burn_in_drift` | boolean | no (default: false) | Slowly shift content position to prevent OLED burn-in. Enable for OLED displays, leave off for LCD/TFT. |
| `viewing_distance` | string | yes | `close`, `near`, or `far` — controls layout selection |
| `idle_glyph` | string | yes | Glyph shown when no entities are active |
| `glyph_sizes` | object | yes | Named size entries (e.g. `small: {px: 24, fits_cols: 4}`) |
| `layouts` | Layout[] | yes | Layout options tried in order (first match wins) |
| `page_dwell_s` | number | no | When more icons are active than fit in the selected layout, icons are split across pages. This sets how many seconds each page is shown before advancing. (Default: 5) |
| `severity_bar` | object | no | Optional bar along one edge encoding the highest active alert level |

### Layout fields

Each layout entry in the `layouts` list describes an icon grid and info area:

```yaml
layouts:
  - icon:
      min: 1        # minimum active icons required to select this layout
      max: 9        # maximum active icons this layout can show
      size: small   # glyph size name (must be defined in glyph_sizes)
      cols: 3       # number of icon columns
    info:
      min: 0        # minimum info lines required (0 = layout works with or without info)
      max: 2        # number of info rows allocated on screen
```

Layouts are tried in order. The first layout whose `icon.min`/`icon.max` range covers the current active icon count and whose `info.min` requirement is satisfied is selected.

### Severity bar fields

```yaml
severity_bar:
  edge: bottom          # top | bottom | left | right
  thickness_px: 4       # depth perpendicular to the edge, in pixels
  color: entity         # 'entity' = color of the highest-priority active entry, or a color name
  hide_when_idle: true  # omit the bar when no entities are active
```

## Viewing Distance Presets

The `viewing_distance` field on a display profile controls which layouts are eligible for selection.

| Preset | Typical use | Effect |
|--------|-------------|--------|
| `close` | Tablet, monitor, dashboard screen | All layouts available; prefer higher-density |
| `near` | Across a room (1–3 m) | All layouts available |
| `far` | Hallway, at a distance (3 m+) | Layouts requiring info lines excluded |

When set to `far`, any layout with `info.min > 0` is filtered out before matching begins.

## Glyph Names

Four forms are accepted in any `glyph` field:

1. **Material Symbols Sharp name** (recommended): e.g. `garage`, `thermostat`, `water_drop`. Browse the catalog at [fonts.google.com/icons](https://fonts.google.com/icons?icon.style=Sharp).
2. **MDI name**: e.g. `mdi:garage`, `mdi:thermometer`. The solver maps common MDI names to their Material Symbols equivalents automatically. Browse at [pictogrammers.com/library/mdi](https://pictogrammers.com/library/mdi/).
3. **`"entity"`**: Resolved from the entity's icon attribute in Home Assistant at rule-evaluation time.
4. **Raw unicode**: A single unicode character, passed through unchanged (legacy support).

For ESPHome displays, glyphs must be compiled into the firmware's `font_glyphs` list. See [ESPHome Setup](#esphome-setup).

## ESPHome Setup

To drive a physical ESPHome display, you need:

> **Before this card can communicate with an ESPHome display, you must add the service definition to your device's ESPHome YAML configuration and flash (compile and upload) the updated firmware to the device.** If the service does not appear in Home Assistant under Developer Tools → Services, the flash has not been completed.

1. An ESPHome device with a display component and a font that includes your glyphs.
2. A custom service (`set_display_glyphs`) defined in your ESPHome YAML.
3. The service name configured in the display profile: `service: esphome.<device>_set_display_glyphs`.

Add the profile to your card config:

```yaml
display_profiles:
  - id: living_room
    type: esphome
    service: esphome.living_room_iaq_set_display_glyphs
    screen_px: [400, 300]
    margin_px: [8, 8]
    burn_in_drift: true
    viewing_distance: near
    idle_glyph: check_circle
    glyph_sizes:
      small:
        px: 24
        fits_cols: 4
    layouts:
      - icon:
          min: 1
          max: 16
          size: small
          cols: 4
        info:
          min: 0
          max: 3
```

Full ESPHome configuration reference: [`docs/esphome-service-contract.md`](docs/esphome-service-contract.md) and [`docs/esphome-reference.yaml`](docs/esphome-reference.yaml). `esphome-service-contract.md` describes the service parameters and array schema. `esphome-reference.yaml` is a ready-to-use ESPHome YAML template you can copy into your device configuration.

## Troubleshooting

**Glyph shows as a blank square**
The glyph name is not compiled into your ESPHome firmware's font. Add it to the `font_glyphs` list in your ESPHome YAML and re-flash the device.

**Card shows no icons even when entities are active**
Check that your `tiers` list is not empty and that each rule's `then.tier` matches a declared tier name exactly (case-sensitive). Open the browser console for any validation errors reported by the card.

**Icon count doesn't match any layout and icons disappear**
No layout's `icon.min`/`icon.max` range covers the number of active icons. Add a layout entry that covers the expected range, or widen an existing entry's `max`.

**ESPHome service call fails**
Verify that `profile.service` in your config exactly matches the service HA exposes for your device. Check **Developer Tools → Services** in Home Assistant. The format is `esphome.<device_name>_set_display_glyphs`.

**ESPHome service call sends nothing / no icons appear on hardware**
The ESPHome service does not exist in Home Assistant. This usually means the firmware has not been flashed with the `set_display_glyphs` service definition. Check Developer Tools → Services for `esphome.<device>_set_display_glyphs`. If it is not listed, add the service to your ESPHome YAML and re-flash the device.

**Visual editor opens but shows a blank form**
The editor requires a valid config to display its fields. If you are adding the card for the first time, click "Show code editor" and paste the Quick Start example, then switch back to the visual editor.
