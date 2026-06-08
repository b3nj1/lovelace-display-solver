import { DisplayProfile, LayoutEntry, ActiveEntry, GlyphEntry } from './types';
import { resolveColor } from '../utils/color';

export const VIEWING_DISTANCE_PRESETS: Record<string, {
  // Number of the largest declared sizes to skip in the filter.
  // 0 = no restriction (far — prefer the biggest icon).
  // 1 = skip the single largest size (near — skip the biggest, use next tier down).
  // close uses prefer_dense=true instead of skip_largest because it wants the
  // smallest available size regardless of what names the profile uses.
  skip_largest: number;
  max_info_rows: number;
  prefer_fewer_icons: boolean;
  prefer_dense: boolean;
  // Multiplier applied to the selected layout's glyph size when the profile
  // declares only one distinct icon size. Multi-size profiles get size variation
  // from layout selection; single-size profiles need this to produce a zoom
  // effect. near=1.0 is the baseline; far doubles, close halves.
  size_scale: number;
}> = {
  far:   { skip_largest: 0, max_info_rows: 4, prefer_fewer_icons: true,  prefer_dense: false, size_scale: 2.0 },
  near:  { skip_largest: 1, max_info_rows: 4, prefer_fewer_icons: false, prefer_dense: false, size_scale: 1.0 },
  close: { skip_largest: 0, max_info_rows: 6, prefer_fewer_icons: false, prefer_dense: true,  size_scale: 0.5 },
};

export function expandViewingDistance(profile: DisplayProfile): {
  skip_largest: number;
  max_info_rows: number;
  prefer_fewer_icons: boolean;
  prefer_dense: boolean;
  size_scale: number;
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

  // Compute the minimum acceptable size index.
  // skip_largest=0 → no restriction (all sizes OK).
  // skip_largest=1 → skip the largest declared size, use second-tier or smaller.
  // Clamped so a 1-size profile is never left with zero valid sizes.
  const minSizeIndex = Math.min(constraints.skip_largest, sizeKeys.length - 1);

  // close: prefer densest (smallest) layout — iterate smallest-first by reversing.
  // far/near: prefer largest matching — iterate as declared (largest-first).
  const orderedLayouts = constraints.prefer_dense
    ? [...profile.layouts].reverse()
    : profile.layouts;

  for (const layout of orderedLayouts) {
    // Filter by size: skip layouts whose icon size is "too large" for this distance.
    // layoutSizeIndex < minSizeIndex means the size key appears earlier (= larger) in
    // the declared list than the minimum we accept.
    const layoutSizeIndex = sizeKeys.indexOf(layout.icon.size);
    if (layoutSizeIndex !== -1 && layoutSizeIndex < minSizeIndex) {
      continue;
    }

    // Filter by icon count
    if (iconCount < layout.icon.min || iconCount > layout.icon.max) {
      continue;
    }

    // Filter: no info available but layout requires info
    if (!hasInfo && layout.info.min > 0) {
      continue;
    }

    return layout;
  }

  return null;
}

export function computeBurnInOffsets(profile: DisplayProfile, now: Date): { xOffset: number; yOffset: number } {
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
  const declaredCellSize = sizeEntry.px;

  // Zoom scaling for single-size profiles.
  // When every layout in the profile uses the same icon size, layout selection
  // cannot differentiate between viewing distances.  Apply the preset's
  // size_scale multiplier so far/near/close still produce a visible zoom effect.
  // Multi-size profiles already vary glyph size through layout selection, so
  // their scale stays at 1.0 to avoid compounding.
  const constraints = expandViewingDistance(profile);
  const distinctSizes = new Set(profile.layouts.map(l => l.icon.size));
  const isSingleSize = distinctSizes.size <= 1;
  const scale = isSingleSize ? constraints.size_scale : 1.0;
  const cellSize = Math.max(8, Math.round(declaredCellSize * scale));

  const cols = layout.icon.cols;
  const placeable = entries.filter(e => !e.indicatorOnly);

  // Per-entry placement: entries with showInfo always occupy their own row so
  // info text can be rendered to the right. Entries without showInfo pack
  // across columns normally. A showInfo entry mid-row bumps to the next row.
  let currentRow = 0;
  let currentCol = 0;

  return placeable.map((entry) => {
    let row: number;
    let col: number;

    if (entry.showInfo) {
      if (currentCol > 0) {
        currentRow += 1;
        currentCol = 0;
      }
      row = currentRow;
      col = 0;
      currentRow += 1;
      currentCol = 0;
    } else {
      row = currentRow;
      col = currentCol;
      currentCol += 1;
      if (currentCol >= cols) {
        currentCol = 0;
        currentRow += 1;
      }
    }

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
