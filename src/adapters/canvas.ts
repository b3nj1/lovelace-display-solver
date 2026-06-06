import type { SolverResult, DisplayProfile, GlyphEntry, InfoEntry, ZoneEntry, SeverityBarEntry } from '../solver/types';
import { MDI_FALLBACK } from '../utils/glyph';

// Module-level font cache keyed by "family:px"
const _fontCache = new Set<string>();

async function ensureFontsLoaded(
  glyph_sizes: DisplayProfile['glyph_sizes'],
): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;

  for (const [, sizeEntry] of Object.entries(glyph_sizes)) {
    const px = sizeEntry.px;
    const family = 'Material Symbols Sharp';
    const cacheKey = `${family}:${px}`;

    if (_fontCache.has(cacheKey)) continue;

    // Inject <link> stylesheet (idempotent — check if already injected)
    const linkId = `mss-font-${px}`;
    if (!document.getElementById(linkId) && document.head) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@${px},400,0,0`;
      document.head.appendChild(link);
    }
    // Wait for the font to be ready
    await document.fonts.load(`${px}px '${family}'`);
    _fontCache.add(cacheKey);
  }
}

export async function renderToCanvas(
  result: SolverResult,
  profile: DisplayProfile,
  canvas: HTMLCanvasElement,
): Promise<void> {
  canvas.width = profile.screen_px[0];
  canvas.height = profile.screen_px[1];

  const ctx = canvas.getContext('2d');
  if (ctx === null) return;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await ensureFontsLoaded(profile.glyph_sizes);

  drawGlyphs(ctx, result.glyphs);
  drawInfoRows(ctx, result.info);
  drawZones(ctx, result.zones);
  drawSeverityBar(ctx, result.severity_bar, profile);
}

export function drawGlyphs(ctx: CanvasRenderingContext2D, glyphs: GlyphEntry[]): void {
  for (const entry of glyphs) {
    const fontFamily = entry.codepoint === MDI_FALLBACK
      ? 'Material Design Icons'
      : 'Material Symbols Sharp';
    ctx.font = `${entry.sizePx}px '${fontFamily}'`;
    ctx.fillStyle = `rgb(${entry.r}, ${entry.g}, ${entry.b})`;
    ctx.fillText(entry.codepoint, entry.x, entry.y + entry.sizePx);
  }
}

export function drawInfoRows(ctx: CanvasRenderingContext2D, info: InfoEntry[]): void {
  for (const entry of info) {
    // TODO: make info font size and family configurable per DisplayProfile (info_font_px)
    ctx.font = '12px monospace';
    ctx.fillStyle = `rgb(${entry.r}, ${entry.g}, ${entry.b})`;
    ctx.fillText(entry.text, entry.x, entry.y);
  }
}

export function drawZones(ctx: CanvasRenderingContext2D, zones: ZoneEntry[]): void {
  for (const z of zones) {
    if (z.shape === 'filled_rectangle') {
      ctx.fillStyle = `rgb(${z.r},${z.g},${z.b})`;
      ctx.fillRect(z.x, z.y, z.w, z.h);
    } else if (z.shape === 'filled_circle') {
      ctx.fillStyle = `rgb(${z.r},${z.g},${z.b})`;
      ctx.beginPath();
      ctx.arc(z.x + z.w / 2, z.y + z.h / 2, z.w / 2, 0, 2 * Math.PI);
      ctx.fill();
    } else if (z.shape === 'circle') {
      ctx.strokeStyle = `rgb(${z.r},${z.g},${z.b})`;
      ctx.beginPath();
      ctx.arc(z.x + z.w / 2, z.y + z.h / 2, z.w / 2, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }
}

export function drawSeverityBar(
  ctx: CanvasRenderingContext2D,
  bar: SeverityBarEntry | null,
  profile: DisplayProfile,
): void {
  if (bar !== null) {
    ctx.fillStyle = `rgb(${bar.r}, ${bar.g}, ${bar.b})`;
    ctx.fillRect(bar.x, bar.y, bar.w, bar.h);
    return;
  }
  // bar is null
  if (profile.severity_bar?.hide_when_idle === false) {
    // Draw rail outline: '#333333' is a fallback for the canvas context
    // (--secondary-background-color CSS variable is not available here)
    ctx.strokeStyle = '#555555';
    const m = profile.margin_px;
    const s = profile.screen_px;
    const t = profile.severity_bar.thickness_px;
    ctx.strokeRect(m[0], s[1] - m[1] - t, s[0] - 2 * m[0], t);
  }
}
