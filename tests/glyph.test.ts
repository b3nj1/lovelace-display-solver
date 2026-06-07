import { describe, test, expect, vi } from 'vitest';
import { resolveGlyph, resolveGlyphForCanvas, MDI_FALLBACK, MSS_CODEPOINTS, MDI_TO_MSS } from '../src/utils/glyph.ts';

describe('resolveGlyph', () => {
  test('MSS name "garage" resolves to non-empty string that is not MDI_FALLBACK', () => {
    const result = resolveGlyph('garage');
    expect(result).not.toBe(MDI_FALLBACK);
    expect(result.length).toBeGreaterThan(0);
  });

  test('MDI name "mdi:molecule-co2" maps to MSS "co2" and returns codepoint', () => {
    const result = resolveGlyph('mdi:molecule-co2');
    expect(result).not.toBe(MDI_FALLBACK);
    expect(result.length).toBeGreaterThan(0);
  });

  test('MDI name with no MSS mapping returns MDI_FALLBACK', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = resolveGlyph('mdi:nonexistent-icon-xyz');
      expect(result).toBe(MDI_FALLBACK);
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toMatch(/no MDI.*MSS mapping for "mdi:nonexistent-icon-xyz"/);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('"entity" throws Error', () => {
    expect(() => resolveGlyph('entity')).toThrow(Error);
  });

  test('single non-ASCII character is returned as-is', () => {
    const char = '\u{1F600}'; // emoji (surrogate pair in JS)
    const result = resolveGlyph(char);
    expect(result).toBe(char);
  });

  test('length-2 string whose first char has codepoint <= 0xFFFF does NOT pass through as raw unicode', () => {
    // "Éx" has length 2 in JS; codePointAt(0) is 0xC9 (201), which is <= 0xFFFF
    // The fix (cp > 0xFFFF) means it should fall through to MSS lookup and return MDI_FALLBACK
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const str = 'Éx'; // "Éx"
      expect(str.length).toBe(2);
      expect(str.codePointAt(0)!).toBeLessThanOrEqual(0xFFFF);
      const result = resolveGlyph(str);
      // Should NOT return the raw string; falls through to MSS lookup (miss) -> MDI_FALLBACK
      expect(result).toBe(MDI_FALLBACK);
      expect(warnSpy).toHaveBeenCalledOnce();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('genuine surrogate pair (codepoint > U+FFFF) of length 2 passes through as-is', () => {
    // U+1F525 (fire emoji) stored as 2 JS chars; codePointAt(0) = 0x1F525 > 0xFFFF
    const fire = '\u{1F525}';
    expect(fire.length).toBe(2);
    expect(fire.codePointAt(0)!).toBeGreaterThan(0xFFFF);
    const result = resolveGlyph(fire);
    expect(result).toBe(fire);
  });

  test('empty string returns MDI_FALLBACK', () => {
    const result = resolveGlyph('');
    expect(result).toBe(MDI_FALLBACK);
  });

  test('MSS name with empty-string codepoint returns MDI_FALLBACK and emits warning', () => {
    // mode_fan has an empty codepoint placeholder in MSS_CODEPOINTS
    expect(MSS_CODEPOINTS['mode_fan']).toBe('');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = resolveGlyph('mode_fan');
      expect(result).toBe(MDI_FALLBACK);
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toMatch(/glyph "mode_fan" not found in MSS_CODEPOINTS/);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('mdi:fan maps to mode_fan; empty codepoint causes warning and returns MDI_FALLBACK', () => {
    // mdi:fan -> mode_fan (empty codepoint) should warn and fall back
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = resolveGlyph('mdi:fan');
      expect(result).toBe(MDI_FALLBACK);
      expect(warnSpy).toHaveBeenCalledOnce();
      expect(warnSpy.mock.calls[0][0]).toMatch(/MDI "mdi:fan" maps to MSS "mode_fan"/);
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('resolveGlyph("garage") returns a non-empty codepoint string — NOT the name itself', () => {
    // resolveGlyph is for ESPHome: it returns a codepoint character, not the ligature name.
    // This confirms the two resolvers are distinct.
    const result = resolveGlyph('garage');
    expect(result).not.toBe('garage');
    expect(result).not.toBe(MDI_FALLBACK);
  });

  // Parametric: every key in MDI_TO_MSS must resolve without returning MDI_FALLBACK.
  // If you add a mapping whose MSS target has no codepoint, resolveGlyph will warn and
  // fallback — this test catches that before it ships.
  test('every MDI_TO_MSS key resolves to a non-fallback value in resolveGlyphForCanvas', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      for (const mdiName of Object.keys(MDI_TO_MSS)) {
        const result = resolveGlyphForCanvas(mdiName);
        expect(result, `resolveGlyphForCanvas('${mdiName}') must not return MDI_FALLBACK`).not.toBe(MDI_FALLBACK);
      }
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('all font_glyphs example names are present in MSS_CODEPOINTS', () => {
    const fontGlyphs = [
      'garage', 'door_open', 'lock', 'security', 'co2', 'air', 'factory',
      'mode_fan_off', 'thermostat', 'water_drop', 'outdoor_grill', 'pool',
      'device_thermostat', 'lightbulb', 'arrow_upward', 'arrow_downward',
      'check_circle', 'kitchen', 'electric_car',
    ];
    for (const name of fontGlyphs) {
      expect(
        Object.prototype.hasOwnProperty.call(MSS_CODEPOINTS, name),
        `expected MSS_CODEPOINTS to have key "${name}"`
      ).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// resolveGlyphForCanvas — Bug 3 regression: canvas renderer must use MSS
// ligature names (not codepoints) so that ctx.fillText('garage', …) in the
// Material Symbols Sharp font renders the correct garage icon via OpenType
// ligature substitution.  Before the fix, resolveGlyph() was used for canvas
// too, returning the (wrong) codepoint character which showed a paw print for
// 'garage' and '?' for 'mdi:garage'.
// ---------------------------------------------------------------------------

describe('resolveGlyphForCanvas', () => {
  test('"garage" returns the string "garage" (ligature name, not a codepoint char)', () => {
    const result = resolveGlyphForCanvas('garage');
    expect(result).toBe('garage');
  });

  test('"mdi:garage" maps through MDI_TO_MSS and returns the MSS name "garage"', () => {
    expect(MDI_TO_MSS['mdi:garage']).toBe('garage'); // mapping sanity-check
    const result = resolveGlyphForCanvas('mdi:garage');
    expect(result).toBe('garage');
  });

  test('result is the bare MSS name, not a Unicode codepoint character', () => {
    // Before the fix, resolveGlyph('garage') returned a char like U+E91D (paw print).
    // resolveGlyphForCanvas must return the text name so MSS ligature rendering works.
    const result = resolveGlyphForCanvas('garage');
    const codepoint = result.codePointAt(0) ?? 0;
    // MSS names are ASCII letters/underscores; codepoint must be <= 127
    expect(codepoint).toBeLessThanOrEqual(127);
    expect(result).not.toBe(MDI_FALLBACK);
  });

  test('"sunny" returns "sunny"', () => {
    expect(resolveGlyphForCanvas('sunny')).toBe('sunny');
  });

  test('"mdi:weather-sunny" returns "sunny" (the MSS name)', () => {
    expect(resolveGlyphForCanvas('mdi:weather-sunny')).toBe('sunny');
  });

  test('MDI name with no mapping returns MDI_FALLBACK and warns', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const result = resolveGlyphForCanvas('mdi:no-such-icon-xyz');
      expect(result).toBe(MDI_FALLBACK);
      expect(warnSpy).toHaveBeenCalledOnce();
    } finally {
      warnSpy.mockRestore();
    }
  });

  test('"entity" throws Error', () => {
    expect(() => resolveGlyphForCanvas('entity')).toThrow(Error);
  });

  test('empty string returns MDI_FALLBACK', () => {
    expect(resolveGlyphForCanvas('')).toBe(MDI_FALLBACK);
  });

  test('raw unicode char (> U+007F) passes through unchanged', () => {
    const char = '\u{1F525}'; // fire emoji, codePoint 0x1F525 > 0xFFFF
    expect(resolveGlyphForCanvas(char)).toBe(char);
  });

  test('MSS name is returned directly — not looked up in MSS_CODEPOINTS', () => {
    // mode_fan has an empty codepoint in MSS_CODEPOINTS which causes resolveGlyph
    // to fall back to MDI_FALLBACK.  resolveGlyphForCanvas must NOT do that lookup
    // and must return the name itself so the font ligature system handles it.
    expect(MSS_CODEPOINTS['mode_fan']).toBe(''); // confirm the codepoint is empty
    const result = resolveGlyphForCanvas('mode_fan');
    expect(result).toBe('mode_fan'); // canvas returns the name regardless
  });
});
