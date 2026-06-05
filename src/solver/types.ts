// Config input types

export type GlyphName = string;  // MSS name, "mdi:xxx", "entity", or raw unicode

export interface WhenCondition {
  state?: string;
  range?: [number | null, number | null];
  above?: number;
  time_range?: [string, string];  // "HH:MM"
  also?: CrossEntityCondition[];
}

export interface CrossEntityCondition {
  entity: string;
  state: string;
}

export interface ThenAction {
  action: 'show' | 'hide' | 'indicator';
  tier?: string;
  color?: string;
  show_info?: boolean;
  indicator?: boolean;
  focus_mode?: boolean;
}

export interface Rule {
  when: WhenCondition;
  then: ThenAction;
}

export interface ThresholdStep {
  above: number;
  tier: string;
  color?: string;
}

export interface EntityConfig {
  id: string;
  entity_id: string;
  glyph?: GlyphName;
  label?: string;
  value_format?: string;
  zone?: string;
  group?: string;
  rules?: Rule[];
  thresholds?: ThresholdStep[];
  color_scale?: string[];
}

export interface Defaults {
  unavailable_action?: 'hide' | 'show';
  show_info?: boolean;
  color_scale?: string[];
}

export interface GroupConfig {
  id: string;
  collapse: 'overlay' | 'separate';
  color_policy: 'most_urgent' | 'first_active' | 'member';
}

// Display profile types

export interface GlyphSize {
  px: number;
  fits_cols: number;
}

export interface LayoutEntry {
  icon: { min: number; max: number; size: string; cols: number };
  info: { min: number; max: number };
}

export interface ZoneSlot {
  id: string;
  position: ZonePosition;
}

export type ZonePosition =
  | 'top-edge' | 'bottom-edge' | 'left-edge' | 'right-edge'
  | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  | { x: number; y: number; w: number; h: number };

export interface SeverityBarConfig {
  edge: 'top' | 'bottom' | 'left' | 'right';
  thickness_px: number;
  color: string;
  hide_when_idle?: boolean;
}

export interface DisplayProfile {
  id: string;
  type: 'esphome' | 'canvas' | 'cast' | 'png_file';
  service?: string;
  screen_px: [number, number];
  margin_px: [number, number];
  burn_in_drift: boolean;
  viewing_distance: 'far' | 'near' | 'close';
  idle_glyph: GlyphName;
  page_dwell_s?: number;
  glyph_sizes: Record<string, GlyphSize>;
  layouts: LayoutEntry[];
  zones?: ZoneSlot[];
  severity_bar?: SeverityBarConfig;
  font_glyphs?: string[];
}

// Solver intermediate types

export interface StateObject {
  state: string;
  attributes: Record<string, unknown>;
}

export interface ActiveEntry {
  entityConfig: EntityConfig;
  tier: string;
  color: string;
  glyphName: GlyphName;
  showInfo: boolean;
  focusMode: boolean;
  indicatorOnly: boolean;
  driveZoneIndicator: boolean;
}

export type GlyphResolver = (name: GlyphName) => string;

// Solver output types

export interface GlyphEntry {
  codepoint: string;
  x: number;
  y: number;
  sizePx: number;
  r: number;
  g: number;
  b: number;
}

export interface InfoEntry {
  text: string;
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
}

export interface ZoneEntry {
  zoneId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  g: number;
  b: number;
  shape: 'filled_rectangle' | 'circle' | 'filled_circle';
}

export interface SeverityBarEntry {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
  g: number;
  b: number;
}

export interface SolverResult {
  profile_id: string;
  glyphs: GlyphEntry[];
  info: InfoEntry[];
  zones: ZoneEntry[];
  severity_bar: SeverityBarEntry | null;
  layout: LayoutEntry;
  error: boolean;
  errorReason?: string;
  warnings: string[];
  /** Total icon pages. 1 = no overflow. If >1, the caller must schedule a dwell
   *  callback (profile.page_dwell_s seconds) to advance currentPage and re-call solve(). */
  page_count: number;
}

// Top-level card config type

export interface CardConfig {
  tiers: string[];
  defaults?: Defaults;
  entities: EntityConfig[];
  display_profiles: DisplayProfile[];
  groups?: GroupConfig[];
}

// Config validator — returns all errors found; empty array means valid

export function validateCardConfig(config: unknown): string[] {
  const errors: string[] = [];

  if (typeof config !== 'object' || config === null) {
    errors.push('config must be an object');
  } else {
    const c = config as Record<string, unknown>;

    // 1. tiers: non-empty array of strings
    const tiers = c['tiers'];
    const tierSet = new Set<string>();
    if (!Array.isArray(tiers) || tiers.length === 0) {
      errors.push('tiers must be a non-empty array');
    } else {
      for (let i = 0; i < tiers.length; i++) {
        if (typeof tiers[i] !== 'string') {
          errors.push(`tiers[${i}] must be a string`);
        } else {
          tierSet.add(tiers[i]);
        }
      }
    }

    // 2. entities: non-empty array; each has id and entity_id
    const entities = c['entities'];
    if (!Array.isArray(entities) || entities.length === 0) {
      errors.push('entities must be a non-empty array');
    } else {
      // 9. collect declared group ids for later cross-check
      const groupIds = new Set<string>();
      const groupsRaw = c['groups'];
      if (Array.isArray(groupsRaw)) {
        for (const g of groupsRaw) {
          if (typeof g === 'object' && g !== null) {
            const gid = (g as Record<string, unknown>)['id'];
            if (typeof gid === 'string') groupIds.add(gid);
          }
        }
      }

      for (let i = 0; i < entities.length; i++) {
        const ent = entities[i];
        if (typeof ent !== 'object' || ent === null) {
          errors.push(`entities[${i}] must be an object`);
          continue;
        }
        const e = ent as Record<string, unknown>;

        if (typeof e['id'] !== 'string' || (e['id'] as string).length === 0) {
          errors.push(`entities[${i}].id is required`);
        }
        if (typeof e['entity_id'] !== 'string' || (e['entity_id'] as string).length === 0) {
          errors.push(`entities[${i}].entity_id is required`);
        }

        const hasRules = Array.isArray(e['rules']);
        const hasThresholds = Array.isArray(e['thresholds']);

        // 3. not both rules and thresholds
        if (hasRules && hasThresholds) {
          errors.push(`entities[${i}] (id=${String(e['id'])}) must not have both rules and thresholds`);
        }

        // 4. each rule.then.tier references a tier
        if (hasRules) {
          const rules = e['rules'] as unknown[];
          for (let ri = 0; ri < rules.length; ri++) {
            const rule = rules[ri];
            if (typeof rule !== 'object' || rule === null) continue;
            const then = (rule as Record<string, unknown>)['then'];
            if (typeof then === 'object' && then !== null) {
              const tierRef = (then as Record<string, unknown>)['tier'];
              if (tierRef !== undefined && typeof tierRef === 'string' && !tierSet.has(tierRef)) {
                errors.push(`entities[${i}].rules[${ri}].then.tier "${tierRef}" is not declared in tiers`);
              }
            }
          }
        }

        // 4 & 5. thresholds: tiers valid and above values strictly increasing
        if (hasThresholds) {
          const thresholds = e['thresholds'] as unknown[];
          let prevAbove: number | null = null;
          for (let ti = 0; ti < thresholds.length; ti++) {
            const step = thresholds[ti];
            if (typeof step !== 'object' || step === null) continue;
            const s = step as Record<string, unknown>;
            const tierRef = s['tier'];
            if (tierRef !== undefined && typeof tierRef === 'string' && !tierSet.has(tierRef)) {
              errors.push(`entities[${i}].thresholds[${ti}].tier "${tierRef}" is not declared in tiers`);
            }
            const above = s['above'];
            if (typeof above === 'number') {
              if (prevAbove !== null && above <= prevAbove) {
                errors.push(`entities[${i}].thresholds[${ti}].above (${above}) must be strictly greater than previous (${prevAbove})`);
              }
              prevAbove = above;
            }
          }
        }

        // 9. entity.group references a declared group
        if (typeof e['group'] === 'string' && !groupIds.has(e['group'])) {
          errors.push(`entities[${i}].group "${String(e['group'])}" references undeclared group`);
        }
      }
    }

    // 6. display_profiles: non-empty array; each has id, type, screen_px
    const profiles = c['display_profiles'];
    if (!Array.isArray(profiles) || profiles.length === 0) {
      errors.push('display_profiles must be a non-empty array');
    } else {
      for (let i = 0; i < profiles.length; i++) {
        const prof = profiles[i];
        if (typeof prof !== 'object' || prof === null) {
          errors.push(`display_profiles[${i}] must be an object`);
          continue;
        }
        const p = prof as Record<string, unknown>;

        if (typeof p['id'] !== 'string' || (p['id'] as string).length === 0) {
          errors.push(`display_profiles[${i}].id is required`);
        }
        const validProfileTypes = new Set(['esphome', 'canvas', 'cast', 'png_file']);
        if (typeof p['type'] !== 'string' || !validProfileTypes.has(p['type'])) {
          errors.push(`display_profiles[${i}].type must be one of: esphome, canvas, cast, png_file`);
        }
        const spx = p['screen_px'] as unknown[];
        if (!Array.isArray(p['screen_px']) || (p['screen_px'] as unknown[]).length !== 2 ||
            typeof spx[0] !== 'number' || typeof spx[1] !== 'number') {
          errors.push(`display_profiles[${i}].screen_px must be a [width, height] tuple of numbers`);
        }

        // 7. ESPHome profiles must have service
        if (p['type'] === 'esphome' && (typeof p['service'] !== 'string' || (p['service'] as string).length === 0)) {
          const profileId = typeof p['id'] === 'string' ? ` (id=${p['id']})` : '';
          errors.push(`display_profiles[${i}]${profileId} (type=esphome) must have a service field`);
        }
      }
    }

    // 8. groups[*].id values are unique
    const groupsRaw = c['groups'];
    if (Array.isArray(groupsRaw)) {
      const seen = new Set<string>();
      for (let i = 0; i < groupsRaw.length; i++) {
        const g = groupsRaw[i];
        if (typeof g !== 'object' || g === null) continue;
        const gid = (g as Record<string, unknown>)['id'];
        if (typeof gid === 'string') {
          if (seen.has(gid)) {
            errors.push(`groups id "${gid}" is not unique`);
          }
          seen.add(gid);
        }
      }
    }
  }

  return errors;
}
