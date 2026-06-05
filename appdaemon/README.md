# AppDaemon Integration for Display Solver

This directory contains the AppDaemon app that bridges the Display Solver to your
Home Assistant instance. It replaces the Node-RED flow you were using before.

> **Warning:** If you are migrating from Node-RED, disable or delete your existing
> Node-RED display flows before activating AppDaemon. Running both simultaneously
> will cause both to race to call the same ESPHome service, producing unpredictable
> display output.

---

## Prerequisites

1. **AppDaemon add-on** installed in Home Assistant (search for "AppDaemon" in the
   HA add-on store). Version 4.x is required.
2. **Python 3.10 or later** (AppDaemon 4.x bundles its own Python interpreter, so
   this is satisfied automatically by the add-on).
3. **PyYAML** — install via the AppDaemon add-on's Python packages setting:
   ```yaml
   # In the AppDaemon add-on configuration, under "python_packages":
   python_packages:
     - PyYAML
   ```

---

## Installation

Copy the `appdaemon/apps/display_solver/` directory (this repo) into AppDaemon's
`apps/` folder. In a standard HA installation with the AppDaemon add-on, that path
is `/addon_configs/a0d7b954_appdaemon/apps/` (accessible via the Samba share or
the HA file editor add-on).

After copying, your `apps/` directory should contain:

```
apps/
  display_solver/
    __init__.py
    app.py
    config.py
    esphome.py
```

Also copy `python_solver/` to `/addon_configs/a0d7b954_appdaemon/apps/python_solver/`
(it must be a sibling of the `display_solver/` app directory). The app imports from
it at runtime.

---

## Configuration

### apps.yaml

If `apps.yaml` does not exist yet, create it. It must be located at
`/addon_configs/a0d7b954_appdaemon/apps/apps.yaml`.

Add the following stanza:

```yaml
display_solver:
  module: display_solver.app
  class: DisplaySolverApp
  config_path: /config/display_solver_config.yaml
  # log_level: DEBUG   # uncomment to enable verbose logging
```

Replace `/config/display_solver_config.yaml` with the path to your solver config
file (see the example below). The `/config` path maps to your HA config directory.

> **Note:** Changes to `apps.yaml` require restarting the AppDaemon add-on. Changes
> to the solver config YAML (`config_path`) are reloaded at the next solver
> invocation — no restart needed.

---

## Example solver config

Save this as `/config/display_solver_config.yaml` (or whatever path you set in
`apps.yaml`):

```yaml
tiers:
  - critical
  - alert
  - status
  - ambient

defaults:
  unavailable_action: hide
  show_info: true
  color_scale:
    - orange
    - red
    - purple

entities:
  - id: garage_door
    entity_id: binary_sensor.garage_door
    glyph: garage
    rules:
      - when:
          state: "on"
        then:
          action: show
          tier: critical
          color: red
      - when: {}
        then:
          action: hide

  - id: co2_level
    entity_id: sensor.co2
    glyph: air
    label: "CO2"
    value_format: "{state} ppm"
    thresholds:
      - above: 1000.0
        tier: alert
        color: orange
      - above: 1500.0
        tier: critical
        color: red

display_profiles:
  - id: living_room_oled
    type: esphome
    service: esphome.living_room_iaq_set_display_glyphs
    screen_px: [256, 64]
    margin_px: [4, 4]
    viewing_distance: far
    idle_glyph: check_circle
    burn_in_drift: true
    page_dwell_s: 5.0  # seconds per icon page when more icons than fit on screen
    glyph_sizes:
      large:
        px: 48
        fits_cols: 1
      medium:
        px: 32
        fits_cols: 1
    layouts:
      - icon:
          min: 0
          max: 4
        size: medium
        cols: 4
        info:
          min: 0
          max: 0
    font_glyphs:
      - garage
      - air
      - check_circle
    severity_bar:
      edge: bottom
      thickness_px: 4
      color: entity
      hide_when_idle: true

groups: []  # optional; omit or leave empty if not using grouped icons
```

---

## Viewing logs

1. Open the AppDaemon add-on UI (Home Assistant > Add-ons > AppDaemon > Open Web UI).
2. Go to the **Logs** tab.
3. Filter by `display_solver` to see messages from this app.

Warnings (e.g. unresolved glyph names, missing font_glyphs entries) are logged at
`WARNING` level. Solver errors and dispatch failures are logged at `ERROR` level.

---

## What happens when an ESPHome device is unreachable

When an ESPHome device is offline or the service call fails, Home Assistant returns
a service call error. The app catches this exception per profile, logs it at `ERROR`
level (including the profile id and the exception message), and continues dispatching
to all other configured profiles. No other profiles are affected by a single device
being down.

Example log output when a device is unreachable:

```
Exception dispatching profile 'living_room_oled': Error calling service esphome/living_room_iaq_set_display_glyphs: ...
```

---

## Troubleshooting

### Config validation errors

If the solver config YAML contains invalid values (unknown keys, wrong types, missing
required fields), the app logs a `load_config` validation error at startup and will
not dispatch to any display until the config is valid.

Example log output:

```
ERROR display_solver: load_config validation error: ...
```

To fix: correct the YAML at `config_path`, then restart the AppDaemon add-on (or
use AppDaemon's app reload feature if available). No Home Assistant restart is needed.
