import { describe, test, expect } from 'vitest';
import {
  VIEWING_DISTANCE_PRESETS,
  expandViewingDistance,
  selectLayout,
  computeGlyphCoordinates,
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
  test('"far" → max_info_rows: 4, prefer_fewer_icons: true, size_scale: 2.0', () => {
    const profile = makeProfile('far');
    const result = expandViewingDistance(profile);
    // far shows info (user expects text at all distances) and doubles the glyph
    // size on single-size profiles so the zoom effect is always visible.
    expect(result.max_info_rows).toBe(4);
    expect(result.prefer_fewer_icons).toBe(true);
    expect(result.size_scale).toBe(2.0);
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

  test('"close" → prefer_dense: true', () => {
    const profile = makeProfile('close');
    const result = expandViewingDistance(profile);
    expect(result.prefer_dense).toBe(true);
  });
});

describe('3b — expandViewingDistance: far and near have prefer_dense: false', () => {
  test('"far" → prefer_dense: false', () => {
    expect(expandViewingDistance(makeProfile('far')).prefer_dense).toBe(false);
  });
  test('"near" → prefer_dense: false', () => {
    expect(expandViewingDistance(makeProfile('near')).prefer_dense).toBe(false);
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
// 8. selectLayout: far distance — info-requiring layouts are NOT skipped
//
// Previously far had max_info_rows=0 which filtered layouts with info.min>0.
// The user expects text (info) to appear at all viewing distances; far means
// "bigger glyphs", not "no text".  max_info_rows is now 4 for all distances.
// The only filter that drops an info-requiring layout is hasInfo=false.
// ---------------------------------------------------------------------------

describe('8 — selectLayout: far distance, info.min > 0 layout selected when hasInfo=true', () => {
  test('far: layout with info.min=1 IS selected when hasInfo=true (no info suppression)', () => {
    const withInfo: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'medium', cols: 2 },
      info: { min: 1, max: 2 },
    };
    const profile = makeProfile('far', { layouts: [withInfo] });
    const result = selectLayout(profile, 3, true);
    // far no longer suppresses info — layout is found
    expect(result).not.toBeNull();
    expect(result).toEqual(withInfo);
  });

  test('far: layout with info.min=1 is still skipped when hasInfo=false', () => {
    const withInfo: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'medium', cols: 2 },
      info: { min: 1, max: 2 },
    };
    const profile = makeProfile('far', { layouts: [withInfo] });
    const result = selectLayout(profile, 3, false);
    // hasInfo=false → layout requires info that isn't present → null
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
// Viewing-distance layout selection: far / near / close pick different layouts
//
// The stub config (and any real multi-layout profile) declares layouts
// largest-to-smallest. selectLayout must select the appropriate density for
// each viewing distance.
//
// Profile below has large/medium/small (3 sizes).  skip_largest values:
//   far   → skip_largest=0, minSizeIndex=0 → no filter → large wins
//   near  → skip_largest=1, minSizeIndex=1 → large skipped → medium wins
//   close → skip_largest=0 but prefer_dense=true → reverse iteration → small wins
//
// The 2-size variant confirms skip_largest=1 works when 'medium' is not a key
// (the previous max_size='medium' approach silently disabled the filter there).
// ---------------------------------------------------------------------------

describe('selectLayout: far/near/close choose different layouts', () => {
  const threeLayoutProfile = (distance: 'far' | 'near' | 'close'): DisplayProfile => ({
    id: 'multi',
    type: 'canvas',
    screen_px: [256, 256],
    margin_px: [8, 8],
    burn_in_drift: false,
    viewing_distance: distance,
    idle_glyph: 'check_circle',
    glyph_sizes: {
      large:  { px: 96, fits_cols: 2 },
      medium: { px: 48, fits_cols: 3 },
      small:  { px: 24, fits_cols: 4 },
    },
    layouts: [
      { icon: { min: 1, max: 4,  size: 'large',  cols: 2 }, info: { min: 0, max: 0 } },
      { icon: { min: 1, max: 9,  size: 'medium', cols: 3 }, info: { min: 0, max: 2 } },
      { icon: { min: 1, max: 16, size: 'small',  cols: 4 }, info: { min: 0, max: 3 } },
    ],
  });

  test('far → selects large layout (96px)', () => {
    const result = selectLayout(threeLayoutProfile('far'), 1, false);
    expect(result?.icon.size).toBe('large');
  });

  test('near → selects medium layout (48px), skipping large', () => {
    const result = selectLayout(threeLayoutProfile('near'), 1, false);
    expect(result?.icon.size).toBe('medium');
  });

  test('close → selects small layout (24px) via prefer_dense reversal', () => {
    const result = selectLayout(threeLayoutProfile('close'), 1, false);
    expect(result?.icon.size).toBe('small');
  });

  test('all three distances produce different icon sizes', () => {
    const far   = selectLayout(threeLayoutProfile('far'),   1, false)?.icon.size;
    const near  = selectLayout(threeLayoutProfile('near'),  1, false)?.icon.size;
    const close = selectLayout(threeLayoutProfile('close'), 1, false)?.icon.size;
    expect(far).not.toBe(near);
    expect(near).not.toBe(close);
    expect(far).not.toBe(close);
  });

  // 2-size profile: 'large' and 'small', no 'medium'.
  // With the old max_size='medium' approach, indexOf returned -1 → filter disabled →
  // near and far both selected 'large' (no visible difference).
  // With skip_largest=1, near skips the largest regardless of its name.
  const twoLayoutProfile = (distance: 'far' | 'near' | 'close'): DisplayProfile => ({
    id: 'two-size',
    type: 'canvas',
    screen_px: [256, 256],
    margin_px: [8, 8],
    burn_in_drift: false,
    viewing_distance: distance,
    idle_glyph: 'check_circle',
    glyph_sizes: {
      large: { px: 96, fits_cols: 2 },
      small: { px: 24, fits_cols: 4 },
    },
    layouts: [
      { icon: { min: 1, max: 4,  size: 'large', cols: 2 }, info: { min: 0, max: 0 } },
      { icon: { min: 1, max: 16, size: 'small', cols: 4 }, info: { min: 0, max: 3 } },
    ],
  });

  test('2-size profile: far → large', () => {
    expect(selectLayout(twoLayoutProfile('far'), 2, false)?.icon.size).toBe('large');
  });

  test('2-size profile: near → small (skips the only "large" size)', () => {
    expect(selectLayout(twoLayoutProfile('near'), 2, false)?.icon.size).toBe('small');
  });

  test('2-size profile: close → small (prefer_dense reversal)', () => {
    expect(selectLayout(twoLayoutProfile('close'), 2, false)?.icon.size).toBe('small');
  });

  test('2-size profile: far and near produce different sizes', () => {
    const far  = selectLayout(twoLayoutProfile('far'),  2, false)?.icon.size;
    const near = selectLayout(twoLayoutProfile('near'), 2, false)?.icon.size;
    expect(far).not.toBe(near);
  });
});

// ---------------------------------------------------------------------------
// 15b. computeGlyphCoordinates: hasInfo=true forces cols=1 (single-column row layout)
//
// When any entity has info, the solver passes hasInfo=true so that each entity
// gets its own row. This is the structural prerequisite for placing info text
// to the right of its glyph rather than below the icon grid.
// ---------------------------------------------------------------------------

describe('15b — computeGlyphCoordinates: hasInfo=true forces single-column layout', () => {
  test('two entries with hasInfo=true: both in col 0, different rows', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'medium', cols: 2 }, // cols=2 normally
      info: { min: 0, max: 2 },
    };
    const profile = makeProfile('near', { layouts: [layout] });
    const entries = [
      makeEntry({ color: 'red' }),
      makeEntry({ color: 'blue', entityConfig: { id: 'e2', entity_id: 'sensor.b' } }),
    ];
    // hasInfo=true → effectiveCols=1 → both entries in col 0
    const result = computeGlyphCoordinates(profile, layout, entries, undefined, true);
    expect(result).toHaveLength(2);
    expect(result[0].x).toBe(result[1].x);    // same column
    expect(result[0].y).not.toBe(result[1].y); // different rows
  });

  test('two entries with hasInfo=false: different columns (normal grid)', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'medium', cols: 2 },
      info: { min: 0, max: 2 },
    };
    const profile = makeProfile('near', { layouts: [layout] });
    const entries = [
      makeEntry({ color: 'red' }),
      makeEntry({ color: 'blue', entityConfig: { id: 'e2', entity_id: 'sensor.b' } }),
    ];
    // hasInfo=false (default) → effectiveCols=2 → entries in col 0 and col 1
    const result = computeGlyphCoordinates(profile, layout, entries, undefined, false);
    expect(result).toHaveLength(2);
    expect(result[0].x).not.toBe(result[1].x); // different columns
    expect(result[0].y).toBe(result[1].y);      // same row
  });

  test('four entries with hasInfo=true: all in col 0, y increases one cellSize per row', () => {
    const layout: LayoutEntry = {
      icon: { min: 1, max: 8, size: 'medium', cols: 4 }, // cols=4 normally
      info: { min: 0, max: 2 },
    };
    // margin_px=[0,0] so x=0 and y increments are exactly cellSize
    const profile = makeProfile('near', { margin_px: [0, 0], layouts: [layout] });
    const entries = [0, 1, 2, 3].map(i =>
      makeEntry({ entityConfig: { id: `e${i}`, entity_id: `sensor.${i}` } })
    );
    const result = computeGlyphCoordinates(profile, layout, entries, undefined, true);
    expect(result).toHaveLength(4);
    for (const g of result) expect(g.x).toBe(0); // all in col 0
    const cellSize = profile.glyph_sizes['medium'].px; // 32px from makeProfile
    expect(result[0].y).toBe(0);
    expect(result[1].y).toBe(cellSize);
    expect(result[2].y).toBe(cellSize * 2);
    expect(result[3].y).toBe(cellSize * 3);
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

// ---------------------------------------------------------------------------
// 17. computeGlyphCoordinates: single-size profile applies size_scale zoom
//
// When every layout in the profile uses the same icon size, layout selection
// cannot differentiate between viewing distances.  computeGlyphCoordinates
// applies the preset's size_scale multiplier so far/near/close produce a
// visible zoom effect even for single-size profiles.
//
// Scales: far=2.0, near=1.0, close=0.5.
// Multi-size profiles (distinctSizes > 1) get scale=1.0 (no double-scaling).
// ---------------------------------------------------------------------------

describe('17 — computeGlyphCoordinates: single-size profile applies size_scale', () => {
  const singleSizeProfile = (distance: 'far' | 'near' | 'close'): DisplayProfile =>
    makeProfile(distance, {
      margin_px: [0, 0],
      glyph_sizes: { only: { px: 24, fits_cols: 4 } },
      layouts: [{ icon: { min: 1, max: 16, size: 'only', cols: 4 }, info: { min: 0, max: 0 } }],
    });

  const layout: LayoutEntry = {
    icon: { min: 1, max: 16, size: 'only', cols: 4 },
    info: { min: 0, max: 0 },
  };

  test('single-size profile, far: sizePx = declared * 2.0 = 48', () => {
    const result = computeGlyphCoordinates(singleSizeProfile('far'), layout, [makeEntry()]);
    expect(result[0].sizePx).toBe(Math.round(24 * 2.0)); // 48
  });

  test('single-size profile, near: sizePx = declared * 1.0 = 24 (no scaling)', () => {
    const result = computeGlyphCoordinates(singleSizeProfile('near'), layout, [makeEntry()]);
    expect(result[0].sizePx).toBe(24);
  });

  test('single-size profile, close: sizePx = declared * 0.5 = 12', () => {
    const result = computeGlyphCoordinates(singleSizeProfile('close'), layout, [makeEntry()]);
    expect(result[0].sizePx).toBe(Math.round(24 * 0.5)); // 12
  });

  test('single-size profile: far sizePx > near sizePx > close sizePx', () => {
    const far   = computeGlyphCoordinates(singleSizeProfile('far'),   layout, [makeEntry()])[0].sizePx;
    const near  = computeGlyphCoordinates(singleSizeProfile('near'),  layout, [makeEntry()])[0].sizePx;
    const close = computeGlyphCoordinates(singleSizeProfile('close'), layout, [makeEntry()])[0].sizePx;
    expect(far).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(close);
  });

  test('multi-size profile: scale is 1.0 regardless of viewing distance (no double-scaling)', () => {
    // profile has large=48 and small=24 — two distinct sizes → scale=1.0
    const multiSizeLayout: LayoutEntry = { icon: { min: 1, max: 4, size: 'large', cols: 2 }, info: { min: 0, max: 0 } };
    const profile = makeProfile('far', {
      margin_px: [0, 0],
      glyph_sizes: { large: { px: 48, fits_cols: 2 }, small: { px: 24, fits_cols: 4 } },
      layouts: [
        multiSizeLayout,
        { icon: { min: 1, max: 16, size: 'small', cols: 4 }, info: { min: 0, max: 0 } },
      ],
    });
    const result = computeGlyphCoordinates(profile, multiSizeLayout, [makeEntry()]);
    // No scaling: sizePx == declared large=48, not 48*2=96
    expect(result[0].sizePx).toBe(48);
  });
});
