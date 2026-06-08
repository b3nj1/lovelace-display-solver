import type {
  EntityConfig,
  ActiveEntry,
  Defaults,
  StateObject,
  Rule,
  ThresholdStep,
  WhenCondition,
} from './types';
import { entityDefaultGlyph } from '../utils/glyph';

function resolveEntityIconName(entityId: string, stateObj: StateObject | undefined): string {
  const attrIcon = stateObj?.attributes?.icon as string | undefined;
  if (attrIcon) return attrIcon;
  const deviceClass = stateObj?.attributes?.device_class as string | undefined;
  return entityDefaultGlyph(entityId, deviceClass);
}

// Parse "HH:MM" to minutes since midnight
function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function inTimeRange(start: string, end: string, now: Date): boolean {
  const cur = now.getHours() * 60 + now.getMinutes();
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (s <= e) {
    return cur >= s && cur <= e;
  }
  // midnight-crossing window
  return cur >= s || cur <= e;
}

function matchesWhen(
  when: WhenCondition,
  state: string,
  states: Record<string, StateObject>,
  now: Date,
): boolean {
  if (when.state !== undefined && state !== when.state) return false;

  if (when.range !== undefined) {
    const val = parseFloat(state);
    if (isNaN(val)) return false;
    const [low, high] = when.range;
    if (low !== null && val < low) return false;
    if (high !== null && val > high) return false;
  }

  if (when.above !== undefined) {
    const val = parseFloat(state);
    if (isNaN(val) || val <= when.above) return false;
  }

  if (when.time_range !== undefined) {
    const [start, end] = when.time_range;
    if (!inTimeRange(start, end, now)) return false;
  }

  if (when.also !== undefined) {
    for (const cond of when.also) {
      const s = states[cond.entity];
      if (!s || s.state !== cond.state) return false;
    }
  }

  return true;
}

function evaluateRules(
  config: EntityConfig,
  state: string,
  states: Record<string, StateObject>,
  tiers: string[],
  resolvedGlyph: string,
  defaults: Defaults,
  now: Date,
): ActiveEntry | null {
  if (!config.rules) return null;

  for (const rule of config.rules as Rule[]) {
    if (!matchesWhen(rule.when, state, states, now)) continue;

    const then = rule.then;

    if (then.action === 'hide') return null;

    return {
      entityConfig: config,
      tier: then.tier ?? tiers[0],
      color: then.color ?? '',
      glyphName: resolvedGlyph,
      showInfo: then.show_info ?? defaults.show_info ?? false,
      focusMode: then.focus_mode ?? false,
      indicatorOnly: then.action === 'indicator',
      driveZoneIndicator: then.action === 'show' && (then.indicator === true),
    };
  }

  return null;
}

function evaluateThresholds(
  config: EntityConfig,
  state: string,
  tiers: string[],
  resolvedGlyph: string,
  defaults: Defaults,
): ActiveEntry | null {
  if (!config.thresholds) return null;

  const val = parseFloat(state);
  if (isNaN(val)) return null;

  const colorScale = config.color_scale ?? defaults.color_scale ?? [];

  // Find highest threshold that val exceeds (value > above)
  let matched: ThresholdStep | null = null;
  let matchedIndex = -1;
  for (let i = 0; i < config.thresholds.length; i++) {
    const step = config.thresholds[i];
    if (val > step.above) {
      matched = step;
      matchedIndex = i;
    }
  }

  if (!matched) return null;

  const color = matched.color ?? (matchedIndex < colorScale.length ? colorScale[matchedIndex] : '');

  return {
    entityConfig: config,
    tier: matched.tier ?? tiers[0],
    color,
    glyphName: resolvedGlyph,
    showInfo: defaults.show_info ?? false,
    focusMode: false,
    indicatorOnly: false,
    driveZoneIndicator: false,
  };
}

export function evaluateEntity(
  config: EntityConfig,
  states: Record<string, StateObject>,
  tiers: string[],
  defaults: Defaults,
  now: Date = new Date(),
): ActiveEntry | null {
  if (tiers.length === 0) return null;

  const stateObj = states[config.entity_id];
  const rawState = stateObj?.state;
  const isUnavailable =
    !stateObj || rawState === 'unavailable' || rawState === 'unknown';

  if (isUnavailable) {
    const hasExplicitRule = config.rules?.some(
      (r) => r.when.state === 'unavailable' || r.when.state === 'unknown',
    ) ?? false;

    if (!hasExplicitRule) {
      if (!defaults.unavailable_action || defaults.unavailable_action === 'hide') {
        return null;
      }
      // unavailable_action === 'show': return minimal entry at least-urgent tier
      const resolvedGlyph =
        config.glyph === 'entity'
          ? resolveEntityIconName(config.entity_id, stateObj)
          : config.glyph ?? '';
      return {
        entityConfig: config,
        tier: tiers[tiers.length - 1],
        color: '',
        glyphName: resolvedGlyph,
        showInfo: defaults.show_info ?? false,
        focusMode: false,
        indicatorOnly: false,
        driveZoneIndicator: false,
      };
    }
  }

  const state = rawState ?? '';

  // Pre-resolve "entity" glyph
  const resolvedGlyph =
    config.glyph === 'entity'
      ? resolveEntityIconName(config.entity_id, stateObj)
      : config.glyph ?? '';

  if (config.rules) {
    return evaluateRules(config, state, states, tiers, resolvedGlyph, defaults, now);
  }

  if (config.thresholds) {
    return evaluateThresholds(config, state, tiers, resolvedGlyph, defaults);
  }

  return null;
}

export function applyFocusMode(
  entries: ActiveEntry[],
  tiers: string[],
): ActiveEntry[] {
  if (!entries.some((e) => e.focusMode)) return entries;
  return entries.filter((e) => e.tier === tiers[0]);
}
