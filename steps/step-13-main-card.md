# Step 13 — Main Lovelace Card Element (`display-solver-card.ts`)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` lines 1080–1125
- Implementation Steps index: `esphome_display_solver_plan.md` lines 1127–1145

## Plan section references

- Custom Card API contract: lines 936–948
- Toolchain (Lit 3, HA CSS variables): lines 949–963
- hass object quick reference: (CLAUDE.md `hass Object Quick Reference` section)
- Config mutation rule (never mutate frozen config): (CLAUDE.md `Config mutation rule`)
- Registering in card picker: (CLAUDE.md `Registering in card picker`)
- Phase 5 goals: lines 1019–1026
- Solver Architecture (pure, no DOM): lines 629–648
- Output adapters: lines 222–232

## Prerequisites

- Step 5 (TypeScript scaffold) complete
- Step 6 (types) complete
- Steps 7–10 (utilities + solver pipeline) complete
- Steps 11–12 (ESPHome + canvas adapters) complete
- `npm run build` and `npm test` passing

## Context

`src/display-solver-card.ts` is the Lovelace custom element. It replaces the skeleton
from Step 5 with the full implementation: config validation, reactive hass updates,
solver dispatch, and canvas preview rendering.

The card drives multiple display profiles simultaneously:
- For each `canvas` profile: render to a `<canvas>` element in the card DOM.
- For each `esphome` profile: call `hass.callService` with the packed payload.

The `hass` setter is called on every entity state change in HA. It should be fast
and avoid unnecessary re-renders.

## Deliverables

### `src/display-solver-card.ts` (replace skeleton from Step 5)

```ts
import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { CardConfig, DisplayProfile, SolverResult } from './solver/types';
import { validateCardConfig } from './solver/types';
import { solve } from './solver/index';
import { packESPhomePayload } from './adapters/esphome';
import { renderToCanvas } from './adapters/canvas';
import { resolveGlyph } from './utils/glyph';

@customElement('display-solver-card')
export class DisplaySolverCard extends LitElement {
  @state() private _config?: CardConfig;
  @state() private _hass?: HomeAssistant;    // HomeAssistant type from HA typedefs
  @state() private _errors: string[] = [];

  static styles = css`
    ha-card { ... }
    canvas { ... }
  `;

  setConfig(config: CardConfig): void
  set hass(hass: HomeAssistant)
  getCardSize(): number
  getGridOptions(): object
  static getConfigElement(): HTMLElement
  static getStubConfig(hass: HomeAssistant): CardConfig
  render(): TemplateResult
}
```

#### `setConfig(config)`

1. Validate with `validateCardConfig(config)`. If errors, store in `this._errors`
   and return (do not throw — showing errors in the card is friendlier than crashing).
2. Clone config: `this._config = structuredClone(config)` (never mutate the frozen
   object passed by HA — CLAUDE.md constraint).
3. Clear `this._errors`.

#### `set hass(hass)`

1. Store `this._hass = hass`.
2. Call `this._runSolver()`.

`set hass` is called on every entity state change. Keep it fast.

#### `_runSolver()` (private)

1. Guard: if `!this._config || !this._hass` return immediately.
2. For each profile in `this._config.display_profiles`, call:
   ```ts
   const result = solve(
     this._config.entities,
     this._hass.states,
     this._config.tiers,
     this._config.defaults,
     this._config.groups ?? [],
     profile,
     resolveGlyph,
   );
   ```
3. For `canvas` profiles: store results; `this.requestUpdate()` to trigger re-render.
4. For `esphome` profiles with `result.error === false`:
   ```ts
   const payload = packESPhomePayload(result, profile);
   this._hass.callService(
     profile.service.split('.')[0],    // domain
     profile.service.split('.')[1],    // service name
     payload,
   );
   ```
   On error, log to console (do not throw).

#### `render()`

For each `canvas` profile that has a solver result:
```html
<ha-card>
  ${this._errors.length > 0 ? html`<div class="error">...</div>` : ''}
  ${canvasProfiles.map(p => html`
    <div class="profile-wrapper">
      <canvas id="canvas-${p.id}"></canvas>
    </div>
  `)}
</ha-card>
```

After render (use `updated()` lifecycle hook), call `renderToCanvas(result, profile, canvas)`
for each canvas profile.

#### `updated(changedProperties: PropertyValues)`

After each render update, for each canvas profile:
1. Get canvas element: `this.shadowRoot?.querySelector(`#canvas-${profile.id}`)`.
2. If found and result available, call `renderToCanvas(result, profile, canvas as HTMLCanvasElement)`.

#### `getCardSize()`

Return `Math.ceil(this._config?.display_profiles?.length ?? 1)`.

#### `getGridOptions()`

```ts
return {
  rows: 3,
  columns: 4,
  min_rows: 2,
  max_rows: Math.max(6, (this._config?.display_profiles?.length ?? 1) * 3),
};
```

#### `static getConfigElement()`

```ts
return document.createElement('display-solver-card-editor');
```

#### `static getStubConfig(_hass: HomeAssistant): CardConfig`

Return a minimal valid config example:
```ts
{
  tiers: ['critical', 'alert', 'status'],
  defaults: { unavailable_action: 'hide', show_info: true, color_scale: ['orange', 'red'] },
  entities: [{
    id: 'example',
    entity_id: 'binary_sensor.example',
    glyph: 'check_circle',
    rules: [
      { when: { state: 'off' }, then: { action: 'hide' } },
      { when: { state: 'on'  }, then: { action: 'show', tier: 'alert', color: 'red' } },
    ],
  }],
  display_profiles: [{
    id: 'preview',
    type: 'canvas',
    screen_px: [400, 400],
    margin_px: [0, 0],
    burn_in_drift: false,
    viewing_distance: 'close',
    idle_glyph: 'check_circle',
    glyph_sizes: { tiny: { px: 30, fits_cols: 4 } },
    layouts: [{ icon: { min: 1, max: 16, size: 'tiny', cols: 4 }, info: { min: 0, max: 3 } }],
  }],
}
```

### CSS

Use HA CSS variables:
- Card background: `var(--card-background-color)`
- Error text: `var(--error-color, red)`
- Profile label text: `var(--primary-text-color)`

Canvas elements: `display: block; width: 100%; max-width: ${profile.screen_px[0]}px`.

### `customCards` registration (at module level)

```ts
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'display-solver-card',
  name: 'Display Solver',
  description: 'Priority dashboard for ESPHome and Chromecast displays',
  preview: true,
  documentationURL: 'https://github.com/YOUR_ORG/lovelace-display-solver',
});
```

## Tests (`tests/card.test.ts`)

Card element tests use vitest with a minimal DOM stub (happy-dom or jsdom vitest
environment). Add `"environment": "happy-dom"` (or `"jsdom"`) to vitest config.

Required test cases:

1. `setConfig` with valid config → `_errors` is empty
2. `setConfig` with invalid config (missing `tiers`) → `_errors` has at least one entry
3. `setConfig` clones the config — mutating the original does not affect `_config`
4. `set hass` triggers `_runSolver` (verify via spy on `callService` for an ESPHome
   profile — mock `hass.callService` and `hass.states`)
5. `getCardSize` returns a positive integer
6. `getGridOptions` returns an object with `rows`, `columns`, `min_rows`, `max_rows`
7. `getStubConfig` returns an object that passes `validateCardConfig`

## Constraints

- `setConfig` must never mutate the config object passed by HA
- `set hass` must not `await` anything — it is synchronous; font loading for canvas
  happens in `updated()` which is async-capable
- No `any` types
- `callService` is called only for `esphome` profiles with `result.error === false`

## Agent instructions

### dev agent

Replace the skeleton `src/display-solver-card.ts` from Step 5 with the full
implementation. Add a `"environment": "happy-dom"` (install `@vitest/browser` or
`happy-dom` as devDependency) to enable DOM tests.

### test agent

Implement `tests/card.test.ts`. Run `npm test`. Zero failures.

### user-review agent

Review:
- Config validation errors shown in the card: are they readable to an end user, or
  do they expose internal type names?
- `getStubConfig` example: is it useful for a first-time user to understand what the
  card does? Does it produce a visible canvas preview when dropped into a dashboard?
- `documentationURL` placeholder: flagged clearly so it's not shipped with
  `YOUR_ORG`?

File issues as numbered list.

### code-review agent

Review:
- `_runSolver` is called on every `set hass` — is there unnecessary work for profiles
  whose relevant entities did not change? (Optimization is out of scope, but flag
  if it will be a problem in practice.)
- `callService` domain/service split: `profile.service.split('.')` — what if the
  service name has more than one `.`? Is `split('.', 2)` safer?
- `updated()` canvas lookup: if two canvas profiles exist, are both canvases found
  and rendered?
- `structuredClone` availability: is this safe in all HA-targeted browsers?
  (HA 2024.4+ runs in modern Chromium; `structuredClone` is available — confirm.)
