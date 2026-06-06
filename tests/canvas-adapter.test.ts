// renderToCanvas requires a real DOM (HTMLCanvasElement) and is not unit-tested here.

import { describe, test, expect } from 'vitest';
import { drawGlyphs, drawInfoRows, drawZones, drawSeverityBar } from '../src/adapters/canvas.js';
import { MDI_FALLBACK } from '../src/utils/glyph.js';
import type { DisplayProfile, GlyphEntry, InfoEntry, ZoneEntry, SeverityBarEntry } from '../src/solver/types.js';

type Call = { method: string; args: unknown[] };

function makeMockCtx(): { ctx: CanvasRenderingContext2D; calls: Call[] } {
  const calls: Call[] = [];
  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, prop) => (...args: unknown[]) => {
      calls.push({ method: String(prop), args });
    },
    set: (_target, prop, value) => {
      calls.push({ method: `set:${String(prop)}`, args: [value] });
      return true;
    },
  });
  return { ctx, calls };
}

function makeProfile(overrides?: Partial<DisplayProfile>): DisplayProfile {
  return {
    id: 'test',
    type: 'canvas',
    screen_px: [128, 128],
    margin_px: [4, 4],
    burn_in_drift: false,
    viewing_distance: 'near',
    idle_glyph: 'check_circle',
    glyph_sizes: { large: { px: 48, fits_cols: 2 } },
    layouts: [{ icon: { min: 0, max: 6, size: 'large', cols: 2 }, info: { min: 0, max: 3 } }],
    ...overrides,
  } as DisplayProfile;
}

describe('drawGlyphs', () => {
  test('1 glyph → fillText called once with correct args', () => {
    const { ctx, calls } = makeMockCtx();
    const glyph: GlyphEntry = { codepoint: 'A', x: 10, y: 20, sizePx: 48, r: 255, g: 0, b: 0 };
    drawGlyphs(ctx, [glyph]);

    const fillTextCalls = calls.filter(c => c.method === 'fillText');
    expect(fillTextCalls).toHaveLength(1);
    expect(fillTextCalls[0].args[0]).toBe('A');
    expect(fillTextCalls[0].args[1]).toBe(10);
  });

  test('y position = entry.y + entry.sizePx (baseline offset)', () => {
    const { ctx, calls } = makeMockCtx();
    const glyph: GlyphEntry = { codepoint: 'A', x: 10, y: 20, sizePx: 48, r: 255, g: 0, b: 0 };
    drawGlyphs(ctx, [glyph]);

    const fillTextCalls = calls.filter(c => c.method === 'fillText');
    expect(fillTextCalls[0].args[2]).toBe(20 + 48);
  });

  test('MDI_FALLBACK codepoint → font set to "Material Design Icons"', () => {
    const { ctx, calls } = makeMockCtx();
    const glyph: GlyphEntry = { codepoint: MDI_FALLBACK, x: 0, y: 0, sizePx: 24, r: 255, g: 255, b: 255 };
    drawGlyphs(ctx, [glyph]);

    const fontCalls = calls.filter(c => c.method === 'set:font');
    const hasMDI = fontCalls.some(c => typeof c.args[0] === 'string' && c.args[0].includes('Material Design Icons'));
    expect(hasMDI).toBe(true);
  });
});

describe('drawInfoRows', () => {
  test('1 info entry → fillText called once', () => {
    const { ctx, calls } = makeMockCtx();
    const info: InfoEntry = { text: 'hello', x: 5, y: 15, r: 200, g: 200, b: 200 };
    drawInfoRows(ctx, [info]);

    const fillTextCalls = calls.filter(c => c.method === 'fillText');
    expect(fillTextCalls).toHaveLength(1);
  });
});

describe('drawZones', () => {
  test('filled_rectangle → fillRect called with correct dimensions', () => {
    const { ctx, calls } = makeMockCtx();
    const zone: ZoneEntry = { zoneId: 'z1', x: 0, y: 0, w: 10, h: 5, r: 100, g: 100, b: 100, shape: 'filled_rectangle' };
    drawZones(ctx, [zone]);

    const fillRectCalls = calls.filter(c => c.method === 'fillRect');
    expect(fillRectCalls).toHaveLength(1);
    expect(fillRectCalls[0].args).toEqual([0, 0, 10, 5]);
  });

  test('filled_circle → arc path called (beginPath, arc, fill)', () => {
    const { ctx, calls } = makeMockCtx();
    const zone: ZoneEntry = { zoneId: 'z2', x: 10, y: 10, w: 20, h: 20, r: 0, g: 255, b: 0, shape: 'filled_circle' };
    drawZones(ctx, [zone]);

    const methods = calls.map(c => c.method);
    expect(methods).toContain('beginPath');
    expect(methods).toContain('arc');
    expect(methods).toContain('fill');

    const arcCall = calls.find(c => c.method === 'arc');
    expect(arcCall).toBeDefined();
    // center = (x + w/2, y + h/2) = (20, 20), radius = w/2 = 10
    expect(arcCall!.args[0]).toBe(20);
    expect(arcCall!.args[1]).toBe(20);
    expect(arcCall!.args[2]).toBe(10);
  });
});

describe('drawSeverityBar', () => {
  test('non-null bar → fillRect called', () => {
    const { ctx, calls } = makeMockCtx();
    const bar: SeverityBarEntry = { x: 0, y: 120, w: 128, h: 4, r: 255, g: 128, b: 0 };
    const profile = makeProfile({
      severity_bar: { edge: 'bottom', thickness_px: 4, color: 'red', hide_when_idle: true },
    });
    drawSeverityBar(ctx, bar, profile);

    const fillRectCalls = calls.filter(c => c.method === 'fillRect');
    expect(fillRectCalls).toHaveLength(1);
  });

  test('null bar with hide_when_idle: true → no draw calls', () => {
    const { ctx, calls } = makeMockCtx();
    const profile = makeProfile({
      severity_bar: { edge: 'bottom', thickness_px: 4, color: 'red', hide_when_idle: true },
    });
    drawSeverityBar(ctx, null, profile);

    expect(calls).toHaveLength(0);
  });

  test('null bar with hide_when_idle: false → strokeRect called', () => {
    const { ctx, calls } = makeMockCtx();
    const profile = makeProfile({
      margin_px: [4, 4],
      screen_px: [128, 128],
      severity_bar: { edge: 'bottom', thickness_px: 4, color: 'red', hide_when_idle: false },
    });
    drawSeverityBar(ctx, null, profile);

    const strokeRectCalls = calls.filter(c => c.method === 'strokeRect');
    expect(strokeRectCalls).toHaveLength(1);
  });
});
