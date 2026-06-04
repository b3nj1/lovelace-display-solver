# Step 14 — Visual Config Editor (`editor.ts`)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` lines 1080–1125
- Implementation Steps index: `esphome_display_solver_plan.md` lines 1127–1145

## Plan section references

- Visual editor (lazy-loaded): CLAUDE.md "Visual editor" section
- Custom Card API: lines 936–948 (getConfigElement)
- Entity Config Schema: lines 280–452
- Display Profile Schema: lines 128–220
- Tiers, Defaults: lines 311–351
- HA design system: lines 959–963

## Prerequisites

- Step 13 (main card element) complete, `npm run build` and `npm test` passing

## Context

The visual config editor is the HA card UI editor — the panel that opens when a user
clicks "Edit" on the card in the dashboard UI. It must be a separate Lit element
(`display-solver-card-editor`) that is **lazy-loaded**: it is only registered and
downloaded when the user opens the editor, keeping the main bundle small.

The editor emits a `config-changed` event when the user modifies any field. HA
listens for this event and re-runs `setConfig` on the card.

This step prioritizes **user-friendliness** — this is the primary surface where users
configure the card. The user-review agent has the most important role in this step.

## Deliverables

### `src/editor.ts` (replace skeleton from Step 5)

```ts
import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { CardConfig, EntityConfig, DisplayProfile } from './solver/types';

@customElement('display-solver-card-editor')
export class DisplaySolverCardEditor extends LitElement {
  @state() private _config?: CardConfig;

  setConfig(config: CardConfig): void { this._config = config; }

  private _dispatch(config: CardConfig): void {
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }

  render(): TemplateResult { ... }
}
```

#### Editor sections

The editor renders three collapsible sections using HA's `<ha-expansion-panel>`:

**Section 1 — Tiers and Defaults**

- `tiers`: a text input showing tiers as comma-separated values
  (e.g. `critical, alert, status, ambient`). On change, parse and update `config.tiers`.
- `defaults.unavailable_action`: a select with options `hide` and `show`.
- `defaults.show_info`: a checkbox.
- `defaults.color_scale`: a text input showing colors as comma-separated values.

**Section 2 — Entities**

For each entity in `config.entities`, render a row showing:
- `id` (text input)
- `entity_id` (text input, or `<ha-entity-picker>` if available in the HA UI)
- `glyph` (text input)
- `label` (text input, optional)
- An "Edit rules" button that opens an inline rule editor (see below)
- A "Remove" button

An "Add entity" button appends a new entity with default values.

**Rule editor (inline, per-entity):**

For each rule in the entity's `rules` array:
- `when.state` (text input, optional)
- `when.range` (two number inputs: low, high; optional)
- `then.action` (select: `show`, `hide`, `indicator`)
- `then.tier` (select populated from `config.tiers`)
- `then.color` (text input)
- `then.show_info` (checkbox)
- `then.focus_mode` (checkbox)
- Remove rule button

"Add rule" button appends a new rule to the entity.

If the entity has `thresholds` instead of `rules`, show the threshold editor instead:
- For each threshold: `above` (number), `tier` (select), `color` (text, optional)
- "Add threshold" button

**Section 3 — Display Profiles**

For each profile in `config.display_profiles`, render a row showing:
- `id` (text input)
- `type` (select: `canvas`, `esphome`)
- `screen_px` (two number inputs: width, height)
- `service` (text input, shown only when `type === 'esphome'`)
- `viewing_distance` (select: `far`, `near`, `close`)
- `burn_in_drift` (checkbox)
- A "Remove profile" button

"Add profile" button appends a new profile with default values.

Note: the full layout and zone configuration is out of scope for this editor step.
Add a note: "Advanced layout configuration: edit the YAML directly" with a link to
the README.

#### Styling

Use HA component styles:
- `<ha-expansion-panel>` for sections
- `<ha-textfield>` or `<paper-input>` for text inputs (match what HA's own editors use)
- `<ha-select>` for dropdowns
- `<ha-checkbox>` for booleans
- `<ha-icon-button>` for remove/add buttons

All layout spacing should use `--card-gap` and `--spacing-8` CSS variables from
the HA design system.

## Tests (`tests/editor.test.ts`)

Run in happy-dom/jsdom environment.

Required test cases:

1. `setConfig` stores the config
2. `_dispatch` emits `config-changed` event with the config in `detail.config`
3. Changing `defaults.unavailable_action` dispatches updated config with new value
4. Adding a new entity dispatches config with one more entity
5. Removing an entity dispatches config with one fewer entity
6. `config-changed` event has `bubbles: true` and `composed: true`

The visual rendering of the editor (whether the correct HA components are used)
cannot be unit-tested — it requires a real HA frontend. Document this limitation
in the test file.

## Constraints

- The editor is lazy-loaded: it must not be imported by `display-solver-card.ts`
  at module load time. The `getConfigElement` method creates the element by tag name
  (`document.createElement('display-solver-card-editor')`), which only works if the
  editor module has been loaded. The editor should be imported dynamically:
  ```ts
  static getConfigElement(): HTMLElement {
    // Ensure editor module is registered before creating element
    import('./editor');  // fire-and-forget; element registers on load
    return document.createElement('display-solver-card-editor');
  }
  ```
  (Or register the editor in a separate `<script>` block — use whichever approach
  is standard for Lit custom elements in HA custom cards.)
- No `any` types
- Every user-initiated change dispatches `config-changed` immediately (no debounce
  needed — HA handles that)
- The editor must not crash if `config.entities` or `config.display_profiles` is
  undefined or empty

## Agent instructions

### dev agent

Implement `src/editor.ts`. Focus on the three sections described. The rule editor
can be simplified to a single row per rule with the most important fields (action,
tier, color). The full inline editor can be iteratively improved; correctness of the
`config-changed` dispatch is the primary requirement.

### test agent

Implement `tests/editor.test.ts` with all 6 cases. Run `npm test`. Zero failures.

### user-review agent

This is the primary review focus for this step. Review the editor from the perspective
of a HA user who has never seen this card before:

1. Are the section labels clear? Does "Tiers and Defaults" mean anything to a new user?
2. Entity picker: using `<ha-entity-picker>` vs a plain text field — does the entity
   picker work in the HA editor context (it should; HA provides it to custom editors)?
3. "Add entity" and "Add rule" — do they add reasonable defaults so the user does not
   see a blank or broken form?
4. Tier dropdown in the rule editor — is it populated from `config.tiers`? If a user
   has not yet defined tiers, is the dropdown empty or does it show a helpful message?
5. The "Advanced layout: edit YAML directly" note — is there a link to docs? Is this
   acceptable UX for v1 or should basic layout editing be in scope?
6. Is it clear from the editor what a "glyph" is? Should there be placeholder text
   or a link to the glyph reference?

File every issue, including minor UX friction. All must be resolved before sign-off.

### code-review agent

Review:
- `_dispatch` called on every keystroke for text inputs vs. on `change` (blur) —
  which is correct? HA editors typically dispatch on change, not on every keyup.
- Immutability: does each change create a new config object via spread, or does it
  mutate `this._config` directly? Must use spread (`{ ...this._config, entities: [...] }`).
- The `import('./editor')` lazy-load approach: does Rollup handle dynamic imports
  correctly? Verify the output bundles correctly with `npm run build`.
