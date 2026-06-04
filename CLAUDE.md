# CLAUDE.md — lovelace-display-solver

This file grounds every AI coding session in the project's conventions, constraints,
and mandatory references. Read it before writing any code.

---

## Project Identity

**Name:** `lovelace-display-solver`
**HACS type:** Plugin (Dashboard / frontend)
**Custom element tag:** `display-solver-card`
**Repository name convention:** `lovelace-display-solver`
  → HACS strips the `lovelace-` prefix when looking for `display-solver.js`

**One-line description (used in HACS and GitHub):**
> Priority-based icon/alert dashboard card for Home Assistant — drives ESPHome displays,
> Chromecast, and dashboard previews from a single declarative entity config.

---

## Mandatory Reading Before Any Code Change

These URLs must be fetched and read before touching the relevant layer:

| Topic | URL |
|---|---|
| Custom card API | https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card |
| hass object / data | https://developers.home-assistant.io/docs/frontend/data |
| Registering resources | https://developers.home-assistant.io/docs/frontend/custom-ui/registering-resources |
| HA design portal | https://design.home-assistant.io |
| HACS plugin requirements | https://hacs.xyz/docs/publish/plugin/ |
| HACS general requirements | https://hacs.xyz/docs/publish/start/ |
| Boilerplate card (reference impl) | https://github.com/custom-cards/boilerplate-card |

---

## Toolchain

| Tool | Version constraint | Reason |
|---|---|---|
| TypeScript | 5.x | Required by Lit 3 |
| Lit | 3.x | HA's native web-component library |
| Rollup | 4.x | Bundler; outputs single `.js` file for HACS |
| Terser | latest | Minifier — **must** target ES2022 |

**Critical Rollup/Terser constraint:** output target must be `ES2022` (not ES5, not
ES2015). Lit 3 uses native class syntax; downgrading causes
`TypeError: Class constructor cannot be invoked without 'new'` at runtime.

```js
// rollup.config.js — non-negotiable
terser({ ecma: 2022 })
typescript({ compilerOptions: { target: 'ES2022' } })
```

---

## Repository Layout

```
lovelace-display-solver/
├── hacs.json                  # HACS manifest — required at repo root
├── README.md                  # Required by HACS; user-facing install + config docs
├── info.md                    # Optional HACS rich description (shown in store UI)
├── CLAUDE.md                  # This file
├── package.json
├── rollup.config.js
├── tsconfig.json
├── src/
│   ├── display-solver-card.ts # Main card element
│   ├── editor.ts              # Visual config editor (lazy-loaded)
│   ├── solver/
│   │   ├── index.ts           # Solver core — pure functions, no DOM
│   │   ├── rules.ts           # Rule evaluation (state match, range match)
│   │   ├── layout.ts          # Layout selection from profile
│   │   └── types.ts           # Shared TypeScript interfaces
│   ├── adapters/
│   │   ├── canvas.ts          # Renders to <canvas> in the card
│   │   ├── esphome.ts         # Calls hass.callService for ESPHome targets
│   │   └── png.ts             # (Phase 6) PNG via HA REST API
│   └── utils/
│       ├── color.ts           # color name → {r,g,b}
│       └── glyph.ts           # glyph name → codepoint; MDI→MSS mapping table
├── dist/
│   └── display-solver.js      # Built output — what HACS downloads
└── tests/
    ├── solver.test.ts
    ├── rules.test.ts
    └── layout.test.ts
```

---

## hacs.json (required at repo root)

```json
{
  "name": "Display Solver Card",
  "render_readme": false,
  "filename": "display-solver.js",
  "homeassistant": "2024.4.0",
  "hacs": "1.32.0"
}
```

**HACS plugin file resolution order:** `dist/` → latest release → repo root.
The built file must be `display-solver.js` (repo name minus `lovelace-` prefix).

---

## Custom Card API Contract

### Required methods

```ts
// Called once on setup; throw Error if config invalid
setConfig(config: CardConfig): void

// HA injects fresh hass on every entity state change
set hass(hass: HomeAssistant)

// Returns card height in units of 50px (masonry layout hint)
getCardSize(): number

// Returns grid sizing for sections view
getGridOptions(): { rows: number; columns: number; min_rows: number; max_rows: number }
```

### Config mutation rule
HA **freezes** the config object passed to `setConfig`. Never mutate it in place —
clone it if you need to modify: `this._config = { ...config }`.

### State subscription (preferred pattern)
Use the context-request pattern (not direct `hass` property assignment) for state
updates when possible — it avoids unnecessary re-renders when unrelated entities change.

### Registering in card picker
```js
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'display-solver-card',
  name: 'Display Solver',
  description: 'Priority dashboard for ESPHome and Chromecast displays',
  preview: true,
  documentationURL: 'https://github.com/YOUR_ORG/lovelace-display-solver',
});
```

### Visual editor
The editor element must be lazy-loaded to keep the main bundle small:
```ts
static getConfigElement() {
  return document.createElement('display-solver-card-editor');
}
```
The editor element tag (`display-solver-card-editor`) must be registered before
`getConfigElement` is called, or the visual editor will silently fail to open.

---

## hass Object Quick Reference

```ts
hass.states['sensor.co2']         // StateObject | undefined
hass.states['sensor.co2'].state   // string — always a string, parse floats yourself
hass.states['sensor.co2'].attributes.friendly_name
hass.callService('esphome', 'living_room_iaq_set_display_glyphs', payload)
hass.formatEntityState(stateObj)  // localized display string
```

**Key rule:** `state` is always a string. Never use `===` against a number.
Parse: `parseFloat(hass.states[id].state)`.

---

## Solver Architecture Rules

The solver is **pure functions only** — no DOM access, no `hass` references, no
side effects. This keeps it unit-testable without a browser.

```
Input:  EntityConfig[] + Record<string,StateObject> + DisplayProfile + GlyphResolver
Output: SolverResult { glyphs: GlyphEntry[], info: InfoEntry[], zones: ZoneEntry[], layout: Layout }
```

One solver call per display profile per state change. Profiles are independent —
a change in active icon count on one display does not affect another.
`GlyphResolver` is a pure lookup function injected into the solver (name → codepoint).

### Glyph reference forms (entity config `glyph` field)
- `"garage"` — Material Symbols Sharp name (what ESPHome compiles in)
- `"mdi:garage-open"` — MDI name; mapped to MSS equivalent or MDI webfont fallback
- `"entity"` — resolved from `hass.entities[entity_id].icon` at rule-eval time
- Raw unicode — passed through unchanged (legacy fallback)

### Solver pipeline (in order)
1. For each entity config: evaluate rules against current state → `ActiveEntry | null`
   - Missing / unavailable / unknown state: match `{state: "unavailable"}` rules only;
     skip entity if no such rule matches.
   - Resolve `glyph: "entity"` before rule evaluation.
2. Collect active entries; bucket by priority (0 = highest urgency)
3. Apply priority ceiling: minimum `priority_ceiling` across active entries clamps the
   effective range; discard entries with priority above the ceiling.
4. Resolve all glyph names to codepoints via GlyphResolver. Warn if a glyph is absent
   from the profile's `font_glyphs` list on ESPHome targets.
5. Count visible icons (groups collapse to 1 slot regardless of member count)
6. Filter layout candidates by `viewing_distance` first, then icon count, then info
   row requirement (`info.min`); select first matching layout
7. Compute pixel coordinates; apply burn-in offset if `burn_in_drift: true`
8. Collect all info lines in priority order (ESPHome scrolls if count > `info.max`)
9. Resolve zone indicators: highest-priority active entry per zone → shape + color
10. If active set is empty, emit idle glyph (resolved via GlyphResolver)
11. Pack into adapter-specific payload

---

## Display Profile Rules

- `viewing_distance: far` — filter OUT any layout with `info.min > 0` or `icon.font > 2`
- `viewing_distance: near` — no filter, use full layout table
- `viewing_distance: close` — no filter, prefer higher-density layouts first

Distance filter applies **before** icon count match.

Layout `info` field has two sub-keys: `min` (minimum info lines required to select
this layout) and `max` (info rows allocated on screen; ESPHome scrolls overflow).

`burn_in_drift: true` on a profile enables time-based pixel drift within `margin_px`
to prevent OLED burn-in. ESPHome-targeted profiles should set both.

---

## ESPHome Service Contract (stable API)

Service name: `esphome.<device_name>_set_display_glyphs`

All array parameters must be the same length. The card must not assume any particular
array length from previous calls — ESPHome stores the full arrays and overwrites on
each call.

See `src/adapters/esphome.ts` for the canonical payload schema.

---

## Coding Conventions

- No `any` types — use the interfaces in `solver/types.ts`
- No React — HA frontend explicitly excludes it (custom elements incompatibility)
- No `localStorage` or `sessionStorage` — unavailable in HA card context
- CSS: use HA CSS variables (`--primary-color`, `--card-background-color`, etc.)
  from `design.home-assistant.io` to match the active theme
- All solver functions must have corresponding unit tests in `tests/`
- Solver tests must run with `node` only (no browser, no DOM shims)

---

## What This Card Does NOT Do

- It does not store configuration in HA storage — config lives in the Lovelace YAML
- It does not poll — it reacts to the `hass` property update cycle
- It does not modify ESPHome YAML — ESPHome is a dumb renderer
- It does not perform layout computation inside ESPHome lambdas

---

## Key References (external docs)

- HA design system: https://design.home-assistant.io
- HA developer blog (breaking changes): https://developers.home-assistant.io/blog
- Lit 3 docs: https://lit.dev/docs/
- HACS plugin publishing: https://hacs.xyz/docs/publish/plugin/
- Boilerplate card (canonical reference): https://github.com/custom-cards/boilerplate-card
