import { describe, it, expect } from 'vitest';
import { packESPhomePayload } from '../src/adapters/esphome';
import type { SolverResult, DisplayProfile, LayoutEntry } from '../src/solver/types';

// --- Shared fixtures ---

const baseLayout: LayoutEntry = {
  icon: { min: 1, max: 6, size: 'medium', cols: 3 },
  info: { min: 0, max: 2 },
};

const baseProfile: DisplayProfile = {
  id: 'test-profile',
  type: 'esphome',
  screen_px: [320, 240],
  margin_px: [4, 4],
  burn_in_drift: false,
  viewing_distance: 'near',
  idle_glyph: 'home',
  glyph_sizes: {
    large:  { px: 116, fits_cols: 1 },
    medium: { px: 58,  fits_cols: 3 },
    small:  { px: 38,  fits_cols: 4 },
    tiny:   { px: 30,  fits_cols: 6 },
  },
  layouts: [baseLayout],
};

function makeSolverResult(overrides: Partial<SolverResult> = {}): SolverResult {
  return {
    profile_id: 'test-profile',
    glyphs: [],
    info: [],
    zones: [],
    severity_bar: null,
    layout: baseLayout,
    error: false,
    warnings: [],
    page_count: 1,
    ...overrides,
  };
}

// Parse a comma-separated string field back to an array for assertion.
// An empty string returns an empty array.
function parseInts(s: string): number[] {
  if (s === '') return [];
  return s.split(',').map(Number);
}
function parseStrs(s: string, delim = ','): string[] {
  if (s === '') return [];
  return s.split(delim);
}

// --- Tests ---

describe('packESPhomePayload', () => {

  it('test 1: 2 glyphs, 1 info line, 1 zone — all arrays populated with correct lengths', () => {
    const result = makeSolverResult({
      glyphs: [
        { codepoint: '', x: 10, y: 20, sizePx: 58, r: 255, g: 0, b: 0 },
        { codepoint: '', x: 70, y: 20, sizePx: 58, r: 0, g: 255, b: 0 },
      ],
      info: [
        { text: 'CO2: 900ppm', x: 0, y: 180, r: 200, g: 200, b: 200 },
      ],
      zones: [
        { zoneId: 'living', x: 0, y: 0, w: 10, h: 10, r: 255, g: 128, b: 0, shape: 'filled_rectangle' },
      ],
    });

    const payload = packESPhomePayload(result, baseProfile);

    // Glyph arrays: 2 elements each
    expect(parseInts(payload.x)).toHaveLength(2);
    expect(parseInts(payload.y)).toHaveLength(2);
    expect(parseInts(payload.r)).toHaveLength(2);
    expect(parseInts(payload.g)).toHaveLength(2);
    expect(parseInts(payload.b)).toHaveLength(2);
    expect(parseInts(payload.glyph)).toHaveLength(2);

    // Info arrays: 1 element each
    expect(parseStrs(payload.info_text, '|')).toHaveLength(1);
    expect(parseInts(payload.info_text_x)).toHaveLength(1);
    expect(parseInts(payload.info_text_y)).toHaveLength(1);
    expect(parseInts(payload.info_text_r)).toHaveLength(1);
    expect(parseInts(payload.info_text_g)).toHaveLength(1);
    expect(parseInts(payload.info_text_b)).toHaveLength(1);
    expect(parseInts(payload.info_glyph)).toHaveLength(1);
    expect(parseInts(payload.info_glyph_x)).toHaveLength(1);
    expect(parseInts(payload.info_glyph_y)).toHaveLength(1);
    expect(parseInts(payload.info_glyph_r)).toHaveLength(1);
    expect(parseInts(payload.info_glyph_g)).toHaveLength(1);
    expect(parseInts(payload.info_glyph_b)).toHaveLength(1);

    // Shape arrays: 1 zone
    expect(parseInts(payload.draw_shape)).toHaveLength(1);
    expect(parseInts(payload.draw_shape_x)).toHaveLength(1);
    expect(parseInts(payload.draw_shape_y)).toHaveLength(1);
    expect(parseInts(payload.draw_shape_d2)).toHaveLength(1);
    expect(parseInts(payload.draw_shape_d3)).toHaveLength(1);
    expect(parseInts(payload.draw_shape_r)).toHaveLength(1);
    expect(parseInts(payload.draw_shape_g)).toHaveLength(1);
    expect(parseInts(payload.draw_shape_b)).toHaveLength(1);

    expect(payload.error).toBe(false);
  });

  it('test 2: idle result — all arrays empty strings, glyph_font = 1, error = false', () => {
    const result = makeSolverResult({
      glyphs: [],
      info: [],
      zones: [],
      severity_bar: null,
      layout: { icon: { min: 0, max: 6, size: 'medium', cols: 3 }, info: { min: 0, max: 2 } },
    });

    const payload = packESPhomePayload(result, baseProfile);

    expect(payload.x).toBe('');
    expect(payload.y).toBe('');
    expect(payload.r).toBe('');
    expect(payload.g).toBe('');
    expect(payload.b).toBe('');
    expect(payload.glyph).toBe('');
    expect(payload.glyph_font).toBe(1); // medium is index 1 (sorted: large=0, medium=1)
    expect(payload.info_glyph).toBe('');
    expect(payload.info_text).toBe('');
    expect(payload.draw_shape).toBe('');
    expect(payload.error).toBe(false);
  });

  it('test 3: severity bar present — shape arrays have zones + 1 elements', () => {
    const result = makeSolverResult({
      zones: [
        { zoneId: 'kitchen', x: 5, y: 5, w: 15, h: 15, r: 0, g: 0, b: 255, shape: 'circle' },
      ],
      severity_bar: { x: 0, y: 236, w: 320, h: 4, r: 255, g: 0, b: 0 },
    });

    const payload = packESPhomePayload(result, baseProfile);

    // 1 zone + 1 severity bar = 2 shapes
    expect(parseInts(payload.draw_shape)).toHaveLength(2);
    expect(parseInts(payload.draw_shape_x)).toHaveLength(2);
    expect(parseInts(payload.draw_shape_y)).toHaveLength(2);
    expect(parseInts(payload.draw_shape_d2)).toHaveLength(2);
    expect(parseInts(payload.draw_shape_d3)).toHaveLength(2);
    expect(parseInts(payload.draw_shape_r)).toHaveLength(2);
    expect(parseInts(payload.draw_shape_g)).toHaveLength(2);
    expect(parseInts(payload.draw_shape_b)).toHaveLength(2);

    // The last shape must be the severity bar (filled_rectangle = integer code 0)
    const shapes = parseInts(payload.draw_shape);
    const shapeY = parseInts(payload.draw_shape_y);
    const shapeD2 = parseInts(payload.draw_shape_d2);
    const shapeD3 = parseInts(payload.draw_shape_d3);
    expect(shapes[1]).toBe(0);
    expect(shapeY[1]).toBe(236);
    expect(shapeD2[1]).toBe(320);
    expect(shapeD3[1]).toBe(4);
  });

  it('test 4: info_scroll = true when info.length > layout.info.max', () => {
    const layout: LayoutEntry = { icon: { min: 0, max: 6, size: 'medium', cols: 3 }, info: { min: 0, max: 2 } };
    const result = makeSolverResult({
      layout,
      info: [
        { text: 'Line 1', x: 0, y: 160, r: 255, g: 255, b: 255 },
        { text: 'Line 2', x: 0, y: 180, r: 255, g: 255, b: 255 },
        { text: 'Line 3', x: 0, y: 200, r: 255, g: 255, b: 255 },
      ],
    });

    const payload = packESPhomePayload(result, baseProfile);

    expect(payload.info_scroll).toBe(true);
  });

  it('test 5: info_scroll = false when info.length <= layout.info.max', () => {
    const layout: LayoutEntry = { icon: { min: 0, max: 6, size: 'medium', cols: 3 }, info: { min: 0, max: 2 } };
    const result = makeSolverResult({
      layout,
      info: [
        { text: 'Line 1', x: 0, y: 160, r: 255, g: 255, b: 255 },
        { text: 'Line 2', x: 0, y: 180, r: 255, g: 255, b: 255 },
      ],
    });

    const payload = packESPhomePayload(result, baseProfile);

    expect(payload.info_scroll).toBe(false);
  });

  it('test 6: glyph_font index — profile with 4 sizes; layout uses "medium" → glyph_font = 1', () => {
    // Sizes sorted largest-to-smallest by px: large(116)=0, medium(58)=1, small(38)=2, tiny(30)=3
    const profile: DisplayProfile = {
      ...baseProfile,
      glyph_sizes: {
        large:  { px: 116, fits_cols: 1 },
        medium: { px: 58,  fits_cols: 3 },
        small:  { px: 38,  fits_cols: 4 },
        tiny:   { px: 30,  fits_cols: 6 },
      },
    };
    const layout: LayoutEntry = { icon: { min: 1, max: 6, size: 'medium', cols: 3 }, info: { min: 0, max: 2 } };
    const result = makeSolverResult({ layout });

    const payload = packESPhomePayload(result, profile);

    expect(payload.glyph_font).toBe(1);
  });

  it('test 7: array length invariant — all serialized arrays within each group have equal element counts', () => {
    const result = makeSolverResult({
      glyphs: [
        { codepoint: '', x: 10, y: 20, sizePx: 58, r: 255, g: 0, b: 0 },
        { codepoint: '', x: 70, y: 20, sizePx: 58, r: 0, g: 255, b: 0 },
        { codepoint: '', x: 130, y: 20, sizePx: 58, r: 0, g: 0, b: 255 },
      ],
      info: [
        { text: 'Alert A', x: 0, y: 160, r: 200, g: 200, b: 200 },
        { text: 'Alert B', x: 0, y: 180, r: 200, g: 200, b: 200 },
      ],
      zones: [
        { zoneId: 'z1', x: 0, y: 0, w: 8, h: 8, r: 255, g: 0, b: 0, shape: 'filled_rectangle' },
        { zoneId: 'z2', x: 300, y: 0, w: 8, h: 8, r: 0, g: 0, b: 255, shape: 'filled_circle' },
      ],
      severity_bar: { x: 0, y: 236, w: 200, h: 4, r: 255, g: 128, b: 0 },
    });

    const p = packESPhomePayload(result, baseProfile);

    // Glyph group: all same element count
    const glyphLen = parseInts(p.x).length;
    expect(parseInts(p.y)).toHaveLength(glyphLen);
    expect(parseInts(p.r)).toHaveLength(glyphLen);
    expect(parseInts(p.g)).toHaveLength(glyphLen);
    expect(parseInts(p.b)).toHaveLength(glyphLen);
    expect(parseInts(p.glyph)).toHaveLength(glyphLen);

    // Info glyph group: all same element count
    const infoLen = parseInts(p.info_glyph).length;
    expect(parseInts(p.info_glyph_x)).toHaveLength(infoLen);
    expect(parseInts(p.info_glyph_y)).toHaveLength(infoLen);
    expect(parseInts(p.info_glyph_r)).toHaveLength(infoLen);
    expect(parseInts(p.info_glyph_g)).toHaveLength(infoLen);
    expect(parseInts(p.info_glyph_b)).toHaveLength(infoLen);

    // Info text group: all same element count
    expect(parseStrs(p.info_text, '|')).toHaveLength(infoLen);
    expect(parseInts(p.info_text_x)).toHaveLength(infoLen);
    expect(parseInts(p.info_text_y)).toHaveLength(infoLen);
    expect(parseInts(p.info_text_r)).toHaveLength(infoLen);
    expect(parseInts(p.info_text_g)).toHaveLength(infoLen);
    expect(parseInts(p.info_text_b)).toHaveLength(infoLen);

    // Shape group: 2 zones + 1 severity bar = 3
    const shapeLen = parseInts(p.draw_shape).length;
    expect(shapeLen).toBe(3);
    expect(parseInts(p.draw_shape_x)).toHaveLength(shapeLen);
    expect(parseInts(p.draw_shape_y)).toHaveLength(shapeLen);
    expect(parseInts(p.draw_shape_d2)).toHaveLength(shapeLen);
    expect(parseInts(p.draw_shape_d3)).toHaveLength(shapeLen);
    expect(parseInts(p.draw_shape_r)).toHaveLength(shapeLen);
    expect(parseInts(p.draw_shape_g)).toHaveLength(shapeLen);
    expect(parseInts(p.draw_shape_b)).toHaveLength(shapeLen);
  });

  it('test 8: error = true in SolverResult → ESPhomePayload.error === true', () => {
    const result = makeSolverResult({
      error: true,
      errorReason: 'Entity not found',
    });

    const payload = packESPhomePayload(result, baseProfile);

    expect(payload.error).toBe(true);
  });

  it('test 9: page-slice regression — 1-page result produces same output as pre-paging behavior', () => {
    const result = makeSolverResult({
      page_count: 1,
      glyphs: [
        { codepoint: '', x: 20, y: 20, sizePx: 58, r: 100, g: 150, b: 200 },  // garage U+E714
        { codepoint: '', x: 80, y: 20, sizePx: 58, r: 50, g: 75, b: 100 },   // door_open U+E77C
      ],
      info: [
        { text: 'Status OK', x: 0, y: 160, r: 128, g: 128, b: 128 },
      ],
    });

    const payload = packESPhomePayload(result, baseProfile);

    // All glyphs must appear in the output (no slicing) — 2 comma-separated codepoints
    const glyphs = parseInts(payload.glyph);
    expect(glyphs).toHaveLength(2);
    // Codepoints must be non-zero integers
    expect(glyphs[0]).toBeGreaterThan(0);
    expect(glyphs[1]).toBeGreaterThan(0);

    // Info must appear in full as pipe-separated string
    const infoTexts = parseStrs(payload.info_text, '|');
    expect(infoTexts).toHaveLength(1);
    expect(infoTexts[0]).toBe('Status OK');

    // Coordinate values must be preserved exactly
    const xs = parseInts(payload.x);
    const ys = parseInts(payload.y);
    expect(xs[0]).toBe(20);
    expect(xs[1]).toBe(80);
    expect(ys[0]).toBe(20);

    expect(payload.error).toBe(false);
  });

  it('test 10: glyph codepoints are serialized as decimal integers, not raw characters', () => {
    // U+E714 = garage icon (59156 decimal). Verifies the codepoint-to-int conversion path.
    const garageChar = '';
    const result = makeSolverResult({
      glyphs: [
        { codepoint: garageChar, x: 0, y: 0, sizePx: 58, r: 255, g: 255, b: 255 },
      ],
    });

    const payload = packESPhomePayload(result, baseProfile);

    const glyphs = parseInts(payload.glyph);
    expect(glyphs).toHaveLength(1);
    expect(glyphs[0]).toBe(garageChar.codePointAt(0));  // 0xE714 = 59156
  });

  it('test 11: info_text uses pipe separator to avoid conflicts with commas in text', () => {
    const result = makeSolverResult({
      info: [
        { text: 'Temp: 23.5°C', x: 0, y: 160, r: 255, g: 255, b: 255 },
        { text: 'CO2: 1,423 ppm', x: 0, y: 180, r: 255, g: 200, b: 200 },
      ],
    });

    const payload = packESPhomePayload(result, baseProfile);

    const texts = parseStrs(payload.info_text, '|');
    expect(texts).toHaveLength(2);
    expect(texts[0]).toBe('Temp: 23.5°C');
    expect(texts[1]).toBe('CO2: 1,423 ppm');  // comma inside text must survive
  });

});
