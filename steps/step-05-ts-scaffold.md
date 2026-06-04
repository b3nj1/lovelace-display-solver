# Step 5 — TypeScript Project Scaffold

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` (anchor: step-discipline) through (anchor: signoff-format)
- Implementation Steps index: `esphome_display_solver_plan.md` (anchor: implementation-steps)

## Plan section references

- Phase 5 goals: (anchor: phase5)
- Toolchain constraints: (anchor: lovelace-card-requirements)
- HACS plugin requirements: (anchor: lovelace-card-requirements)
- HA design system: (anchor: lovelace-card-requirements)
- Custom Card API contract (required methods): (anchor: lovelace-card-requirements)
- Repository layout: CLAUDE.md (project instructions)

## Context

This step creates the TypeScript project skeleton that all later steps (6–15) build
on. Nothing in this step is product logic — it is toolchain, build pipeline, and a
minimal "hello world" card that proves the full build chain works.

The non-negotiable constraint from the plan: Terser must target **ES2022**. Lit 3 uses
native class syntax; any downgrade to ES5 or ES2015 causes
`TypeError: Class constructor cannot be invoked without 'new'` at runtime in HA.

## Deliverables

### `package.json`

Dependencies (exact major versions from CLAUDE.md):
- `lit@^3`
- `typescript@^5`
- `rollup@^4`
- `@rollup/plugin-typescript`
- `rollup-plugin-terser` (or `@rollup/plugin-terser`)
- `tslib`

Dev dependencies:
- `vitest` (test runner — runs in Node, no browser required for solver tests)
- `@types/node`

Scripts:
- `build`: `rollup -c`
- `test`: `vitest run`
- `typecheck`: `tsc --noEmit`

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

`useDefineForClassFields: false` is required for Lit 3 reactive properties to work
correctly with TypeScript decorators.

### `rollup.config.js`

```js
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';  // or rollup-plugin-terser

export default {
  input: 'src/display-solver-card.ts',
  output: {
    file: 'dist/display-solver.js',
    format: 'es',
  },
  plugins: [
    typescript({ compilerOptions: { target: 'ES2022' } }),
    terser({ ecma: 2022, warnings: true }),
  ],
};
```

The `terser({ ecma: 2022 })` line is non-negotiable (anchor: lovelace-card-requirements).

### `hacs.json`

```json
{
  "name": "Display Solver Card",
  "render_readme": false,
  "filename": "display-solver.js",
  "homeassistant": "2024.4.0",
  "hacs": "1.32.0"
}
```

This is verbatim from CLAUDE.md hacs.json section.

### `src/display-solver-card.ts` (skeleton)

A minimal Lit 3 custom element that:
- Extends `LitElement`
- Implements `setConfig(config)` — stores config, throws `Error` on null
- Implements `set hass(hass)` — stores hass, calls `requestUpdate()`
- Implements `getCardSize()` — returns `3`
- Implements `getGridOptions()` — returns `{rows: 3, columns: 4, min_rows: 2, max_rows: 6}`
- `render()` — returns a `<ha-card>` with a placeholder `<p>Display Solver</p>`

Registers the element:
```ts
customElements.define('display-solver-card', DisplaySolverCard);
window.customCards = window.customCards || [];
window.customCards.push({
  type: 'display-solver-card',
  name: 'Display Solver',
  description: 'Priority dashboard for ESPHome and Chromecast displays',
  preview: true,
  documentationURL: 'https://github.com/YOUR_ORG/lovelace-display-solver',
});
```

`YOUR_ORG` is a placeholder; it will be replaced in Step 15.

### `src/editor.ts` (skeleton)

A minimal Lit 3 custom element `DisplaySolverCardEditor`:
- Extends `LitElement`
- Has a `setConfig(config)` method that stores config
- `render()` returns `<p>Editor coming soon</p>`

Registered as `display-solver-card-editor`.

The card's `static getConfigElement()` returns
`document.createElement('display-solver-card-editor')`.

### Build verification

Running `npm run build` must produce `dist/display-solver.js` with no errors and no
TypeScript type errors. The output file must:
- Exist and be non-empty
- Not contain the string `"class "` followed by `"extends"` transpiled to ES5 prototype
  chains (a quick grep confirms ES2022 class syntax is preserved)

### `README.md`

A minimal README containing:
- Project name and one-line description (from CLAUDE.md)
- Installation section: "Install via HACS → Frontend → search 'Display Solver'"
- Placeholder sections for Configuration and Examples (to be filled in later steps)

HACS requires a README to be present at the repo root.

## Tests

```
tests/
└── scaffold.test.ts   # build smoke test
```

`scaffold.test.ts` (runs via vitest):
- Import the built `dist/display-solver.js` output and verify `window.customCards`
  contains an entry with `type: 'display-solver-card'`

Because vitest runs in Node (no real DOM), this test uses a minimal DOM stub or
simply checks that the module can be imported without throwing.

Alternatively, if importing the built bundle is awkward in vitest, verify the build
artifacts exist and are non-empty using Node's `fs` module:

```ts
import { statSync } from 'fs';
test('dist/display-solver.js exists and is non-empty', () => {
  const stat = statSync('dist/display-solver.js');
  expect(stat.size).toBeGreaterThan(0);
});
```

## Constraints

- `target: ES2022` in both tsconfig and rollup — no exceptions
- `useDefineForClassFields: false` in tsconfig — required for Lit 3
- No React, no Vue, no JSX
- `dist/display-solver.js` is the only built artifact; no sourcemaps committed

## Agent instructions

### dev agent

Implement all files listed. Run `npm install`, `npm run build`, and `npm test` and
confirm they all succeed before finishing.

### test agent

Implement `tests/scaffold.test.ts`. Run `npm test` and confirm it passes. Also
manually verify: `npm run typecheck` produces zero errors.

### user-review agent

Review `README.md` for:
- Is the one-line description accurate and clear to a user browsing HACS?
- Is the installation instruction complete? (HACS requires a public GitHub repo —
  does the README mention this?)
- Is it obvious what this card does vs. a generic Lovelace card?

File issues as numbered list.

### code-review agent

Review `rollup.config.js` and `tsconfig.json` for:
- `ecma: 2022` present in terser config
- `useDefineForClassFields: false` present in tsconfig
- No `es5` or `es2015` target anywhere
- `format: 'es'` in rollup output (HACS expects an ES module)
- No unused plugins or dependencies in `package.json`
