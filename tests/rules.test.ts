import { describe, test, expect } from 'vitest';
import { evaluateEntity, applyFocusMode } from '../src/solver/rules.js';
import type {
  EntityConfig,
  StateObject,
  Defaults,
  ActiveEntry,
} from '../src/solver/types.js';

// Fixed timestamp for time_range tests: Monday 2024-01-15 at 23:00 UTC
const FIXED_NOW = new Date('2024-01-15T23:00:00');
// A time clearly in the middle of the day
const MIDDAY_NOW = new Date('2024-01-15T12:00:00');

function makeStates(
  entityId: string,
  state: string,
  attributes: Record<string, unknown> = {},
): Record<string, StateObject> {
  return { [entityId]: { state, attributes } };
}

const DEFAULT_TIERS = ['critical', 'warning', 'info'];
const DEFAULT_DEFAULTS: Defaults = { unavailable_action: 'hide' };

// ---------------------------------------------------------------------------
// 1. Boolean rule: state "off" → null; state "on" → ActiveEntry
// ---------------------------------------------------------------------------

describe('1 — Boolean rule: on/off', () => {
  const config: EntityConfig = {
    id: 'switch1',
    entity_id: 'switch.light',
    glyph: 'lightbulb',
    rules: [
      { when: { state: 'on' }, then: { action: 'show', tier: 'warning', color: 'yellow' } },
    ],
  };

  test('state "off" returns null', () => {
    const result = evaluateEntity(config, makeStates('switch.light', 'off'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).toBeNull();
  });

  test('state "on" returns ActiveEntry with correct tier and color', () => {
    const result = evaluateEntity(config, makeStates('switch.light', 'on'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('warning');
    expect(result!.color).toBe('yellow');
    expect(result!.glyphName).toBe('lightbulb');
  });
});

// ---------------------------------------------------------------------------
// 2. Unavailable entity — default action: hide
// ---------------------------------------------------------------------------

describe('2 — Unavailable entity, default hide', () => {
  const config: EntityConfig = {
    id: 'temp1',
    entity_id: 'sensor.temperature',
    glyph: 'thermometer',
    rules: [{ when: { state: 'hot' }, then: { action: 'show', tier: 'critical' } }],
  };

  test('missing entity in states returns null', () => {
    const result = evaluateEntity(config, {}, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Unavailable entity — unavailable_action: show
// ---------------------------------------------------------------------------

describe('3 — Unavailable entity, unavailable_action: "show"', () => {
  const config: EntityConfig = {
    id: 'temp2',
    entity_id: 'sensor.temperature',
    glyph: 'thermometer',
    rules: [{ when: { state: 'hot' }, then: { action: 'show', tier: 'critical' } }],
  };

  test('missing entity with show action returns an ActiveEntry', () => {
    const defaults: Defaults = { unavailable_action: 'show' };
    const result = evaluateEntity(config, {}, DEFAULT_TIERS, defaults);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('info'); // least-urgent tier = tiers[tiers.length - 1]
  });
});

// ---------------------------------------------------------------------------
// 4. Explicit when: {state: "unavailable"} rule overrides default
// ---------------------------------------------------------------------------

describe('4 — Explicit unavailable rule overrides default', () => {
  const config: EntityConfig = {
    id: 'door1',
    entity_id: 'binary_sensor.door',
    glyph: 'door',
    rules: [
      { when: { state: 'unavailable' }, then: { action: 'show', tier: 'critical', color: 'red' } },
    ],
  };

  test('entity with state "unavailable" and explicit rule fires the rule', () => {
    const states = makeStates('binary_sensor.door', 'unavailable');
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('critical');
    expect(result!.color).toBe('red');
  });
});

// ---------------------------------------------------------------------------
// 5. glyph: "entity" resolved from attributes.icon
// ---------------------------------------------------------------------------

describe('5 — glyph: "entity" resolved from attributes.icon', () => {
  const config: EntityConfig = {
    id: 'fan1',
    entity_id: 'fan.bedroom',
    glyph: 'entity',
    rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'info' } }],
  };

  test('glyph resolved from attributes.icon before rule evaluation', () => {
    const states: Record<string, StateObject> = {
      'fan.bedroom': { state: 'on', attributes: { icon: 'fan' } },
    };
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.glyphName).toBe('fan');
  });
});

// ---------------------------------------------------------------------------
// 6. glyph: "entity" with no icon attribute → domain default glyph
// ---------------------------------------------------------------------------

describe('6 — glyph: "entity" with no icon attribute', () => {
  test('fan entity uses domain default glyph when no icon attribute', () => {
    const config: EntityConfig = {
      id: 'fan2',
      entity_id: 'fan.living',
      glyph: 'entity',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'info' } }],
    };
    const states: Record<string, StateObject> = {
      'fan.living': { state: 'on', attributes: {} },
    };
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.glyphName).toBe('mode_fan');
  });

  test('light entity uses lightbulb when no icon attribute', () => {
    const config: EntityConfig = {
      id: 'light1',
      entity_id: 'light.bedroom',
      glyph: 'entity',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'info' } }],
    };
    const states: Record<string, StateObject> = {
      'light.bedroom': { state: 'on', attributes: {} },
    };
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.glyphName).toBe('lightbulb');
  });

  test('cover garage entity uses garage glyph via device_class', () => {
    const config: EntityConfig = {
      id: 'cover1',
      entity_id: 'cover.garage_door',
      glyph: 'entity',
      rules: [{ when: { state: 'open' }, then: { action: 'show', tier: 'info' } }],
    };
    const states: Record<string, StateObject> = {
      'cover.garage_door': { state: 'open', attributes: { device_class: 'garage' } },
    };
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.glyphName).toBe('garage');
  });

  test('binary_sensor motion uses motion_sensor_active glyph', () => {
    const config: EntityConfig = {
      id: 'motion1',
      entity_id: 'binary_sensor.hallway',
      glyph: 'entity',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'warn' } }],
    };
    const states: Record<string, StateObject> = {
      'binary_sensor.hallway': { state: 'on', attributes: { device_class: 'motion' } },
    };
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.glyphName).toBe('motion_sensor_active');
  });

  test('explicit icon attribute takes priority over domain default', () => {
    const config: EntityConfig = {
      id: 'light2',
      entity_id: 'light.kitchen',
      glyph: 'entity',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'info' } }],
    };
    const states: Record<string, StateObject> = {
      'light.kitchen': { state: 'on', attributes: { icon: 'mdi:ceiling-light' } },
    };
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.glyphName).toBe('mdi:ceiling-light');
  });
});

// ---------------------------------------------------------------------------
// 7. when.range: value in [1000, 2000] → match; 0 → no match; 2001 → no match
// ---------------------------------------------------------------------------

describe('7 — when.range closed bounds', () => {
  const config: EntityConfig = {
    id: 'co2',
    entity_id: 'sensor.co2',
    glyph: 'co2',
    rules: [
      { when: { range: [1000, 2000] }, then: { action: 'show', tier: 'warning', color: 'orange' } },
    ],
  };

  test('value 1500 (within [1000, 2000]) → match', () => {
    const result = evaluateEntity(config, makeStates('sensor.co2', '1500'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
  });

  test('value 0 (below range) → no match', () => {
    const result = evaluateEntity(config, makeStates('sensor.co2', '0'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).toBeNull();
  });

  test('value 2001 (above range) → no match', () => {
    const result = evaluateEntity(config, makeStates('sensor.co2', '2001'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 8. when.range with null bounds
// ---------------------------------------------------------------------------

describe('8 — when.range with null bounds', () => {
  test('[null, 100] matches everything ≤ 100', () => {
    const config: EntityConfig = {
      id: 'e1',
      entity_id: 'sensor.val',
      rules: [{ when: { range: [null, 100] }, then: { action: 'show', tier: 'info' } }],
    };
    const match = evaluateEntity(config, makeStates('sensor.val', '50'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    const noMatch = evaluateEntity(config, makeStates('sensor.val', '101'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(match).not.toBeNull();
    expect(noMatch).toBeNull();
  });

  test('[100, null] matches everything ≥ 100', () => {
    const config: EntityConfig = {
      id: 'e2',
      entity_id: 'sensor.val',
      rules: [{ when: { range: [100, null] }, then: { action: 'show', tier: 'info' } }],
    };
    const match = evaluateEntity(config, makeStates('sensor.val', '200'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    const noMatch = evaluateEntity(config, makeStates('sensor.val', '99'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(match).not.toBeNull();
    expect(noMatch).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 9. when.time_range: within window → match; outside → no match
// ---------------------------------------------------------------------------

describe('9 — when.time_range basic', () => {
  // FIXED_NOW = 23:00; window 22:00–23:59 (non-crossing)
  const config: EntityConfig = {
    id: 'night',
    entity_id: 'sensor.x',
    rules: [
      { when: { time_range: ['22:00', '23:59'] }, then: { action: 'show', tier: 'info' } },
    ],
  };

  test('23:00 is within [22:00, 23:59] → match', () => {
    const result = evaluateEntity(config, makeStates('sensor.x', 'on'), DEFAULT_TIERS, DEFAULT_DEFAULTS, FIXED_NOW);
    expect(result).not.toBeNull();
  });

  test('12:00 is outside [22:00, 23:59] → no match', () => {
    const result = evaluateEntity(config, makeStates('sensor.x', 'on'), DEFAULT_TIERS, DEFAULT_DEFAULTS, MIDDAY_NOW);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 10. when.time_range midnight-crossing
// ---------------------------------------------------------------------------

describe('10 — when.time_range midnight-crossing', () => {
  const config: EntityConfig = {
    id: 'night2',
    entity_id: 'sensor.y',
    rules: [
      { when: { time_range: ['22:00', '06:00'] }, then: { action: 'show', tier: 'info' } },
    ],
  };

  test('23:00 in crossing window [22:00, 06:00] → match', () => {
    const result = evaluateEntity(config, makeStates('sensor.y', 'on'), DEFAULT_TIERS, DEFAULT_DEFAULTS, FIXED_NOW);
    expect(result).not.toBeNull();
  });

  test('12:00 outside crossing window [22:00, 06:00] → no match', () => {
    const result = evaluateEntity(config, makeStates('sensor.y', 'on'), DEFAULT_TIERS, DEFAULT_DEFAULTS, MIDDAY_NOW);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 11. when.also: cross-entity conditions
// ---------------------------------------------------------------------------

describe('11 — when.also cross-entity conditions', () => {
  const config: EntityConfig = {
    id: 'combo',
    entity_id: 'sensor.main',
    glyph: 'alert',
    rules: [
      {
        when: { state: 'on', also: [{ entity: 'binary_sensor.helper', state: 'on' }] },
        then: { action: 'show', tier: 'critical' },
      },
    ],
  };

  test('both conditions hold → match', () => {
    const states: Record<string, StateObject> = {
      'sensor.main': { state: 'on', attributes: {} },
      'binary_sensor.helper': { state: 'on', attributes: {} },
    };
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
  });

  test('also entity is wrong state → no match', () => {
    const states: Record<string, StateObject> = {
      'sensor.main': { state: 'on', attributes: {} },
      'binary_sensor.helper': { state: 'off', attributes: {} },
    };
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).toBeNull();
  });

  test('also entity is absent → no match', () => {
    const states: Record<string, StateObject> = {
      'sensor.main': { state: 'on', attributes: {} },
    };
    const result = evaluateEntity(config, states, DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 12. Thresholds: below first above → null
// ---------------------------------------------------------------------------

describe('12 — Thresholds: below first threshold → null', () => {
  const config: EntityConfig = {
    id: 'pm25',
    entity_id: 'sensor.pm25',
    glyph: 'air',
    thresholds: [
      { above: 50, tier: 'info' },
      { above: 100, tier: 'warning' },
      { above: 200, tier: 'critical' },
    ],
    color_scale: ['green', 'yellow', 'red'],
  };

  test('value 30 (below first threshold of 50) → null', () => {
    const result = evaluateEntity(config, makeStates('sensor.pm25', '30'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 13. Thresholds: at each boundary → correct tier
// ---------------------------------------------------------------------------

describe('13 — Thresholds: at each boundary', () => {
  const config: EntityConfig = {
    id: 'pm25b',
    entity_id: 'sensor.pm25',
    thresholds: [
      { above: 50, tier: 'info' },
      { above: 100, tier: 'warning' },
      { above: 200, tier: 'critical' },
    ],
    color_scale: ['green', 'yellow', 'red'],
  };

  test('value 51 → tier "info" (just above first threshold)', () => {
    const result = evaluateEntity(config, makeStates('sensor.pm25', '51'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('info');
  });

  test('value 101 → tier "warning" (just above second threshold)', () => {
    const result = evaluateEntity(config, makeStates('sensor.pm25', '101'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('warning');
  });

  test('value 201 → tier "critical" (just above third threshold)', () => {
    const result = evaluateEntity(config, makeStates('sensor.pm25', '201'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.tier).toBe('critical');
  });
});

// ---------------------------------------------------------------------------
// 14. Thresholds: color auto-assigned from color_scale in order
// ---------------------------------------------------------------------------

describe('14 — Thresholds: color auto-assigned from color_scale', () => {
  const config: EntityConfig = {
    id: 'pm25c',
    entity_id: 'sensor.pm25',
    thresholds: [
      { above: 50, tier: 'info' },
      { above: 100, tier: 'warning' },
    ],
    color_scale: ['green', 'orange'],
  };

  test('first threshold matched → color from color_scale[0]', () => {
    const result = evaluateEntity(config, makeStates('sensor.pm25', '51'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.color).toBe('green');
  });

  test('second threshold matched → color from color_scale[1]', () => {
    const result = evaluateEntity(config, makeStates('sensor.pm25', '101'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.color).toBe('orange');
  });
});

// ---------------------------------------------------------------------------
// 15. Thresholds: explicit color on a step overrides auto-assign
// ---------------------------------------------------------------------------

describe('15 — Thresholds: explicit color overrides color_scale', () => {
  const config: EntityConfig = {
    id: 'pm25d',
    entity_id: 'sensor.pm25',
    thresholds: [
      { above: 50, tier: 'info', color: 'purple' },
    ],
    color_scale: ['green'],
  };

  test('explicit color on threshold step overrides color_scale', () => {
    const result = evaluateEntity(config, makeStates('sensor.pm25', '51'), DEFAULT_TIERS, DEFAULT_DEFAULTS);
    expect(result).not.toBeNull();
    expect(result!.color).toBe('purple');
  });
});

// ---------------------------------------------------------------------------
// 16. applyFocusMode: no focus_mode entries → all returned unchanged
// ---------------------------------------------------------------------------

describe('16 — applyFocusMode: no focus_mode entries', () => {
  test('all entries returned unchanged when no entry has focusMode', () => {
    const entries: ActiveEntry[] = [
      {
        entityConfig: { id: 'e1', entity_id: 'sensor.a' },
        tier: 'critical',
        color: 'red',
        glyphName: 'alert',
        showInfo: false,
        focusMode: false,
        indicatorOnly: false,
        driveZoneIndicator: false,
      },
      {
        entityConfig: { id: 'e2', entity_id: 'sensor.b' },
        tier: 'warning',
        color: 'orange',
        glyphName: 'warning',
        showInfo: false,
        focusMode: false,
        indicatorOnly: false,
        driveZoneIndicator: false,
      },
    ];
    const result = applyFocusMode(entries, DEFAULT_TIERS);
    expect(result).toHaveLength(2);
    expect(result).toEqual(entries);
  });
});

// ---------------------------------------------------------------------------
// 17. applyFocusMode: one focus_mode entry → only tiers[0] entries returned
// ---------------------------------------------------------------------------

describe('17 — applyFocusMode: one focus_mode entry', () => {
  test('only tiers[0] entries returned when one entry has focusMode', () => {
    const entries: ActiveEntry[] = [
      {
        entityConfig: { id: 'e1', entity_id: 'sensor.a' },
        tier: 'critical',
        color: 'red',
        glyphName: 'alert',
        showInfo: false,
        focusMode: true,  // this entry triggers focus mode
        indicatorOnly: false,
        driveZoneIndicator: false,
      },
      {
        entityConfig: { id: 'e2', entity_id: 'sensor.b' },
        tier: 'warning',  // not critical (tiers[0])
        color: 'orange',
        glyphName: 'warning',
        showInfo: false,
        focusMode: false,
        indicatorOnly: false,
        driveZoneIndicator: false,
      },
      {
        entityConfig: { id: 'e3', entity_id: 'sensor.c' },
        tier: 'critical',  // also critical
        color: 'red',
        glyphName: 'fire',
        showInfo: false,
        focusMode: false,
        indicatorOnly: false,
        driveZoneIndicator: false,
      },
    ];
    const result = applyFocusMode(entries, DEFAULT_TIERS);
    // Only entries with tier === 'critical' (tiers[0]) should be returned
    expect(result).toHaveLength(2);
    expect(result.every((e) => e.tier === 'critical')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 18. applyFocusMode: multiple focus_mode entries → still only tiers[0]
// ---------------------------------------------------------------------------

describe('18 — applyFocusMode: multiple focus_mode entries', () => {
  test('still only tiers[0] entries returned with multiple focus_mode entries', () => {
    const entries: ActiveEntry[] = [
      {
        entityConfig: { id: 'e1', entity_id: 'sensor.a' },
        tier: 'critical',
        color: 'red',
        glyphName: 'alert',
        showInfo: false,
        focusMode: true,
        indicatorOnly: false,
        driveZoneIndicator: false,
      },
      {
        entityConfig: { id: 'e2', entity_id: 'sensor.b' },
        tier: 'warning',
        color: 'orange',
        glyphName: 'warning',
        showInfo: false,
        focusMode: true,  // second focus_mode entry
        indicatorOnly: false,
        driveZoneIndicator: false,
      },
      {
        entityConfig: { id: 'e3', entity_id: 'sensor.c' },
        tier: 'info',
        color: 'blue',
        glyphName: 'info',
        showInfo: false,
        focusMode: false,
        indicatorOnly: false,
        driveZoneIndicator: false,
      },
    ];
    const result = applyFocusMode(entries, DEFAULT_TIERS);
    // Only entries with tier === 'critical' (tiers[0]) should be returned
    expect(result).toHaveLength(1);
    expect(result[0].tier).toBe('critical');
  });
});
