# Step 12 — Canvas Output Adapter (`adapters/canvas.ts`)

## Step discipline reference

- Discipline rules: `esphome_display_solver_plan.md` lines 1080–1125
- Implementation Steps index: `esphome_display_solver_plan.md` lines 1127–1145

## Plan section references

- Font alignment between ESPHome and canvas: lines 568–580
- Output adapters table: lines 222–232
- Severity bar canvas encoding: lines 793–806
- Canvas profile type (`type: canvas`): lines 190–201
- Viewing distance close: lines 113–115

## Prerequisites

- Step 10 (solver pipeline) complete
- Step 11 (ESPHome adapter) complete
- `npm test` passing

## Context

`src/adapters/canvas.ts` renders a `SolverResult` to a `<canvas>` element. This
produces the pixel-accurate in-browser preview of what each physical display shows.

The canvas adapter is the only adapter that touches the DOM. All other solver code
is DOM-free. The adapter is designed so its core draw functions receive an injected
`CanvasRenderingContext2D` — this makes the rendering logic testable with a minimal
canvas mock.

**Font loading**: The canvas adapter loads Material Symbols Sharp from Google Fonts
at the point sizes declared in the display profile's `glyph_sizes`. It must use the
same font as ESPHome compiles in, so the browser preview matches the physical display.

## Deliverables

### `src/adapters/canvas.ts`

```ts
import type { SolverResult, DisplayProfile } from '../solver/types';
import { MDI_FALLBACK } from '../utils/glyph';

export async function renderToCanvas(
  result: SolverResult,
  profile: DisplayProfile,
  canvas: HTMLCanvasElement,
): Promise<void>
```

Steps:

1. Set `canvas.width = profile.screen_px[0]` and `canvas.height = profile.screen_px[1]`.
2. Get `ctx = canvas.getContext('2d')`.
3. Clear canvas: `ctx.fillStyle = '#000'` (black background for OLED accuracy).
4. Load fonts for all sizes in `profile.glyph_sizes` (see font loading below).
5. Draw glyphs (see glyph drawing below).
6. Draw info rows (see info drawing below).
7. Draw zone indicators.
8. Draw severity bar.

#### Font loading

```ts
async function ensureFontsLoaded(
  glyph_sizes: DisplayProfile['glyph_sizes'],
): Promise<void>
```

For each entry in `glyph_sizes`:
- Construct a `FontFace` for `"Material Symbols Sharp"` at `${entry.px}px`.
- The URL is the Google Fonts CSS2 API:
  `https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@${px},400,0,0`
- Call `document.fonts.add(fontFace)` and `fontFace.load()`.
- Cache loaded font faces to avoid re-loading on each render call.

For MDI fallback (when `entry.codepoint === MDI_FALLBACK`):
- Load `"Material Design Icons"` webfont at the required size.
- This is a best-effort fallback; if the font is not available, draw an empty box
  instead of crashing.

Font loading is async. `renderToCanvas` is `async` and awaits `ensureFontsLoaded`.

#### Glyph drawing

For each `GlyphEntry` in `result.glyphs`:
```ts
ctx.font = `${entry.sizePx}px 'Material Symbols Sharp'`;
ctx.fillStyle = `rgb(${entry.r}, ${entry.g}, ${entry.b})`;
ctx.fillText(entry.codepoint, entry.x, entry.y + entry.sizePx);
// y offset by sizePx because canvas fillText y is the baseline, not top-left
```

If `entry.codepoint === MDI_FALLBACK`, use `'Material Design Icons'` font family
instead of `'Material Symbols Sharp'`.

#### Info row drawing

For each `InfoEntry` in `result.info`:
```ts
ctx.font = '12px monospace';   // info text is always 12px monospace for now
ctx.fillStyle = `rgb(${entry.r}, ${entry.g}, ${entry.b})`;
ctx.fillText(entry.text, entry.x, entry.y);
```

#### Zone indicator drawing

For each `ZoneEntry`:
- `shape: 'filled_rectangle'`:
  `ctx.fillRect(entry.x, entry.y, entry.w, entry.h)` in `rgb(r,g,b)`
- `shape: 'circle'` or `'filled_circle'`:
  arc path centered at `(entry.x + entry.w/2, entry.y + entry.h/2)` with radius
  `entry.w / 2`. Fill for `filled_circle`, stroke for `circle`.

#### Severity bar drawing

If `result.severityBar !== null`:
```ts
const bar = result.severityBar;
ctx.fillStyle = `rgb(${bar.r}, ${bar.g}, ${bar.b})`;
ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
```

If `profile.severity_bar?.hide_when_idle === false` and `result.severityBar === null`:
draw an unfilled outline rectangle using the CSS variable `--secondary-background-color`
at the full bar rail extent. This shows the bar position during authoring.

In the canvas context there is no HA CSS variable available; use `'#333333'` as the
fallback color for the rail outline when the variable is not set.

#### Severity bar rail extent

The rail extent (full bar at 100%) mirrors the severity bar pixel rect formula from
Step 10:
- `bottom` edge: `x=margin_px[0]`, `y=screen_px[1]-margin_px[1]-thickness_px`,
  `w=screen_px[0]-2*margin_px[0]`, `h=thickness_px`

### Export the draw pipeline for testing

```ts
export function drawGlyphs(ctx: CanvasRenderingContext2D, glyphs: GlyphEntry[]): void
export function drawInfoRows(ctx: CanvasRenderingContext2D, info: InfoEntry[]): void
export function drawZones(ctx: CanvasRenderingContext2D, zones: ZoneEntry[]): void
export function drawSeverityBar(
  ctx: CanvasRenderingContext2D,
  bar: SeverityBarEntry | null,
  profile: DisplayProfile,
): void
```

Exporting these four functions allows tests to inject a mock `CanvasRenderingContext2D`
without needing a real DOM.

## Tests (`tests/canvas-adapter.test.ts`)

Canvas tests use a mock `CanvasRenderingContext2D` object that records calls:

```ts
// Minimal mock
const calls: {method: string; args: unknown[]}[] = [];
const mockCtx = new Proxy({}, {
  get: (_, prop) => (...args) => calls.push({ method: String(prop), args }),
});
```

Required test cases:

1. `drawGlyphs`: 1 glyph → `fillText` called once with correct args
2. `drawGlyphs`: glyph y position = `entry.y + entry.sizePx` (baseline offset)
3. `drawGlyphs`: `MDI_FALLBACK` codepoint → font set to `'Material Design Icons'`
4. `drawInfoRows`: 1 info entry → `fillText` called once
5. `drawZones`: `filled_rectangle` → `fillRect` called with correct dimensions
6. `drawZones`: `filled_circle` → arc path called (beginPath, arc, fill)
7. `drawSeverityBar`: non-null bar → `fillRect` called
8. `drawSeverityBar`: null bar with `hide_when_idle: true` → no draw calls
9. `drawSeverityBar`: null bar with `hide_when_idle: false` → `strokeRect` called
   (outline for rail)

Note: `renderToCanvas` itself is not unit-testable without a DOM; the exported helper
functions cover the rendering logic. Document this limitation in a comment in the test
file.

## Constraints

- `renderToCanvas` is the only async function (font loading)
- The four draw helpers are synchronous and DOM-testable via mock ctx
- No `any` types
- Font loading caches loaded faces; calling `renderToCanvas` twice for the same
  profile does not reload fonts
- The `--secondary-background-color` fallback `'#333333'` is clearly commented as a
  fallback for the canvas context

## Agent instructions

### dev agent

Implement `src/adapters/canvas.ts`. Note that `document.fonts` is a browser API and
will be `undefined` in the vitest Node environment; guard font loading with
`typeof document !== 'undefined'`.

### test agent

Implement `tests/canvas-adapter.test.ts` with all 9 cases using the mock ctx
approach described. Run `npm test`. Zero failures.

### user-review agent

Review:
- Does the canvas preview look accurate enough for a user to author their config
  visually? The glyph y-offset (`+ sizePx`) positions text at its baseline; is this
  correct for Material Symbols in canvas?
- The info text font is hardcoded to `12px monospace`. Should this be configurable
  per profile? (User question for the future — file as a `TODO` issue, not a blocking issue.)
- `'#333333'` as the severity bar rail color: is this visible on a dark card background
  vs. a light card background? Should the fallback be `currentColor`?

File issues as numbered list.

### code-review agent

Review:
- `ensureFontsLoaded` cache: is the cache keyed correctly (by size, not just family)?
  Two profiles with different `glyph_sizes` must not share cached fonts.
- `document.fonts` guard: correct check for SSR/Node environment?
- `drawGlyphs` y-offset: `entry.y + entry.sizePx` — verify this matches how
  ESPHome renders the glyph (ESPHome typically uses top-left coordinates for `print`).
  If ESPHome uses top-left, the canvas adapter must also use top-left; if ESPHome
  uses baseline, use baseline. They must be consistent.
- `filled_circle` drawing: the proxy args must preserve `(x, y, radius, 0, 2*Math.PI)`
  for a complete circle
