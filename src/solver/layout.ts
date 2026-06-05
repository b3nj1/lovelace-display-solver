import { DisplayProfile, LayoutEntry, ActiveEntry, GlyphEntry } from './types';
import { resolveColor } from '../utils/color';

export const VIEWING_DISTANCE_PRESETS: Record<string, {
  max_size: string;
  max_info_rows: number;
  prefer_fewer_icons: boolean;
}> = {
  far:   { max_size: 'medium', max_info_rows: 0, prefer_fewer_icons: true  },
  near:  { max_size: 'tiny',   max_info_rows: 4, prefer_fewer_icons: false },
  close: { max_size: 'tiny',   max_info_rows: 6, prefer_fewer_icons: false },
};

export function expandViewingDistance(profile: DisplayProfile): {
  max_size: string;
  max_info_rows: number;
  prefer_fewer_icons: boolean;
} {
  const preset = VIEWING_DISTANCE_PRESETS[profile.viewing_distance];
  if (preset === undefined) {
    console.warn(`expandViewingDistance: unknown viewing_distance "${profile.viewing_distance}" — falling back to "near"`);
    return VIEWING_DISTANCE_PRESETS['near'];
  }
  return preset;
}

export function selectLayout(
  profile: DisplayProfile,
  iconCount: number,
  hasInfo: boolean,
): LayoutEntry | null {
  const constraints = expandViewingDistance(profile);
  // NOTE: glyph_sizes keys must be declared largest-to-smallest in the profile.
  // selectLayout relies on Object.keys insertion order for size comparisons.
  const sizeKeys = Object.keys(profile.glyph_sizes);
  const maxSizeIndex = sizeKeys.indexOf(constraints.max_size);

  for (const layout of profile.layouts) {
    // Filter by max_size: layout.icon.size must be at or after max_size in the key list
    if (maxSizeIndex !== -1) {
      const layoutSizeIndex = sizeKeys.indexOf(layout.icon.size);
      if (layoutSizeIndex === -1 || layoutSizeIndex < maxSizeIndex) {
        continue;
      }
    }

    // Filter by icon count
    if (iconCount < layout.icon.min || iconCount > layout.icon.max) {
      continue;
    }

    // Filter: no info available but layout requires info
    if (!hasInfo && layout.info.min > 0) {
      continue;
    }

    // Filter: far distance — skip layouts requiring info
    if (constraints.max_info_rows === 0 && layout.info.min > 0) {
      continue;
    }

    return layout;
  }

  return null;
}

function computeBurnInOffsets(profile: DisplayProfile, now: Date): { xOffset: number; yOffset: number } {
  if (profile.burn_in_drift) {
    const xOffset = Math.floor(now.getHours() / 23 * profile.margin_px[0]);
    const yOffset = Math.floor(now.getMinutes() / 59 * profile.margin_px[1]);
    return { xOffset, yOffset };
  }
  return { xOffset: 0, yOffset: 0 };
}

export function computeGlyphCoordinates(
  profile: DisplayProfile,
  layout: LayoutEntry,
  entries: ActiveEntry[],
  now?: Date,
): GlyphEntry[] {
  const date = now ?? new Date();
  const { xOffset, yOffset } = computeBurnInOffsets(profile, date);

  const originX = profile.margin_px[0] + xOffset;
  const originY = profile.margin_px[1] + yOffset;

  const sizeEntry = profile.glyph_sizes[layout.icon.size];
  if (sizeEntry === undefined) {
    throw new Error(`layout.icon.size "${layout.icon.size}" is not defined in profile "${profile.id}" glyph_sizes`);
  }
  const cellSize = sizeEntry.px;

  const placeable = entries.filter(e => !e.indicatorOnly);

  return placeable.map((entry, i) => {
    const col = i % layout.icon.cols;
    const row = Math.floor(i / layout.icon.cols);
    const x = Math.floor(originX + col * cellSize);
    const y = Math.floor(originY + row * cellSize);
    const { r, g, b } = resolveColor(entry.color);
    return {
      codepoint: '',
      x,
      y,
      sizePx: cellSize,
      r,
      g,
      b,
    };
  });
}

export function computeInfoCoordinates(
  profile: DisplayProfile,
  layout: LayoutEntry,
  iconCount: number,
  now?: Date,
): { x: number; y: number; lineHeight: number } {
  const date = now ?? new Date();
  const { xOffset, yOffset } = computeBurnInOffsets(profile, date);

  const sizeEntry = profile.glyph_sizes[layout.icon.size];
  if (sizeEntry === undefined) {
    throw new Error(`layout.icon.size "${layout.icon.size}" is not defined in profile "${profile.id}" glyph_sizes`);
  }
  const cellSize = sizeEntry.px;
  const glyphAreaHeight = Math.ceil(iconCount / layout.icon.cols) * cellSize;

  const infoOriginX = Math.floor(profile.margin_px[0] + xOffset);
  const infoOriginY = Math.floor(profile.margin_px[1] + yOffset + glyphAreaHeight);

  return { x: infoOriginX, y: infoOriginY, lineHeight: 12 };
}
