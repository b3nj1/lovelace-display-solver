export interface RGB { r: number; g: number; b: number; }

const COLOR_TABLE: Record<string, RGB> = {
  red:     { r: 255, g: 0,   b: 0   },
  orange:  { r: 255, g: 165, b: 0   },
  yellow:  { r: 255, g: 255, b: 0   },
  green:   { r: 0,   g: 255, b: 0   },
  blue:    { r: 0,   g: 0,   b: 255 },
  purple:  { r: 128, g: 0,   b: 128 },
  white:   { r: 255, g: 255, b: 255 },
  cyan:    { r: 0,   g: 255, b: 255 },
  magenta: { r: 255, g: 0,   b: 255 },
  black:   { r: 0,   g: 0,   b: 0   },
};

const _warnedColors: Set<string> = new Set();

export function resolveColor(name: string): RGB {
  const entry = COLOR_TABLE[name];
  if (entry !== undefined) {
    return entry;
  }
  if (!_warnedColors.has(name)) {
    _warnedColors.add(name);
    console.warn(`resolveColor: unknown color "${name}" — valid values are: red, orange, yellow, green, blue, purple, white, cyan, magenta, black`);
  }
  return { r: 255, g: 255, b: 255 };
}
