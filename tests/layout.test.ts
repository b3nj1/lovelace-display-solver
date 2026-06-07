import { describe, test, expect } from 'vitest';
import {
  VIEWING_DISTANCE_PRESETS,
  expandViewingDistance,
  selectLayout,
  computeGlyphCoordinates,
  computeInfoCoordinates,
} from '../src/solver/layout.js';
import type { DisplayProfile, LayoutEntry, ActiveEntry } from '../src/solver/types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeProfile = (
  viewing_distance: 'far' | 'near' | 'close',
  overrides?: Partial<DisplayProfile>,
): DisplayProfile => ({
  id: 'test',
  type: 'esphome',
  screen_px: [320, 240],
  margin_px: [8, 8],
  burn_in_drift: false,
  viewing_distance,
  idle_glyph: 'check',
  glyph_sizes: {
    large:  { px: 48, fits_cols: 4 },
    medium: { px: 32, fits_cols: 6 },
    small:  { px: 24, fits_cols: 8 },
    tiny:   { px: 16, fits_cols: 12 },
  },
  layouts: [],
  ...overrides,
});

const makeEntry = (overrides?: Partial<ActiveEntry>): ActiveEntry => ({
  entityConfig: { id: 'e1', entity_id: 'sensor.test' },
  tier: 'warning',
  color: 'red',
  glyphName: 'warning',
  showInfo: false,
  focusMode: false,
  indicatorOnly: false,
  driveZoneIndicator: false,
  ...overrides,
});

// A simple layout usable in multiple tests
const baseLayout: LayoutEntry = {
  icon: { min: 1, max: 8, size: 'medium', cols: 2 },
  info: { min: 0, max: 2 },
};

// ---------------------------------------------------------------------------
// 1. expandViewingDistance: "far" profile
// ---------------------------------------------------------------------------

describe('1 — expandViewingDistance: far', () => {
  test('"far" → max_info_rows: 0, prefer_fewer_icons: true', () => {
    const profile = makeProfile('far');
    const result = expandViewingDistance(profile);
    expect(result.max_info_rows).toBe(0);
    expect(result.prefer_fewer_icons).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. expandViewingDistance: "near" profile
// ---------------------------------------------------------------------------

describe('2 — expandViewingDistance: near', () => {
  test('"near" → max_info_rows: 4', () => {
    const profile = makeProfile('near');
    const result = expandViewingDistance(profile);
    expect(result.max_info_rows).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 3. expandViewingDistance: "close" profile
// ---------------------------------------------------------------------------

describe('3 — expandViewingDistance: close', () => {
  test('"close" → max_info_rows: 6', () => {
    const profile = makeProfile('close');
    const result = expandViewingDistance(profile);
    expect(result.max_info_rows).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// 4. selectLayout: 1 icon, far profile with only info.min: 0 layouts
// ---------------------------------------------------------------------------

describe('4 — selectLayout: 1 icon, far profile, layout with info.min: 0', () => {
  test('matches layout with icon.min <= 1 <= icon.max', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 4, size: 'medium', cols: 2 },
      info: { min: 0, max: 0 },
    };
    const profile = makeProfile('far', { layouts: [layout] });
    const result = selectLayout(profile, 1, false);
    expect(result).not.toBeNull();
    expect(result).toEqual(layout);
  });
});

// ---------------------------------------------------------------------------
// 5. selectLayout: 5 icons, layout with icon.max: 4 is skipped
// ---------------------------------------------------------------------------

describe('5 — selectLayout: 5 icons, layout with icon.max: 4 skipped', () => {
  test('next layout with icon.max >= 5 is selected', () => {
    const tooSmall: LayoutEntry = {
      icon: { min: 1, max: 4, size: 'tiny', cols: 2 },
      info: { min: 0, max: 0 },
    };
    const fits: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'tiny', cols: 4 },
      info: { min: 0, max: 2 },
    };
    const profile = makeProfile('near', { layouts: [tooSmall, fits] });
    const result = selectLayout(profile, 5, false);
    expect(result).not.toBeNull();
    expect(result).toEqual(fits);
  });
});

// ---------------------------------------------------------------------------
// 6. selectLayout: hasInfo: false, layout has info.min: 1 → skipped
// ---------------------------------------------------------------------------

describe('6 — selectLayout: hasInfo: false, layout requires info', () => {
  test('layout with info.min: 1 skipped when hasInfo is false; returns null or next', () => {
    const requiresInfo: LayoutEntry = {
      icon: { min: 1, max: 4, size: 'medium', cols: 2 },
      info: { min: 1, max: 2 },
    };
    const profile = makeProfile('near', { layouts: [requiresInfo] });
    const result = selectLayout(profile, 2, false);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 7. selectLayout: no matching layout → null
// ---------------------------------------------------------------------------

describe('7 — selectLayout: no matching layout → null', () => {
  test('returns null when no layout matches icon count', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 2, size: 'medium', cols: 2 },
      info: { min: 0, max: 0 },
    };
    const profile = makeProfile('near', { layouts: [layout] });
    const result = selectLayout(profile, 10, false);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 8. selectLayout: far distance, layout with info.min > 0 → skipped
// ---------------------------------------------------------------------------

describe('8 — selectLayout: far distance, info.min > 0 layout skipped', () => {
  test('layout requiring info skipped even if icon count matches', () => {
    const withInfo: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'medium', cols: 2 },
      info: { min: 1, max: 2 },
    };
    const profile = makeProfile('far', { layouts: [withInfo] });
    const result = selectLayout(profile, 3, true);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 9. computeGlyphCoordinates: 4 entries in a 2-column layout → row grouping
// ---------------------------------------------------------------------------

describe('9 — computeGlyphCoordinates: 2-column layout row grouping', () => {
  test('entries 0 and 1 share row 0 (same y); entries 2 and 3 share row 1', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'medium', cols: 2 },
      info: { min: 0, max: 2 },
    };
    const profile = makeProfile('near', { layouts: [layout] });
    const entries = [
      makeEntry({ color: 'red' }),
      makeEntry({ color: 'blue', entityConfig: { id: 'e2', entity_id: 'sensor.b' } }),
      makeEntry({ color: 'green', entityConfig: { id: 'e3', entity_id: 'sensor.c' } }),
      makeEntry({ color: 'white', entityConfig: { id: 'e4', entity_id: 'sensor.d' } }),
    ];
    const result = computeGlyphCoordinates(profile, layout, entries);
    expect(result).toHaveLength(4);
    // entries 0 and 1 share the same y (row 0)
    expect(result[0].y).toBe(result[1].y);
    // entries 2 and 3 share the same y (row 1)
    expect(result[2].y).toBe(result[3].y);
    // rows 0 and 1 have different y
    expect(result[0].y).not.toBe(result[2].y);
  });
});

// ---------------------------------------------------------------------------
// 10. computeGlyphCoordinates: indicatorOnly entry not included in output
// ---------------------------------------------------------------------------

describe('10 — computeGlyphCoordinates: indicatorOnly entry excluded', () => {
  test('indicatorOnly entry is not included in output', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'medium', cols: 4 },
      info: { min: 0, max: 2 },
    };
    const profile = makeProfile('near', { layouts: [layout] });
    const entries = [
      makeEntry({ indicatorOnly: false }),
      makeEntry({ indicatorOnly: true, entityConfig: { id: 'e2', entity_id: 'sensor.b' } }),
      makeEntry({ indicatorOnly: false, entityConfig: { id: 'e3', entity_id: 'sensor.c' } }),
    ];
    const result = computeGlyphCoordinates(profile, layout, entries);
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 11. computeGlyphCoordinates: burn_in_drift true, hour=23, minute=59 → shifted
// ---------------------------------------------------------------------------

describe('11 — computeGlyphCoordinates: burn_in_drift true, hour=23, minute=59', () => {
  test('coordinates shifted by margin_px (xOffset = margin_px[0], yOffset = margin_px[1])', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 4, size: 'medium', cols: 2 },
      info: { min: 0, max: 2 },
    };
    const marginX = 8;
    const marginY = 8;
    const profile = makeProfile('near', {
      burn_in_drift: true,
      margin_px: [marginX, marginY],
      layouts: [layout],
    });

    // hour=23, minute=59 → xOffset = floor(23/23 * 8) = 8, yOffset = floor(59/59 * 8) = 8
    const now = new Date('2024-01-15T23:59:00');
    const entries = [makeEntry()];
    const result = computeGlyphCoordinates(profile, layout, entries, now);
    expect(result).toHaveLength(1);

    // originX = margin_px[0] + xOffset = 8 + 8 = 16
    // originY = margin_px[1] + yOffset = 8 + 8 = 16
    const expectedX = marginX + marginX;
    const expectedY = marginY + marginY;
    expect(result[0].x).toBe(expectedX);
    expect(result[0].y).toBe(expectedY);
  });
});

// ---------------------------------------------------------------------------
// 12. computeGlyphCoordinates: burn_in_drift true, hour=0, minute=0 → no shift
// ---------------------------------------------------------------------------

describe('12 — computeGlyphCoordinates: burn_in_drift true, hour=0, minute=0', () => {
  test('no shift (xOffset=0, yOffset=0)', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 4, size: 'medium', cols: 2 },
      info: { min: 0, max: 2 },
    };
    const marginX = 8;
    const marginY = 8;
    const profile = makeProfile('near', {
      burn_in_drift: true,
      margin_px: [marginX, marginY],
      layouts: [layout],
    });

    // hour=0, minute=0 → xOffset = floor(0/23 * 8) = 0, yOffset = floor(0/59 * 8) = 0
    const now = new Date('2024-01-15T00:00:00');
    const entries = [makeEntry()];
    const result = computeGlyphCoordinates(profile, layout, entries, now);
    expect(result).toHaveLength(1);

    // originX = margin_px[0] + 0 = 8
    // originY = margin_px[1] + 0 = 8
    expect(result[0].x).toBe(marginX);
    expect(result[0].y).toBe(marginY);
  });
});

// ---------------------------------------------------------------------------
// 13. computeGlyphCoordinates: burn_in_drift false → no shift regardless of time
// ---------------------------------------------------------------------------

describe('13 — computeGlyphCoordinates: burn_in_drift false → no shift', () => {
  test('no shift regardless of time when burn_in_drift is false', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 4, size: 'medium', cols: 2 },
      info: { min: 0, max: 2 },
    };
    const marginX = 8;
    const marginY = 8;
    const profile = makeProfile('near', {
      burn_in_drift: false,
      margin_px: [marginX, marginY],
      layouts: [layout],
    });

    // Even at hour=23, minute=59 — no drift since burn_in_drift is false
    const now = new Date('2024-01-15T23:59:00');
    const entries = [makeEntry()];
    const result = computeGlyphCoordinates(profile, layout, entries, now);
    expect(result).toHaveLength(1);

    // originX = margin_px[0] + 0 = 8
    // originY = margin_px[1] + 0 = 8
    expect(result[0].x).toBe(marginX);
    expect(result[0].y).toBe(marginY);
  });
});

// ---------------------------------------------------------------------------
// 14. computeGlyphCoordinates throws on unknown icon.size
// ---------------------------------------------------------------------------

describe('14 — computeGlyphCoordinates: throws on unknown icon.size', () => {
  test('throws when layout.icon.size is not in glyph_sizes', () => {
    const profile = makeProfile('near');
    const layout: LayoutEntry = { icon: { min: 1, max: 4, size: 'nonexistent', cols: 2 }, info: { min: 0, max: 0 } };
    expect(() => computeGlyphCoordinates(profile, layout, [makeEntry()])).toThrow(
      /nonexistent/
    );
  });
});

// ---------------------------------------------------------------------------
// Bug 2 regression: info y must be strictly above the glyph baseline
//
// Before the fix, infoOriginY = margin_y + glyphAreaHeight, which is the same
// y-coordinate that drawGlyphs uses as the text baseline.  Both canvas
// fillText calls landed on the same pixel, causing visible overlap.
// The fix adds 14 px of padding so the first info line clears the glyph bottom.
// ---------------------------------------------------------------------------

describe('computeInfoCoordinates: y clears the glyph baseline (overlap regression)', () => {
  test('infoCoords.y > margin_y + glyphAreaHeight for a single 48px icon', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 4, size: 'large', cols: 2 },
      info: { min: 0, max: 2 },
    };
    // margin_y = 8, cellSize = 48, glyphAreaHeight = ceil(1/2)*48 = 48
    const profile = makeProfile('near', {
      margin_px: [8, 8],
      glyph_sizes: { large: { px: 48, fits_cols: 2 } },
      layouts: [layout],
    });
    const glyphAreaHeight = Math.ceil(1 / layout.icon.cols) * 48; // 48
    const coords = computeInfoCoordinates(profile, layout, 1);
    const glyphBaseline = profile.margin_px[1] + glyphAreaHeight; // 56
    expect(coords.y).toBeGreaterThan(glyphBaseline);
  });

  test('infoCoords.y > margin_y + glyphAreaHeight for multiple icon rows', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'large', cols: 2 },
      info: { min: 0, max: 2 },
    };
    // 4 icons, 2 cols → 2 rows of 48px → glyphAreaHeight = 96
    const profile = makeProfile('near', {
      margin_px: [8, 8],
      glyph_sizes: { large: { px: 48, fits_cols: 2 } },
      layouts: [layout],
    });
    const glyphAreaHeight = Math.ceil(4 / layout.icon.cols) * 48; // 96
    const coords = computeInfoCoordinates(profile, layout, 4);
    const glyphBaseline = profile.margin_px[1] + glyphAreaHeight; // 104
    expect(coords.y).toBeGreaterThan(glyphBaseline);
  });
});

// ---------------------------------------------------------------------------
// 15. computeInfoCoordinates throws on unknown icon.size
// ---------------------------------------------------------------------------

describe('15 — computeInfoCoordinates: throws on unknown icon.size', () => {
  test('throws when layout.icon.size is not in glyph_sizes (computeInfoCoordinates)', () => {
    const profile = makeProfile('near');
    const layout: LayoutEntry = { icon: { min: 1, max: 4, size: 'nonexistent', cols: 2 }, info: { min: 0, max: 0 } };
    expect(() => computeInfoCoordinates(profile, layout, 2)).toThrow(
      /nonexistent/
    );
  });
});

// ---------------------------------------------------------------------------
// 16. computeGlyphCoordinates: Math.floor applied to coordinates
// ---------------------------------------------------------------------------

describe('16 — computeGlyphCoordinates: Math.floor applied to coordinates', () => {
  test('floors pixel coordinates (non-integer cellSize)', () => {
    // Profile with a non-integer px value to verify Math.floor is applied
    const profile = makeProfile('near', {
      glyph_sizes: {
        large:  { px: 48,   fits_cols: 4  },
        medium: { px: 32,   fits_cols: 6  },
        small:  { px: 24,   fits_cols: 8  },
        tiny:   { px: 16.7, fits_cols: 12 }, // non-integer
      },
      margin_px: [0, 0],
      burn_in_drift: false,
    });
    const layout: LayoutEntry = { icon: { min: 1, max: 4, size: 'tiny', cols: 2 }, info: { min: 0, max: 0 } };
    const entries = [makeEntry(), makeEntry(), makeEntry()];
    const result = computeGlyphCoordinates(profile, layout, entries);
    // All x and y values must be integers
    for (const g of result) {
      expect(Number.isInteger(g.x)).toBe(true);
      expect(Number.isInteger(g.y)).toBe(true);
    }
  });
});
