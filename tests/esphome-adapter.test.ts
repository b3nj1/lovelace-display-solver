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

// --- Tests ---

describe('packESPhomePayload', () => {

  it('test 1: 2 glyphs, 1 info line, 1 zone — all arrays populated with correct lengths', () => {
    const result = makeSolverResult({
      glyphs: [
        { codepoint: '', x: 10, y: 20, sizePx: 58, r: 255, g: 0, b: 0 },
        { codepoint: '', x: 70, y: 20, sizePx: 58, r: 0, g: 255, b: 0 },
      ],
      info: [
        { text: 'CO2: 900ppm', x: 0, y: 180, r: 200, g: 200, b: 200 },
      ],
      zones: [
        { zoneId: 'living', x: 0, y: 0, w: 10, h: 10, r: 255, g: 128, b: 0, shape: 'filled_rectangle' },
      ],
    });

    const payload = packESPhomePayload(result, baseProfile);

    // Glyph arrays: length 2
    expect(payload.x).toHaveLength(2);
    expect(payload.y).toHaveLength(2);
    expect(payload.r).toHaveLength(2);
    expect(payload.g).toHaveLength(2);
    expect(payload.b).toHaveLength(2);
    expect(payload.glyph).toHaveLength(2);

    // Info arrays: length 1
    expect(payload.info_text).toHaveLength(1);
    expect(payload.info_text_x).toHaveLength(1);
    expect(payload.info_text_y).toHaveLength(1);
    expect(payload.info_text_r).toHaveLength(1);
    expect(payload.info_text_g).toHaveLength(1);
    expect(payload.info_text_b).toHaveLength(1);
    expect(payload.info_glyph).toHaveLength(1);
    expect(payload.info_glyph_x).toHaveLength(1);
    expect(payload.info_glyph_y).toHaveLength(1);
    expect(payload.info_glyph_r).toHaveLength(1);
    expect(payload.info_glyph_g).toHaveLength(1);
    expect(payload.info_glyph_b).toHaveLength(1);

    // Shape arrays: 1 zone
    expect(payload.draw_shape).toHaveLength(1);
    expect(payload.draw_shape_x).toHaveLength(1);
    expect(payload.draw_shape_y).toHaveLength(1);
    expect(payload.draw_shape_d2).toHaveLength(1);
    expect(payload.draw_shape_d3).toHaveLength(1);
    expect(payload.draw_shape_r).toHaveLength(1);
    expect(payload.draw_shape_g).toHaveLength(1);
    expect(payload.draw_shape_b).toHaveLength(1);

    expect(payload.error).toBe(false);
  });

  it('test 2: idle result — all arrays empty, glyph_font = 0, error = false', () => {
    const result = makeSolverResult({
      glyphs: [],
      info: [],
      zones: [],
      severity_bar: null,
      layout: { icon: { min: 0, max: 6, size: 'medium', cols: 3 }, info: { min: 0, max: 2 } },
    });

    const payload = packESPhomePayload(result, baseProfile);

    expect(payload.x).toEqual([]);
    expect(payload.y).toEqual([]);
    expect(payload.r).toEqual([]);
    expect(payload.g).toEqual([]);
    expect(payload.b).toEqual([]);
    expect(payload.glyph).toEqual([]);
    expect(payload.glyph_font).toBe(1); // medium is index 1 (sorted: large=0, medium=1)
    expect(payload.info_glyph).toEqual([]);
    expect(payload.info_text).toEqual([]);
    expect(payload.draw_shape).toEqual([]);
    expect(payload.error).toBe(false);
  });

  it('test 3: severity bar present — shape arrays length = zones + 1', () => {
    const result = makeSolverResult({
      zones: [
        { zoneId: 'kitchen', x: 5, y: 5, w: 15, h: 15, r: 0, g: 0, b: 255, shape: 'circle' },
      ],
      severity_bar: { x: 0, y: 236, w: 320, h: 4, r: 255, g: 0, b: 0 },
    });

    const payload = packESPhomePayload(result, baseProfile);

    // 1 zone + 1 severity bar = 2 shapes
    expect(payload.draw_shape).toHaveLength(2);
    expect(payload.draw_shape_x).toHaveLength(2);
    expect(payload.draw_shape_y).toHaveLength(2);
    expect(payload.draw_shape_d2).toHaveLength(2);
    expect(payload.draw_shape_d3).toHaveLength(2);
    expect(payload.draw_shape_r).toHaveLength(2);
    expect(payload.draw_shape_g).toHaveLength(2);
    expect(payload.draw_shape_b).toHaveLength(2);

    // The last shape must be the severity bar (filled_rectangle = integer code 0)
    expect(payload.draw_shape[1]).toBe(0);
    expect(payload.draw_shape_y[1]).toBe(236);
    expect(payload.draw_shape_d2[1]).toBe(320);
    expect(payload.draw_shape_d3[1]).toBe(4);
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

  it('test 7: array length invariant — output arrays within each group have equal lengths (invariant holds for valid input)', () => {
    // Because packESPhomePayload builds arrays in lock-step from a single loop,
    // the invariant is guaranteed by construction for valid inputs.
    // This test verifies that all array groups in the output have equal lengths,
    // confirming the invariant holds.
    const result = makeSolverResult({
      glyphs: [
        { codepoint: '', x: 10, y: 20, sizePx: 58, r: 255, g: 0, b: 0 },
        { codepoint: '', x: 70, y: 20, sizePx: 58, r: 0, g: 255, b: 0 },
        { codepoint: '', x: 130, y: 20, sizePx: 58, r: 0, g: 0, b: 255 },
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

    // Glyph group: all same length
    const glyphLen = p.x.length;
    expect(p.y).toHaveLength(glyphLen);
    expect(p.r).toHaveLength(glyphLen);
    expect(p.g).toHaveLength(glyphLen);
    expect(p.b).toHaveLength(glyphLen);
    expect(p.glyph).toHaveLength(glyphLen);

    // Info glyph group: all same length
    const infoLen = p.info_glyph.length;
    expect(p.info_glyph_x).toHaveLength(infoLen);
    expect(p.info_glyph_y).toHaveLength(infoLen);
    expect(p.info_glyph_r).toHaveLength(infoLen);
    expect(p.info_glyph_g).toHaveLength(infoLen);
    expect(p.info_glyph_b).toHaveLength(infoLen);

    // Info text group: all same length
    expect(p.info_text).toHaveLength(infoLen);
    expect(p.info_text_x).toHaveLength(infoLen);
    expect(p.info_text_y).toHaveLength(infoLen);
    expect(p.info_text_r).toHaveLength(infoLen);
    expect(p.info_text_g).toHaveLength(infoLen);
    expect(p.info_text_b).toHaveLength(infoLen);

    // Shape group: 2 zones + 1 severity bar = 3
    const shapeLen = p.draw_shape.length;
    expect(shapeLen).toBe(3);
    expect(p.draw_shape_x).toHaveLength(shapeLen);
    expect(p.draw_shape_y).toHaveLength(shapeLen);
    expect(p.draw_shape_d2).toHaveLength(shapeLen);
    expect(p.draw_shape_d3).toHaveLength(shapeLen);
    expect(p.draw_shape_r).toHaveLength(shapeLen);
    expect(p.draw_shape_g).toHaveLength(shapeLen);
    expect(p.draw_shape_b).toHaveLength(shapeLen);
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
    // For a single-page result (page_count = 1), the payload must reflect all glyphs
    // exactly as if paging had never been introduced. This guards against any future
    // paging slice logic accidentally slicing on page_count=1.
    const result = makeSolverResult({
      page_count: 1,
      glyphs: [
        { codepoint: '', x: 20, y: 20, sizePx: 58, r: 100, g: 150, b: 200 },
        { codepoint: '', x: 80, y: 20, sizePx: 58, r: 50, g: 75, b: 100 },
      ],
      info: [
        { text: 'Status OK', x: 0, y: 160, r: 128, g: 128, b: 128 },
      ],
    });

    const payload = packESPhomePayload(result, baseProfile);

    // All glyphs must appear in the output (no slicing)
    expect(payload.glyph).toHaveLength(2);
    expect(payload.glyph[0]).toBe('');
    expect(payload.glyph[1]).toBe('');

    // Info must appear in full
    expect(payload.info_text).toHaveLength(1);
    expect(payload.info_text[0]).toBe('Status OK');

    // Coordinate values must be preserved exactly
    expect(payload.x[0]).toBe(20);
    expect(payload.x[1]).toBe(80);
    expect(payload.y[0]).toBe(20);

    expect(payload.error).toBe(false);
  });

});
