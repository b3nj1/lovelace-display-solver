import { describe, test, expect } from 'vitest';
import {
  validateCardConfig,
  CardConfig,
  EntityConfig,
  DisplayProfile,
  GroupConfig,
  Defaults,
  Rule,
  ThresholdStep,
  WhenCondition,
  ThenAction,
  GlyphEntry,
  InfoEntry,
  ZoneEntry,
  SeverityBarEntry,
  SolverResult,
  ActiveEntry,
  StateObject,
  LayoutEntry,
  GlyphSize,
  ZoneSlot,
  SeverityBarConfig,
} from '../src/solver/types.js';

// ---------------------------------------------------------------------------
// Helpers — build a minimal valid config
// ---------------------------------------------------------------------------

function makeValidConfig(): CardConfig {
  return {
    tiers: ['critical', 'warning', 'info'],
    defaults: {
      unavailable_action: 'hide',
      show_info: false,
      color_scale: ['green', 'yellow', 'red'],
    },
    entities: [
      {
        id: 'co2',
        entity_id: 'sensor.co2',
        glyph: 'co2',
        rules: [
          {
            when: { above: 1000 },
            then: { action: 'show', tier: 'critical', color: 'red' },
          },
        ],
      },
    ],
    display_profiles: [
      {
        id: 'main_display',
        type: 'canvas',
        screen_px: [320, 240],
        margin_px: [4, 4],
        burn_in_drift: false,
        viewing_distance: 'near',
        idle_glyph: 'check',
        glyph_sizes: {},
        layouts: [
          {
            icon: { min: 0, max: 6, size: 'medium', cols: 3 },
            info: { min: 0, max: 2 },
          },
        ],
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// validateCardConfig tests
// ---------------------------------------------------------------------------

describe('validateCardConfig', () => {
  test('1 — complete valid config returns empty array', () => {
    const errors = validateCardConfig(makeValidConfig());
    expect(errors).toEqual([]);
  });

  test('2 — config missing tiers returns error mentioning "tiers"', () => {
    const config = makeValidConfig() as Record<string, unknown>;
    delete config['tiers'];
    const errors = validateCardConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.toLowerCase().includes('tiers'))).toBe(true);
  });

  test('3 — entity with both rules and thresholds returns an error', () => {
    const config = makeValidConfig();
    config.entities[0].rules = [
      { when: { state: 'on' }, then: { action: 'show', tier: 'critical' } },
    ];
    config.entities[0].thresholds = [{ above: 100, tier: 'critical' }];
    const errors = validateCardConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some((e) => e.includes('rules') && e.includes('thresholds'))
    ).toBe(true);
  });

  test('4 — rule then.tier not in declared tiers returns an error', () => {
    const config = makeValidConfig();
    config.entities[0].rules = [
      { when: { state: 'on' }, then: { action: 'show', tier: 'nonexistent' } },
    ];
    const errors = validateCardConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('nonexistent'))).toBe(true);
  });

  test('5 — thresholds with non-strictly-increasing above values returns an error', () => {
    const config = makeValidConfig();
    delete config.entities[0].rules;
    config.entities[0].thresholds = [
      { above: 500, tier: 'info' },
      { above: 300, tier: 'warning' },  // 300 <= 500 — not strictly increasing
      { above: 1000, tier: 'critical' },
    ];
    const errors = validateCardConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some(
        (e) => e.includes('strictly') || e.includes('above') || e.includes('greater')
      )
    ).toBe(true);
  });

  test('6 — ESPHome profile without service returns an error', () => {
    const config = makeValidConfig();
    config.display_profiles[0].type = 'esphome';
    delete config.display_profiles[0].service;
    const errors = validateCardConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some((e) => e.includes('esphome') || e.includes('service'))
    ).toBe(true);
  });

  test('7 — entity referencing undeclared group returns an error', () => {
    const config = makeValidConfig();
    config.entities[0].group = 'nonexistent_group';
    const errors = validateCardConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(
      errors.some((e) => e.includes('nonexistent_group') || e.includes('undeclared'))
    ).toBe(true);
  });

  test('8 — duplicate group ids returns an error', () => {
    const config = makeValidConfig();
    config.groups = [
      { id: 'lights', collapse: 'overlay', color_policy: 'most_urgent' },
      { id: 'lights', collapse: 'separate', color_policy: 'member' },  // duplicate
    ];
    const errors = validateCardConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.includes('lights') || e.includes('unique'))).toBe(true);
  });

  test('9 — empty entities array returns an error', () => {
    const config = makeValidConfig();
    config.entities = [];
    const errors = validateCardConfig(config);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some((e) => e.toLowerCase().includes('entities'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// TypeScript compile-time shape checks
// These assignments confirm that the exported interfaces accept the shapes
// described in the spec. Compilation failure means an interface is wrong.
// ---------------------------------------------------------------------------

describe('TypeScript interface shape checks (compile-time)', () => {
  test('WhenCondition is constructible', () => {
    const _wc: WhenCondition = {
      state: 'on',
      range: [0, 100],
      above: 50,
      time_range: ['08:00', '20:00'],
      also: [{ entity: 'binary_sensor.door', state: 'on' }],
    };
    expect(_wc).toBeDefined();
  });

  test('ThenAction is constructible', () => {
    const _ta: ThenAction = {
      action: 'show',
      tier: 'critical',
      color: 'red',
      show_info: true,
      indicator: false,
      focus_mode: false,
    };
    expect(_ta).toBeDefined();
  });

  test('Rule is constructible', () => {
    const _r: Rule = {
      when: { state: 'unavailable' },
      then: { action: 'hide' },
    };
    expect(_r).toBeDefined();
  });

  test('ThresholdStep is constructible', () => {
    const _t: ThresholdStep = { above: 800, tier: 'warning', color: 'orange' };
    expect(_t).toBeDefined();
  });

  test('EntityConfig is constructible', () => {
    const _e: EntityConfig = {
      id: 'e1',
      entity_id: 'sensor.temperature',
      glyph: 'thermometer',
      label: 'Temp',
      value_format: '{state}°C',
      zone: 'living_room',
      group: 'climate',
      rules: [{ when: { above: 30 }, then: { action: 'show', tier: 'warning' } }],
      color_scale: ['blue', 'red'],
    };
    expect(_e).toBeDefined();
  });

  test('Defaults is constructible', () => {
    const _d: Defaults = {
      unavailable_action: 'show',
      show_info: true,
      color_scale: ['green', 'yellow', 'red'],
    };
    expect(_d).toBeDefined();
  });

  test('GroupConfig is constructible', () => {
    const _g: GroupConfig = {
      id: 'climate',
      collapse: 'separate',
      color_policy: 'first_active',
    };
    expect(_g).toBeDefined();
  });

  test('GlyphSize is constructible', () => {
    const _gs: GlyphSize = { px: 48, fits_cols: 2 };
    expect(_gs).toBeDefined();
  });

  test('LayoutEntry is constructible', () => {
    const _le: LayoutEntry = {
      icon: { min: 1, max: 6, size: 'medium', cols: 3 },
      info: { min: 0, max: 2 },
    };
    expect(_le).toBeDefined();
  });

  test('ZoneSlot is constructible', () => {
    const _zs: ZoneSlot = { id: 'z1', position: 'top-left' };
    const _zs2: ZoneSlot = { id: 'z2', position: { x: 0, y: 0, w: 40, h: 10 } };
    expect(_zs).toBeDefined();
    expect(_zs2).toBeDefined();
  });

  test('SeverityBarConfig is constructible', () => {
    const _sb: SeverityBarConfig = {
      edge: 'bottom',
      thickness_px: 4,
      color: 'entity',
      hide_when_idle: true,
    };
    expect(_sb).toBeDefined();
  });

  test('DisplayProfile is constructible', () => {
    const _dp: DisplayProfile = {
      id: 'display1',
      type: 'esphome',
      service: 'esphome.display1_set_display_glyphs',
      screen_px: [320, 240],
      margin_px: [4, 4],
      burn_in_drift: true,
      viewing_distance: 'far',
      idle_glyph: 'check',
      page_dwell_s: 5,
      glyph_sizes: { small: { px: 24, fits_cols: 1 } },
      layouts: [{ icon: { min: 0, max: 6, size: 'medium', cols: 3 }, info: { min: 0, max: 2 } }],
      zones: [{ id: 'z1', position: 'top-right' }],
      severity_bar: { edge: 'bottom', thickness_px: 4, color: 'entity', hide_when_idle: true },
      font_glyphs: ['check', 'thermometer'],
    };
    expect(_dp).toBeDefined();
  });

  test('CardConfig is constructible', () => {
    const config: CardConfig = makeValidConfig();
    expect(config).toBeDefined();
  });

  test('StateObject is constructible', () => {
    const _so: StateObject = {
      state: '21.5',
      attributes: { friendly_name: 'Temperature', unit_of_measurement: '°C' },
    };
    expect(_so).toBeDefined();
  });

  test('ActiveEntry is constructible', () => {
    const _ae: ActiveEntry = {
      entityConfig: { id: 'e1', entity_id: 'sensor.temperature' },
      tier: 'warning',
      color: 'orange',
      glyphName: 'thermometer',
      showInfo: true,
      focusMode: false,
      indicatorOnly: false,
      driveZoneIndicator: false,
    };
    expect(_ae).toBeDefined();
  });

  test('GlyphEntry is constructible', () => {
    const _ge: GlyphEntry = { codepoint: '', x: 10, y: 10, sizePx: 48, r: 255, g: 0, b: 0 };
    expect(_ge).toBeDefined();
  });

  test('InfoEntry is constructible', () => {
    const _ie: InfoEntry = { text: 'CO2: 1200', x: 10, y: 60, r: 255, g: 255, b: 255 };
    expect(_ie).toBeDefined();
  });

  test('ZoneEntry is constructible', () => {
    const _ze: ZoneEntry = {
      zoneId: 'z1', x: 0, y: 0, w: 10, h: 10, r: 255, g: 0, b: 0,
      shape: 'filled_rectangle',
    };
    expect(_ze).toBeDefined();
  });

  test('SeverityBarEntry is constructible', () => {
    const _sbe: SeverityBarEntry = { x: 0, y: 230, w: 160, h: 4, r: 255, g: 0, b: 0 };
    expect(_sbe).toBeDefined();
  });

  test('SolverResult is constructible', () => {
    const layout: LayoutEntry = {
      icon: { min: 0, max: 6, size: 'medium', cols: 3 },
      info: { min: 0, max: 2 },
    };
    const _sr: SolverResult = {
      profile_id: 'display1',
      glyphs: [],
      info: [],
      zones: [],
      severity_bar: null,
      layout,
      error: false,
      warnings: [],
      page_count: 1,
    };
    expect(_sr).toBeDefined();
  });
});
