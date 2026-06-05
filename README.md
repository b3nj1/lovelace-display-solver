# Display Solver Card

Priority-based icon/alert dashboard card for Home Assistant — drives ESPHome displays, Chromecast, and dashboard previews from a single declarative entity config.

## What it does

Display Solver Card evaluates a list of entities against configurable rules and priority tiers, then dispatches the resolved set of icons, labels, and severity indicators to one or more targets simultaneously:

- An on-screen Lovelace canvas card (for dashboard previews)
- An ESPHome-driven display (e.g., an OLED panel in a room)
- A Chromecast device

You declare your entities and rules once; the solver picks the right layout automatically based on how many alerts are active and how far away the display is.

## Installation

**Prerequisites:** [HACS](https://hacs.xyz) must be installed in your Home Assistant instance.

1. In Home Assistant, open HACS → Frontend.
2. Click the three-dot menu → Custom repositories, add this repository URL, and select category "Lovelace".
3. Search for "Display Solver" and install it.
4. Reload your browser.

## Usage

After installing, open your Lovelace dashboard, enter Edit mode, click "Add Card", and search for "Display Solver Card". The visual editor will open.

## Configuration

```yaml
type: custom:display-solver-card
entities:
  - entity: sensor.co2
    tiers: [warning, critical]
    rules:
      - when: {above: 1000}
        tier: warning
        glyph: air
profiles:
  - name: living_room_display
    target: esphome
    device: living_room_iaq
```

Full configuration documentation will be added in a later release.

## Examples

_Examples coming soon._
