import { describe, test, expect } from 'vitest';
import { solve, solveAll } from '../src/solver/index.js';
import type {
  EntityConfig,
  DisplayProfile,
  StateObject,
  Defaults,
  GroupConfig,
  GlyphResolver,
  LayoutEntry,
} from '../src/solver/types.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const FIXED_NOW = new Date('2024-01-15T00:00:00');

const DEFAULT_TIERS = ['critical', 'alert', 'warning', 'info'];
const DEFAULT_DEFAULTS: Defaults = { unavailable_action: 'hide' };
const NO_GROUPS: GroupConfig[] = [];

/** Stub resolver: returns a predictable codepoint string for any glyph name */
const stubResolver: GlyphResolver = (name: string) => `CP:${name}`;

function makeProfile(overrides?: Partial<DisplayProfile>): DisplayProfile {
  return {
    id: 'test-profile',
    type: 'canvas',
    screen_px: [128, 128],
    margin_px: [4, 4],
    burn_in_drift: false,
    viewing_distance: 'near',
    idle_glyph: 'check_circle',
    glyph_sizes: {
      large:  { px: 48, fits_cols: 2 },
      medium: { px: 24, fits_cols: 4 },
      small:  { px: 16, fits_cols: 6 },
    },
    layouts: [
      // min: 0 so idle (0 active entities) and non-zero both match
      { icon: { min: 0, max: 6, size: 'medium', cols: 2 }, info: { min: 0, max: 3 } },
    ],
    ...overrides,
  };
}

function makeStates(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
): Record<string, StateObject> {
  return { [entityId]: { state, attributes } };
}

function makeActiveConfig(id: string, entityId: string, state: string, tier: string): EntityConfig {
  return {
    id,
    entity_id: entityId,
    glyph: `${id}-glyph`,
    rules: [{ when: { state }, then: { action: 'show', tier } }],
  };
}

// ---------------------------------------------------------------------------
// 1. Single active entity → SolverResult.glyphs has one entry with correct position
// ---------------------------------------------------------------------------

describe('1 — Single active entity → one glyph at correct position', () => {
  test('glyphs has exactly one entry; x and y come from margin + offset 0', () => {
    const config = makeActiveConfig('sensor1', 'sensor.test', 'on', 'warning');
    const states = makeStates('sensor.test', 'on');
    const profile = makeProfile();

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.glyphs).toHaveLength(1);
    // First entry: col=0, row=0 → x = margin_px[0] + 0*cellSize = 4, y = margin_px[1] + 0*cellSize = 4
    expect(result.glyphs[0].x).toBe(4);
    expect(result.glyphs[0].y).toBe(4);
    expect(result.glyphs[0].codepoint).toBe('CP:sensor1-glyph');
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 2. No active entities → idle glyph emitted, centered
// ---------------------------------------------------------------------------

describe('2 — No active entities → idle glyph emitted, centered', () => {
  test('glyphs has one idle entry; x and y are centered', () => {
    const config: EntityConfig = {
      id: 'sensor1',
      entity_id: 'sensor.test',
      glyph: 'home',
      rules: [{ when: { state: 'active' }, then: { action: 'show', tier: 'info' } }],
    };
    // State doesn't match any rule → no active entries
    const states = makeStates('sensor.test', 'idle');
    const profile = makeProfile();

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.glyphs).toHaveLength(1);
    // Idle glyph should use the largest glyph size (48px) and be centered
    // x = floor((128 - 48) / 2) = 40, y = floor((128 - 48) / 2) = 40
    expect(result.glyphs[0].x).toBe(40);
    expect(result.glyphs[0].y).toBe(40);
    expect(result.glyphs[0].codepoint).toBe('CP:check_circle');
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 3. Focus mode: critical-only entries remain after focus mode
// ---------------------------------------------------------------------------

describe('3 — Focus mode: critical entries remain', () => {
  test('entries in critical tier survive focus mode', () => {
    const criticalConfig: EntityConfig = {
      id: 'crit1',
      entity_id: 'sensor.fire',
      glyph: 'fire',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'critical', focus_mode: true } }],
    };
    const criticalConfig2: EntityConfig = {
      id: 'crit2',
      entity_id: 'sensor.alarm',
      glyph: 'alarm',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'critical' } }],
    };
    const warningConfig: EntityConfig = {
      id: 'warn1',
      entity_id: 'sensor.motion',
      glyph: 'motion',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'warning' } }],
    };
    const states: Record<string, StateObject> = {
      'sensor.fire': { state: 'on', attributes: {} },
      'sensor.alarm': { state: 'on', attributes: {} },
      'sensor.motion': { state: 'on', attributes: {} },
    };
    const profile = makeProfile({
      layouts: [
        { icon: { min: 0, max: 6, size: 'medium', cols: 2 }, info: { min: 0, max: 3 } },
      ],
    });

    const result = solve(
      [criticalConfig, criticalConfig2, warningConfig],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    // Both critical entries should be present
    const critGlyphs = result.glyphs.filter(g =>
      g.codepoint === 'CP:fire' || g.codepoint === 'CP:alarm'
    );
    expect(critGlyphs).toHaveLength(2);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 4. Focus mode: non-critical entries suppressed
// ---------------------------------------------------------------------------

describe('4 — Focus mode: non-critical entries suppressed', () => {
  test('warning-tier entries absent from glyphs when focus mode is active', () => {
    const criticalConfig: EntityConfig = {
      id: 'crit1',
      entity_id: 'sensor.fire',
      glyph: 'fire',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'critical', focus_mode: true } }],
    };
    const warningConfig: EntityConfig = {
      id: 'warn1',
      entity_id: 'sensor.motion',
      glyph: 'motion',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'warning' } }],
    };
    const states: Record<string, StateObject> = {
      'sensor.fire': { state: 'on', attributes: {} },
      'sensor.motion': { state: 'on', attributes: {} },
    };
    const profile = makeProfile({
      layouts: [
        { icon: { min: 0, max: 6, size: 'medium', cols: 2 }, info: { min: 0, max: 3 } },
      ],
    });

    const result = solve(
      [criticalConfig, warningConfig],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    // Only the critical glyph should appear; warning is suppressed
    expect(result.glyphs).toHaveLength(1);
    expect(result.glyphs[0].codepoint).toBe('CP:fire');
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Group collapse: overlay → 2 active members → 1 grid slot
// ---------------------------------------------------------------------------

describe('5 — Group collapse: overlay → 1 grid slot', () => {
  test('two active members in overlay group produce 1 glyph entry', () => {
    const groups: GroupConfig[] = [
      { id: 'grp1', collapse: 'overlay', color_policy: 'most_urgent' },
    ];
    const e1: EntityConfig = {
      id: 'member1',
      entity_id: 'sensor.a',
      glyph: 'icon_a',
      group: 'grp1',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'warning' } }],
    };
    const e2: EntityConfig = {
      id: 'member2',
      entity_id: 'sensor.b',
      glyph: 'icon_b',
      group: 'grp1',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'info' } }],
    };
    const states: Record<string, StateObject> = {
      'sensor.a': { state: 'on', attributes: {} },
      'sensor.b': { state: 'on', attributes: {} },
    };

    const result = solve(
      [e1, e2],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      groups,
      makeProfile(),
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.glyphs).toHaveLength(1);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 6. Group collapse: separate → 2 active members → 2 grid slots
// ---------------------------------------------------------------------------

describe('6 — Group collapse: separate → 2 grid slots', () => {
  test('two active members in separate group produce 2 glyph entries', () => {
    const groups: GroupConfig[] = [
      { id: 'grp2', collapse: 'separate', color_policy: 'member' },
    ];
    const e1: EntityConfig = {
      id: 'memberA',
      entity_id: 'sensor.a',
      glyph: 'icon_a',
      group: 'grp2',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'warning' } }],
    };
    const e2: EntityConfig = {
      id: 'memberB',
      entity_id: 'sensor.b',
      glyph: 'icon_b',
      group: 'grp2',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'info' } }],
    };
    const states: Record<string, StateObject> = {
      'sensor.a': { state: 'on', attributes: {} },
      'sensor.b': { state: 'on', attributes: {} },
    };

    const result = solve(
      [e1, e2],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      groups,
      makeProfile(),
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.glyphs).toHaveLength(2);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 7. Info line rendered with value_format and label
// ---------------------------------------------------------------------------

describe('7 — Info line: value_format "{value:.0f} {unit}" with label "CO₂"', () => {
  test('info[0].text is "1500 ppm CO₂"', () => {
    const config: EntityConfig = {
      id: 'co2',
      entity_id: 'sensor.co2',
      glyph: 'co2',
      label: 'CO₂',
      value_format: '{value:.0f} {unit}',
      rules: [{ when: { state: '1500' }, then: { action: 'show', tier: 'warning', show_info: true } }],
    };
    const states: Record<string, StateObject> = {
      'sensor.co2': { state: '1500', attributes: { unit_of_measurement: 'ppm' } },
    };

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      makeProfile(),
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.info).toHaveLength(1);
    expect(result.info[0].text).toBe('1500 ppm CO₂');
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 8. Info line: {unit} absent from attributes → renders as empty string (no crash)
// ---------------------------------------------------------------------------

describe('8 — Info line: missing unit_of_measurement renders as empty string', () => {
  test('no crash; {unit} renders as empty string', () => {
    const config: EntityConfig = {
      id: 'temp',
      entity_id: 'sensor.temp',
      glyph: 'thermometer',
      value_format: '{value:.0f} {unit}',
      rules: [{ when: { state: '72' }, then: { action: 'show', tier: 'info', show_info: true } }],
    };
    const states: Record<string, StateObject> = {
      'sensor.temp': { state: '72', attributes: {} },
    };

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      makeProfile(),
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.info).toHaveLength(1);
    // unit is '' so the format becomes "72  temp" but trimmed → "72  temp"
    // The label fallback is config.id = 'temp'
    expect(result.info[0].text).toContain('72');
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 9. Zone indicator: active entity with zone → ZoneEntry emitted with correct color
// ---------------------------------------------------------------------------

describe('9 — Zone indicator: active entity with zone → ZoneEntry emitted', () => {
  test('zones has one entry with color from the active entry', () => {
    const config: EntityConfig = {
      id: 'window1',
      entity_id: 'binary_sensor.window',
      glyph: 'window',
      zone: 'zone-living',
      rules: [{ when: { state: 'on' }, then: { action: 'indicator', tier: 'warning', color: 'orange' } }],
    };
    const states = makeStates('binary_sensor.window', 'on');
    const profile = makeProfile({
      zones: [
        { id: 'zone-living', position: 'bottom-edge' },
      ],
    });

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].zoneId).toBe('zone-living');
    // orange = {r:255, g:165, b:0}
    expect(result.zones[0].r).toBe(255);
    expect(result.zones[0].g).toBe(165);
    expect(result.zones[0].b).toBe(0);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 10. Zone indicator: inactive entity → no ZoneEntry
// ---------------------------------------------------------------------------

describe('10 — Zone indicator: inactive entity → no ZoneEntry', () => {
  test('zones is empty when entity is not active', () => {
    const config: EntityConfig = {
      id: 'window2',
      entity_id: 'binary_sensor.window',
      glyph: 'window',
      zone: 'zone-living',
      rules: [{ when: { state: 'on' }, then: { action: 'indicator', tier: 'warning', color: 'orange' } }],
    };
    // State is 'off' — rule does not match
    const states = makeStates('binary_sensor.window', 'off');
    const profile = makeProfile({
      zones: [
        { id: 'zone-living', position: 'bottom-edge' },
      ],
    });

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.zones).toHaveLength(0);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 11. Zone indicator: bottom-edge on 128×128 with margin_px [4,4] → correct pixel rect
// ---------------------------------------------------------------------------

describe('11 — Zone indicator: bottom-edge pixel rect on 128×128, margin [4,4]', () => {
  test('x=0, y=124, w=128, h=4 for bottom-edge zone', () => {
    // bottom-edge: frac = { x: 0, y: 1 - my, w: 1.0, h: my }
    // where mx = 4/128 ≈ 0.03125, my = 4/128 ≈ 0.03125
    // pixel: x=0, y=round((1-4/128)*128)=round(124)=124, w=round(1*128)=128, h=round((4/128)*128)=4
    const config: EntityConfig = {
      id: 'zone-sensor',
      entity_id: 'binary_sensor.zone',
      glyph: 'zone',
      zone: 'bottom-zone',
      rules: [{ when: { state: 'on' }, then: { action: 'indicator', tier: 'info', color: 'blue' } }],
    };
    const states = makeStates('binary_sensor.zone', 'on');
    const profile = makeProfile({
      screen_px: [128, 128],
      margin_px: [4, 4],
      zones: [
        { id: 'bottom-zone', position: 'bottom-edge' },
      ],
    });

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.zones).toHaveLength(1);
    const zone = result.zones[0];
    expect(zone.x).toBe(0);
    expect(zone.y).toBe(124);
    expect(zone.w).toBe(128);
    expect(zone.h).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// 12. Severity bar: alert tier (index 1) with 4 tiers → fill_ratio = 0.75
// ---------------------------------------------------------------------------

describe('12 — Severity bar: alert tier (index 1) with 4 tiers → fill_ratio = 0.75', () => {
  test('severity_bar.w reflects fill_ratio = (4 - 1) / 4 = 0.75', () => {
    const config: EntityConfig = {
      id: 'alarm1',
      entity_id: 'sensor.alarm',
      glyph: 'alarm',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'alert', color: 'orange' } }],
    };
    const states = makeStates('sensor.alarm', 'on');
    // screen_px [120, 128], margin_px [4, 4]
    // fill_ratio = 0.75, usable width = 120 - 2*4 = 112
    // expected w = round(0.75 * 112) = 84
    const profile = makeProfile({
      screen_px: [120, 128],
      margin_px: [4, 4],
      severity_bar: {
        edge: 'bottom',
        thickness_px: 4,
        color: 'entity',
        hide_when_idle: true,
      },
    });

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.severity_bar).not.toBeNull();
    const expected_w = Math.round(0.75 * (120 - 2 * 4));
    expect(result.severity_bar!.w).toBe(expected_w);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 13. Severity bar: idle with hide_when_idle: true → null
// ---------------------------------------------------------------------------

describe('13 — Severity bar: idle with hide_when_idle: true → null', () => {
  test('severity_bar is null when active set is empty and hide_when_idle is true', () => {
    const config: EntityConfig = {
      id: 'sensor1',
      entity_id: 'sensor.test',
      glyph: 'home',
      rules: [{ when: { state: 'active' }, then: { action: 'show', tier: 'info' } }],
    };
    // State does not match → no active entries
    const states = makeStates('sensor.test', 'idle');
    const profile = makeProfile({
      severity_bar: {
        edge: 'bottom',
        thickness_px: 4,
        color: 'white',
        hide_when_idle: true,
      },
    });

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.severity_bar).toBeNull();
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 14. Severity bar: idle with hide_when_idle: false → SeverityBarEntry with w=0
// ---------------------------------------------------------------------------

describe('14 — Severity bar: idle with hide_when_idle: false → SeverityBarEntry with w=0', () => {
  test('severity_bar is not null and has w=0 when idle and hide_when_idle is false', () => {
    const config: EntityConfig = {
      id: 'sensor1',
      entity_id: 'sensor.test',
      glyph: 'home',
      rules: [{ when: { state: 'active' }, then: { action: 'show', tier: 'info' } }],
    };
    // State does not match → no active entries
    const states = makeStates('sensor.test', 'idle');
    const profile = makeProfile({
      severity_bar: {
        edge: 'bottom',
        thickness_px: 4,
        color: 'white',
        hide_when_idle: false,
      },
    });

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.severity_bar).not.toBeNull();
    expect(result.severity_bar!.w).toBe(0);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 15. Glyph not in font_glyphs → warning in result.warnings
// ---------------------------------------------------------------------------

describe('15 — Glyph not in font_glyphs → warning in result.warnings', () => {
  test('warnings contains a message about the missing glyph', () => {
    const config = makeActiveConfig('sensor1', 'sensor.test', 'on', 'info');
    const states = makeStates('sensor.test', 'on');
    // font_glyphs does not include 'sensor1-glyph'
    const profile = makeProfile({
      font_glyphs: ['check_circle', 'home', 'alarm'],
    });

    const result = solve(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('sensor1-glyph'))).toBe(true);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 16. No matching layout → result.error === true
// ---------------------------------------------------------------------------

describe('16 — No matching layout → result.error === true', () => {
  test('error is true when no layout can accommodate the icon count', () => {
    const configs = [1, 2, 3, 4, 5, 6, 7, 8].map(i =>
      makeActiveConfig(`s${i}`, `sensor.s${i}`, 'on', 'info')
    );
    const states: Record<string, StateObject> = {};
    for (let i = 1; i <= 8; i++) {
      states[`sensor.s${i}`] = { state: 'on', attributes: {} };
    }
    // Only layout supports max 6 icons; 8 icons → no match
    const profile = makeProfile({
      layouts: [
        { icon: { min: 1, max: 6, size: 'medium', cols: 2 }, info: { min: 0, max: 3 } },
      ],
    });

    const result = solve(
      configs,
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.error).toBe(true);
    expect(result.glyphs).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 17. solveAll: two profiles produce independent results
// ---------------------------------------------------------------------------

describe('17 — solveAll: two profiles produce independent results', () => {
  test('each profile result has the correct profile_id', () => {
    const config = makeActiveConfig('sensor1', 'sensor.test', 'on', 'warning');
    const states = makeStates('sensor.test', 'on');

    const profile1 = makeProfile({ id: 'profile-one' });
    const profile2 = makeProfile({ id: 'profile-two', screen_px: [240, 240] });

    const results = solveAll(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      [profile1, profile2],
      stubResolver,
      {},
      FIXED_NOW,
    );

    expect(results).toHaveLength(2);
    expect(results[0].profile_id).toBe('profile-one');
    expect(results[1].profile_id).toBe('profile-two');
    expect(results[0].error).toBe(false);
    expect(results[1].error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 18. solveAll: no shared mutable state — running twice produces identical results
// ---------------------------------------------------------------------------

describe('18 — solveAll: running twice with same input produces identical results', () => {
  test('second call is identical to first call', () => {
    const config = makeActiveConfig('sensor1', 'sensor.test', 'on', 'warning');
    const states = makeStates('sensor.test', 'on');
    const profile = makeProfile();

    const run = () => solveAll(
      [config],
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      [profile],
      stubResolver,
      {},
      FIXED_NOW,
    );

    const results1 = run();
    const results2 = run();

    expect(results1).toHaveLength(1);
    expect(results2).toHaveLength(1);
    expect(results1[0].glyphs).toEqual(results2[0].glyphs);
    expect(results1[0].error).toBe(results2[0].error);
    expect(results1[0].page_count).toBe(results2[0].page_count);
    expect(results1[0].warnings).toEqual(results2[0].warnings);
  });
});

// ---------------------------------------------------------------------------
// 19. Icon paging: page slicing and currentPage clamping
//
// The solver selects a layout based on total icon count (selectLayout requires
// layout.icon.min <= count <= layout.icon.max). page_count is then computed as
// ceil(totalVisibleIcons / layout.icon.max). Since the layout must satisfy
// count <= max, page_count is always 1 within a single layout. This test
// verifies the page slicing code path: icons are sliced correctly for page 0,
// and an out-of-bounds currentPage is clamped to the last valid page.
// ---------------------------------------------------------------------------

describe('19 — Icon paging: page slicing and currentPage clamping', () => {
  // 4 icons; layout max=6 → page_count = ceil(4/6) = 1
  const configs = [1, 2, 3, 4].map(i =>
    makeActiveConfig(`icon${i}`, `sensor.s${i}`, 'on', 'info')
  );
  const states: Record<string, StateObject> = {};
  for (let i = 1; i <= 4; i++) {
    states[`sensor.s${i}`] = { state: 'on', attributes: {} };
  }
  const profile = makeProfile({
    layouts: [
      { icon: { min: 0, max: 6, size: 'medium', cols: 2 }, info: { min: 0, max: 3 } },
    ],
  });

  test('page_count is 1 for 4 icons with layout max=6', () => {
    const result = solve(
      configs,
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );
    expect(result.page_count).toBe(1);
    expect(result.error).toBe(false);
  });

  test('currentPage=0 returns all 4 icons (page slice [0:6] of 4)', () => {
    const result = solve(
      configs,
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );
    expect(result.glyphs).toHaveLength(4);
  });

  test('out-of-bounds currentPage is clamped to last valid page', () => {
    const result = solve(
      configs,
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      99, // way out of bounds; clamped to 0
      FIXED_NOW,
    );
    // clamped to page 0 → all 4 icons
    expect(result.glyphs).toHaveLength(4);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 20. Icon paging: icon count exactly equals layout.icon.max → page_count = 1
// ---------------------------------------------------------------------------

describe('20 — Icon paging: count equals max → page_count = 1, no paging', () => {
  test('page_count=1 and all icons present when count equals icon.max', () => {
    const configs = [1, 2, 3, 4].map(i =>
      makeActiveConfig(`icon${i}`, `sensor.s${i}`, 'on', 'info')
    );
    const states: Record<string, StateObject> = {};
    for (let i = 1; i <= 4; i++) {
      states[`sensor.s${i}`] = { state: 'on', attributes: {} };
    }
    // 4 icons, max=4: page_count = ceil(4/4) = 1
    const profile = makeProfile({
      layouts: [
        { icon: { min: 0, max: 4, size: 'medium', cols: 2 }, info: { min: 0, max: 3 } },
      ],
    });

    const result = solve(
      configs,
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.page_count).toBe(1);
    expect(result.glyphs).toHaveLength(4);
    expect(result.error).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 21. Icon paging: error: true only when no layout matches, not when icons fit
// ---------------------------------------------------------------------------

describe('21 — error: true only when no layout matches, not when icons fit', () => {
  test('no error when icon count falls within a valid layout range', () => {
    // 5 icons, layout covers 1-8: layout found → no error
    const configs = [1, 2, 3, 4, 5].map(i =>
      makeActiveConfig(`icon${i}`, `sensor.s${i}`, 'on', 'info')
    );
    const states: Record<string, StateObject> = {};
    for (let i = 1; i <= 5; i++) {
      states[`sensor.s${i}`] = { state: 'on', attributes: {} };
    }
    const profile = makeProfile({
      layouts: [
        { icon: { min: 1, max: 8, size: 'medium', cols: 2 }, info: { min: 0, max: 3 } },
      ],
    });

    const result = solve(
      configs,
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.error).toBe(false);
    expect(result.glyphs).toHaveLength(5);
  });

  test('error is true when icon count exceeds all layout maxima', () => {
    // 9 icons, only layout covers 1-4 → no layout found → error
    const configs = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(i =>
      makeActiveConfig(`icon${i}`, `sensor.s${i}`, 'on', 'info')
    );
    const states: Record<string, StateObject> = {};
    for (let i = 1; i <= 9; i++) {
      states[`sensor.s${i}`] = { state: 'on', attributes: {} };
    }
    const profile = makeProfile({
      layouts: [
        { icon: { min: 1, max: 4, size: 'medium', cols: 2 }, info: { min: 0, max: 3 } },
      ],
    });

    const result = solve(
      configs,
      states,
      DEFAULT_TIERS,
      DEFAULT_DEFAULTS,
      NO_GROUPS,
      profile,
      stubResolver,
      0,
      FIXED_NOW,
    );

    expect(result.error).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Bug regression: idle glyph with layouts that have icon.min = 1
//
// Before the fix, when all layouts had icon.min >= 1 (the typical real-world
// case), selectLayout returned null for iconCount=0.  The null branch triggered
// the config-error early-return with empty glyphs — the idle glyph check at
// stage 12 was never reached.
//
// The existing describe '2' test masked this because its profile uses
// icon.min = 0, so selectLayout still succeeded.  This test uses icon.min = 1.
// ---------------------------------------------------------------------------

describe('Bug regression — idle glyph emitted when all layouts have icon.min = 1', () => {
  test('error is false and glyphs contains the idle glyph', () => {
    const config: EntityConfig = {
      id: 'sensor1',
      entity_id: 'sensor.test',
      rules: [{ when: { state: 'active' }, then: { action: 'show', tier: 'info' } }],
    };
    // State doesn't match the 'active' rule → focusFiltered is empty
    const states = makeStates('sensor.test', 'inactive');
    const profile = makeProfile({
      layouts: [{ icon: { min: 1, max: 6, size: 'medium', cols: 2 }, info: { min: 0, max: 3 } }],
    });

    const result = solve(
      [config], states, DEFAULT_TIERS, DEFAULT_DEFAULTS, NO_GROUPS,
      profile, stubResolver, 0, FIXED_NOW,
    );

    expect(result.error).toBe(false);
    expect(result.glyphs).toHaveLength(1);
    // idle_glyph is 'check_circle' from makeProfile; stubResolver prefixes 'CP:'
    expect(result.glyphs[0].codepoint).toBe('CP:check_circle');
  });

  test('idle glyph is centered on screen', () => {
    const config: EntityConfig = {
      id: 's',
      entity_id: 'sensor.test',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'info' } }],
    };
    const states = makeStates('sensor.test', 'off');
    // 128×128 screen, largest glyph size = 48px (large) → center = (128-48)/2 = 40
    const profile = makeProfile({
      layouts: [{ icon: { min: 1, max: 4, size: 'medium', cols: 2 }, info: { min: 0, max: 2 } }],
    });

    const result = solve(
      [config], states, DEFAULT_TIERS, DEFAULT_DEFAULTS, NO_GROUPS,
      profile, stubResolver, 0, FIXED_NOW,
    );

    expect(result.glyphs).toHaveLength(1);
    expect(result.glyphs[0].x).toBe(40);
    expect(result.glyphs[0].y).toBe(40);
    expect(result.glyphs[0].sizePx).toBe(48); // largest size in makeProfile
  });
});
