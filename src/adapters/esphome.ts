import type { SolverResult, DisplayProfile } from '../solver/types';

export interface ESPhomePayload {
  // glyph grid
  x: number[];
  y: number[];
  r: number[];
  g: number[];
  b: number[];
  glyph: string[];
  glyph_font: number;         // single int: font index for selected layout size
  // info row glyphs
  info_glyph: number[];
  info_glyph_y: number[];
  info_glyph_x: number[];
  info_glyph_r: number[];
  info_glyph_g: number[];
  info_glyph_b: number[];
  // info row text
  info_text: string[];
  info_text_y: number[];
  info_text_x: number[];
  info_text_r: number[];
  info_text_g: number[];
  info_text_b: number[];
  info_scroll: boolean;
  // shapes (zones + severity bar)
  draw_shape: number[];       // shape type integer: 0=filled_rectangle, 1=circle, 2=filled_circle
  draw_shape_x: number[];
  draw_shape_y: number[];
  draw_shape_d2: number[];    // width for rectangle; radius for circle
  draw_shape_d3: number[];    // height for rectangle; unused for circle
  draw_shape_r: number[];
  draw_shape_g: number[];
  draw_shape_b: number[];
  // status
  error: boolean;
}

/**
 * Compute the font index for the given size name within the profile's glyph_sizes.
 * Sizes are sorted largest-to-smallest by px value (largest = index 0).
 * Returns 0 if the size name is not found.
 */
function glyphFontIndex(profile: DisplayProfile, sizeName: string): number {
  // ties in px are broken by insertion order in profile.glyph_sizes
  const sorted = Object.entries(profile.glyph_sizes)
    .sort((a, b) => b[1].px - a[1].px)
    .map(([name]) => name);
  const idx = sorted.indexOf(sizeName);
  if (idx === -1) {
    console.warn(
      `glyphFontIndex: size name "${sizeName}" not found in profile "${profile.id}"; defaulting to index 0`,
    );
    return 0;
  }
  return idx;
}

export function packESPhomePayload(
  result: SolverResult,
  profile: DisplayProfile,
): ESPhomePayload {
  // --- Glyph arrays ---
  const x: number[] = [];
  const y: number[] = [];
  const r: number[] = [];
  const g: number[] = [];
  const b: number[] = [];
  const glyph: string[] = [];

  for (let i = 0; i < result.glyphs.length; i++) {
    const entry = result.glyphs[i];
    x.push(entry.x);
    y.push(entry.y);
    r.push(entry.r);
    g.push(entry.g);
    b.push(entry.b);
    glyph.push(entry.codepoint);
    if (
      x.length !== i + 1 ||
      y.length !== i + 1 ||
      r.length !== i + 1 ||
      g.length !== i + 1 ||
      b.length !== i + 1 ||
      glyph.length !== i + 1
    ) {
      throw new Error(`Glyph array length mismatch at index ${i}`);
    }
  }

  const glyph_font = glyphFontIndex(profile, result.layout.icon.size);

  // --- Info arrays ---
  const info_glyph: number[] = [];
  const info_glyph_x: number[] = [];
  const info_glyph_y: number[] = [];
  const info_glyph_r: number[] = [];
  const info_glyph_g: number[] = [];
  const info_glyph_b: number[] = [];

  const info_text: string[] = [];
  const info_text_x: number[] = [];
  const info_text_y: number[] = [];
  const info_text_r: number[] = [];
  const info_text_g: number[] = [];
  const info_text_b: number[] = [];

  for (let i = 0; i < result.info.length; i++) {
    const entry = result.info[i];
    // InfoEntry has no codepoint field; pack 0 (NUL renders nothing in ESPHome)
    info_glyph.push(0);
    info_glyph_x.push(entry.x);
    info_glyph_y.push(entry.y);
    info_glyph_r.push(entry.r);
    info_glyph_g.push(entry.g);
    info_glyph_b.push(entry.b);
    if (
      info_glyph.length !== i + 1 ||
      info_glyph_x.length !== i + 1 ||
      info_glyph_y.length !== i + 1 ||
      info_glyph_r.length !== i + 1 ||
      info_glyph_g.length !== i + 1 ||
      info_glyph_b.length !== i + 1
    ) {
      throw new Error(`Info glyph array length mismatch at index ${i}`);
    }

    info_text.push(entry.text);
    info_text_x.push(entry.x);
    info_text_y.push(entry.y);
    info_text_r.push(entry.r);
    info_text_g.push(entry.g);
    info_text_b.push(entry.b);
    if (
      info_text.length !== i + 1 ||
      info_text_x.length !== i + 1 ||
      info_text_y.length !== i + 1 ||
      info_text_r.length !== i + 1 ||
      info_text_g.length !== i + 1 ||
      info_text_b.length !== i + 1
    ) {
      throw new Error(`Info text array length mismatch at index ${i}`);
    }
  }

  const info_scroll = result.info.length > result.layout.info.max;

  // --- Shape arrays ---
  const SHAPE_CODES: Record<string, number> = {
    filled_rectangle: 0,
    circle: 1,
    filled_circle: 2,
  };

  const draw_shape: number[] = [];
  const draw_shape_x: number[] = [];
  const draw_shape_y: number[] = [];
  const draw_shape_d2: number[] = [];
  const draw_shape_d3: number[] = [];
  const draw_shape_r: number[] = [];
  const draw_shape_g: number[] = [];
  const draw_shape_b: number[] = [];

  for (let i = 0; i < result.zones.length; i++) {
    const entry = result.zones[i];
    const shapeCode = SHAPE_CODES[entry.shape];
    if (shapeCode === undefined) {
      console.warn(`packESPhomePayload: unknown shape '${entry.shape}' for zone '${entry.zoneId}' — defaulting to 0 (filled_rectangle)`);
    }
    draw_shape.push(shapeCode ?? 0);
    draw_shape_x.push(entry.x);
    draw_shape_y.push(entry.y);
    draw_shape_d2.push(entry.w);
    draw_shape_d3.push(entry.h);
    draw_shape_r.push(entry.r);
    draw_shape_g.push(entry.g);
    draw_shape_b.push(entry.b);
    if (
      draw_shape.length !== i + 1 ||
      draw_shape_x.length !== i + 1 ||
      draw_shape_y.length !== i + 1 ||
      draw_shape_d2.length !== i + 1 ||
      draw_shape_d3.length !== i + 1 ||
      draw_shape_r.length !== i + 1 ||
      draw_shape_g.length !== i + 1 ||
      draw_shape_b.length !== i + 1
    ) {
      throw new Error(`Shape array length mismatch at index ${i}`);
    }
  }

  if (result.severity_bar !== null) {
    const sb = result.severity_bar;
    const i = draw_shape.length;
    draw_shape.push(0); // filled_rectangle = 0
    draw_shape_x.push(sb.x);
    draw_shape_y.push(sb.y);
    draw_shape_d2.push(sb.w);
    draw_shape_d3.push(sb.h);
    draw_shape_r.push(sb.r);
    draw_shape_g.push(sb.g);
    draw_shape_b.push(sb.b);
    if (
      draw_shape.length !== i + 1 ||
      draw_shape_x.length !== i + 1 ||
      draw_shape_y.length !== i + 1 ||
      draw_shape_d2.length !== i + 1 ||
      draw_shape_d3.length !== i + 1 ||
      draw_shape_r.length !== i + 1 ||
      draw_shape_g.length !== i + 1 ||
      draw_shape_b.length !== i + 1
    ) {
      throw new Error(`Shape array length mismatch at severity_bar index ${i}`);
    }
  }

  return {
    x,
    y,
    r,
    g,
    b,
    glyph,
    glyph_font,
    info_glyph,
    info_glyph_y,
    info_glyph_x,
    info_glyph_r,
    info_glyph_g,
    info_glyph_b,
    info_text,
    info_text_y,
    info_text_x,
    info_text_r,
    info_text_g,
    info_text_b,
    info_scroll,
    draw_shape,
    draw_shape_x,
    draw_shape_y,
    draw_shape_d2,
    draw_shape_d3,
    draw_shape_r,
    draw_shape_g,
    draw_shape_b,
    error: result.error,
  };
}
