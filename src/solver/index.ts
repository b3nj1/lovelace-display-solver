import type {
  EntityConfig,
  DisplayProfile,
  SolverResult,
  ActiveEntry,
  GlyphEntry,
  InfoEntry,
  ZoneEntry,
  SeverityBarEntry,
  Defaults,
  GroupConfig,
  StateObject,
  GlyphResolver,
  LayoutEntry,
  ZonePosition,
} from './types';
import { evaluateEntity, applyFocusMode } from './rules';
import { selectLayout, computeGlyphCoordinates, computeBurnInOffsets } from './layout';
import { resolveColor } from '../utils/color';

// ---- Helpers ----------------------------------------------------------------

function formatInfoLine(
  config: EntityConfig,
  states: Record<string, StateObject>,
): string {
  const stateObj = states[config.entity_id];
  const rawState = stateObj?.state ?? '';
  const unit = (stateObj?.attributes?.unit_of_measurement as string | undefined) ?? '';
  const fmt = config.value_format ?? '{value} {unit}';

  const text = fmt
    .replace(/\{value:\.0f\}/g, () => {
      const n = parseFloat(rawState);
      return isNaN(n) ? rawState : Math.round(n).toString();
    })
    .replace(/\{value\}/g, rawState)
    .replace(/\{unit\}/g, unit);

  const label =
    config.label ??
    (stateObj?.attributes?.friendly_name as string | undefined) ??
    config.id;

  return `${text.trim()} ${label}`.trimEnd();
}

interface ZoneFrac { x: number; y: number; w: number; h: number }

function expandZonePosition(position: ZonePosition, profile: DisplayProfile): ZoneFrac {
  const mx = profile.margin_px[0] / profile.screen_px[0];
  const my = profile.margin_px[1] / profile.screen_px[1];

  if (typeof position === 'object') {
    return position as ZoneFrac;
  }

  switch (position) {
    case 'top-edge':     return { x: 0,    y: 0,      w: 1.0, h: my };
    case 'bottom-edge':  return { x: 0,    y: 1 - my, w: 1.0, h: my };
    case 'left-edge':    return { x: 0,    y: 0,      w: mx,  h: 1.0 };
    case 'right-edge':   return { x: 1-mx, y: 0,      w: mx,  h: 1.0 };
    case 'top-left':     return { x: 0,    y: 0,      w: mx,  h: my };
    case 'top-right':    return { x: 1-mx, y: 0,      w: mx,  h: my };
    case 'bottom-left':  return { x: 0,    y: 1-my,   w: mx,  h: my };
    case 'bottom-right': return { x: 1-mx, y: 1-my,   w: mx,  h: my };
  }
}

function computeZonePixels(
  frac: ZoneFrac,
  profile: DisplayProfile,
): { x: number; y: number; w: number; h: number } {
  return {
    x: Math.floor(frac.x * profile.screen_px[0]),
    y: Math.floor(frac.y * profile.screen_px[1]),
    w: Math.round(frac.w * profile.screen_px[0]),
    h: Math.round(frac.h * profile.screen_px[1]),
  };
}

function computeSeverityBar(
  profile: DisplayProfile,
  activeAfterFocus: ActiveEntry[],
  tiers: string[],
  now?: Date,
): SeverityBarEntry | null {
  const cfg = profile.severity_bar;
  if (!cfg) return null;

  const [sw, sh] = profile.screen_px;
  const [mx, my] = profile.margin_px;

  // burn-in drift — use shared helper from layout.ts to avoid duplicating arithmetic
  const date = now ?? new Date();
  const { xOffset, yOffset } = computeBurnInOffsets(profile, date);

  let fill_ratio: number;
  let color: { r: number; g: number; b: number };

  if (activeAfterFocus.length === 0) {
    if (cfg.hide_when_idle !== false) return null;
    fill_ratio = 0;
    color = cfg.color === 'entity' ? { r: 255, g: 255, b: 255 } : resolveColor(cfg.color);
  } else {
    const N = tiers.length;
    const highestTier = activeAfterFocus[0].tier;
    const tier_index = tiers.indexOf(highestTier);
    fill_ratio = (N - tier_index) / N;
    color =
      cfg.color === 'entity'
        ? resolveColor(activeAfterFocus[0].color)
        : resolveColor(cfg.color);
  }

  const t = cfg.thickness_px;
  const edge = cfg.edge;
  let x: number, y: number, w: number, h: number;

  if (edge === 'bottom') {
    w = Math.round(fill_ratio * (sw - 2 * mx));
    h = t;
    x = mx + xOffset;
    y = sh - my - t + yOffset;
  } else if (edge === 'top') {
    w = Math.round(fill_ratio * (sw - 2 * mx));
    h = t;
    x = mx + xOffset;
    y = my + yOffset;
  } else if (edge === 'left') {
    w = t;
    h = Math.round(fill_ratio * (sh - 2 * my));
    x = mx + xOffset;
    y = my + yOffset;
  } else {
    // right
    w = t;
    h = Math.round(fill_ratio * (sh - 2 * my));
    x = sw - mx - t + xOffset;
    y = my + yOffset;
  }

  return { x, y, w, h, r: color.r, g: color.g, b: color.b };
}

// ---- Stage helpers ----------------------------------------------------------

function renderInfoLine(
  config: EntityConfig,
  states: Record<string, StateObject>,
): string {
  return formatInfoLine(config, states);
}

function computeZoneEntries(
  profile: DisplayProfile,
  activeEntries: ActiveEntry[],
  _xOffset: number,
  _yOffset: number,
): ZoneEntry[] {
  const zones: ZoneEntry[] = [];
  for (const slot of profile.zones ?? []) {
    const candidate = activeEntries.find(
      e =>
        e.entityConfig.zone === slot.id &&
        (e.indicatorOnly === true || e.driveZoneIndicator === true),
    );
    if (!candidate) continue;

    const frac = expandZonePosition(slot.position, profile);
    const px = computeZonePixels(frac, profile);
    const { r, g, b } = resolveColor(candidate.color);
    zones.push({
      zoneId: slot.id,
      x: px.x,
      y: px.y,
      w: px.w,
      h: px.h,
      r, g, b,
      shape: 'filled_rectangle',
    });
  }
  return zones;
}

function computeIdleGlyph(
  profile: DisplayProfile,
  glyphResolver: GlyphResolver,
  _xOffset: number,
  _yOffset: number,
): GlyphEntry {
  const sizeKeys = Object.keys(profile.glyph_sizes);
  const largeSizePx = sizeKeys.reduce((max, key) => {
    const px = profile.glyph_sizes[key].px;
    return px > max ? px : max;
  }, 0);
  const x = Math.floor((profile.screen_px[0] - largeSizePx) / 2);
  const y = Math.floor((profile.screen_px[1] - largeSizePx) / 2);
  const codepoint = glyphResolver(profile.idle_glyph);
  const { r, g, b } = resolveColor('white');
  return { codepoint, x, y, sizePx: largeSizePx, r, g, b };
}

// ---- Main solver ------------------------------------------------------------

export function solve(
  entityConfigs: EntityConfig[],
  states: Record<string, StateObject>,
  tiers: string[],
  defaults: Defaults,
  groups: GroupConfig[],
  profile: DisplayProfile,
  glyphResolver: GlyphResolver,
  currentPage: number,
  now?: Date,
): SolverResult {
  const warnings: string[] = [];
  const date = now ?? new Date();

  // Stage 1: Rule evaluation
  const activeEntries: ActiveEntry[] = [];
  for (const config of entityConfigs) {
    const entry = evaluateEntity(config, states, tiers, defaults, date);
    if (entry !== null) {
      activeEntries.push(entry);
    }
    // Warn on entities that can never become active
    const hasRules = Array.isArray(config.rules) && config.rules.length > 0;
    const hasThresholds = Array.isArray(config.thresholds) && config.thresholds.length > 0;
    if (!hasRules && !hasThresholds) {
      warnings.push(`Entity '${config.id}' has no rules or thresholds and will never be active.`);
    }
  }

  // Stage 2: Bucket by tier (stable sort by tier index, then original order)
  activeEntries.sort((a, b) => {
    return tiers.indexOf(a.tier) - tiers.indexOf(b.tier);
  });

  // Stage 3: Focus mode
  const focusFiltered = applyFocusMode(activeEntries, tiers);

  // Early exit: idle — no active entries after focus filtering.
  // Must happen before selectLayout, which returns null for iconCount=0 and
  // triggers the config-error path before stage 12 can emit the idle glyph.
  if (focusFiltered.length === 0) {
    const { xOffset, yOffset } = computeBurnInOffsets(profile, date);
    const fallbackSize = Object.keys(profile.glyph_sizes)[0] ?? 'small';
    return {
      profile_id: profile.id,
      glyphs: [computeIdleGlyph(profile, glyphResolver, xOffset, yOffset)],
      info: [],
      zones: [],
      severity_bar: computeSeverityBar(profile, [], tiers, now),
      layout: { icon: { min: 0, max: 1, size: fallbackSize, cols: 1 }, info: { min: 0, max: 0 } },
      error: false,
      warnings,
      page_count: 1,
    };
  }

  // Stage 4: Glyph name -> codepoint
  const codepointMap = new Map<string, string>();
  for (const entry of focusFiltered) {
    if (!codepointMap.has(entry.glyphName)) {
      const cp = glyphResolver(entry.glyphName);
      codepointMap.set(entry.glyphName, cp);

      if (profile.font_glyphs && profile.font_glyphs.length > 0) {
        // TODO: map mdi: prefix to MSS equivalent via glyph.ts lookup; for now use raw name
        const mssName = entry.glyphName;
        if (!profile.font_glyphs.includes(mssName)) {
          warnings.push(
            `Glyph '${mssName}' not in profile '${profile.id}' font_glyphs — will render blank. Add '${mssName}' to the glyphs: list in your ESPHome device YAML and recompile.`,
          );
        }
      }
    }
  }

  // Stage 5: Count visible icons (group overlay collapses to 1 slot)
  const groupMap = new Map<string, GroupConfig>(groups.map(g => [g.id, g]));

  // Determine non-indicator entries; group members
  const placeableEntries = focusFiltered.filter(e => !e.indicatorOnly);

  // Build group visibility: first active member per group is representative
  const groupRepresentative = new Map<string, ActiveEntry>();
  for (const entry of placeableEntries) {
    const gid = entry.entityConfig.group;
    if (gid !== undefined) {
      const grp = groupMap.get(gid);
      if (grp && grp.collapse === 'overlay' && !groupRepresentative.has(gid)) {
        groupRepresentative.set(gid, entry);
      }
    }
  }

  // Count visible icon slots
  const countedGroups = new Set<string>();
  let iconCount = 0;
  for (const entry of placeableEntries) {
    const gid = entry.entityConfig.group;
    if (gid !== undefined) {
      const grp = groupMap.get(gid);
      if (grp && grp.collapse === 'overlay') {
        if (!countedGroups.has(gid)) {
          countedGroups.add(gid);
          iconCount += 1;
        }
        continue;
      }
    }
    iconCount += 1;
  }

  const totalVisibleIcons = iconCount;

  // Stage 6: Layout selection
  const hasInfo = focusFiltered.some(e => e.showInfo);
  const layout = selectLayout(profile, totalVisibleIcons, hasInfo);

  if (layout === null) {
    const sizeKeys = Object.keys(profile.glyph_sizes);
    const fallbackSize = sizeKeys[sizeKeys.length - 1] ?? 'medium';
    const fallbackLayout: LayoutEntry = {
      icon: { min: 0, max: 0, size: fallbackSize, cols: 1 },
      info: { min: 0, max: 0 },
    };
    return {
      profile_id: profile.id,
      glyphs: [],
      info: [],
      zones: [],
      severity_bar: null,
      layout: fallbackLayout,
      error: true,
      errorReason: `No layout matches: icon_count=${totalVisibleIcons}, hasInfo=${hasInfo}. Check your profile's layouts table.`,
      warnings,
      page_count: 1,
    };
  }

  // Stage 7: Page mode
  const page_count = Math.ceil(totalVisibleIcons / layout.icon.max) || 1;
  // clamp out-of-range page to last page rather than wrapping, so stale page state never resets to page 0 mid-cycle
  const safeCurrentPage = Math.min(currentPage, page_count - 1);

  // Build ordered list of grid entries respecting group collapse
  const orderedGridEntries: ActiveEntry[] = [];
  const processedGroupsForGrid = new Set<string>();
  for (const entry of placeableEntries) {
    const gid = entry.entityConfig.group;
    if (gid !== undefined) {
      const grp = groupMap.get(gid);
      if (grp && grp.collapse === 'overlay') {
        if (!processedGroupsForGrid.has(gid)) {
          processedGroupsForGrid.add(gid);
          // Push representative (first active) for this group slot
          orderedGridEntries.push(groupRepresentative.get(gid)!);
        }
        continue;
      }
    }
    orderedGridEntries.push(entry);
  }

  // Slice for current page
  const pageStart = safeCurrentPage * layout.icon.max;
  const pageEnd = pageStart + layout.icon.max;
  const pageSlice = orderedGridEntries.slice(pageStart, pageEnd);

  // Stage 8: Coordinate computation
  const glyphEntries = computeGlyphCoordinates(profile, layout, pageSlice, now);

  // Fill in codepoints
  const glyphs: GlyphEntry[] = glyphEntries.map((ge, i) => ({
    ...ge,
    codepoint: codepointMap.get(pageSlice[i].glyphName) ?? '',
  }));

  // Stage 9: Info lines — each label is paired with its own icon.
  // Text baseline is placed INFO_FONT_PX + INFO_GAP_PX below the icon's visual
  // bottom (which canvas drawGlyphs puts at glyph.y + glyph.sizePx).
  // For multi-row grids the cell height does not include label space, so labels
  // of row N may overlap row N+1 icons when info is enabled — acceptable for the
  // common 1–2 entity case; a future cellHeight-with-label change can fix that.
  const INFO_FONT_PX = 12;
  const INFO_GAP_PX = 2;
  const info: InfoEntry[] = [];
  for (let i = 0; i < pageSlice.length; i++) {
    const entry = pageSlice[i];
    if (!entry.showInfo) continue;
    const glyph = glyphs[i];
    const text = renderInfoLine(entry.entityConfig, states);
    const { r, g, b } = resolveColor(entry.color);
    info.push({
      text,
      x: glyph.x,
      y: glyph.y + glyph.sizePx + INFO_FONT_PX + INFO_GAP_PX,
      r, g, b,
    });
  }

  // Stage 10: Zone indicators
  const { xOffset, yOffset } = computeBurnInOffsets(profile, date);
  const zones = computeZoneEntries(profile, focusFiltered, xOffset, yOffset);

  // Stage 11: Severity bar
  const severity_bar = computeSeverityBar(profile, focusFiltered, tiers, now);

  return {
    profile_id: profile.id,
    glyphs,
    info,
    zones,
    severity_bar,
    layout,
    error: false,
    warnings,
    page_count,
  };
}

export function solveAll(
  entityConfigs: EntityConfig[],
  states: Record<string, StateObject>,
  tiers: string[],
  defaults: Defaults,
  groups: GroupConfig[],
  profiles: DisplayProfile[],
  glyphResolver: GlyphResolver,
  currentPages: Record<string, number>,
  now?: Date,
): SolverResult[] {
  return profiles.map(profile =>
    solve(
      entityConfigs,
      states,
      tiers,
      defaults,
      groups,
      profile,
      glyphResolver,
      currentPages[profile.id] ?? 0,
      now,
    ),
  );
}
