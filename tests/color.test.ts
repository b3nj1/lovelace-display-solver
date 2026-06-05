import { describe, test, expect, vi, beforeEach } from 'vitest';

describe('resolveColor', () => {
  test('known colors resolve to non-zero RGB values', async () => {
    const { resolveColor } = await import('../src/utils/color.ts');
    const names = ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'white'];
    for (const name of names) {
      const rgb = resolveColor(name);
      expect(
        rgb.r > 0 || rgb.g > 0 || rgb.b > 0,
        `expected at least one channel non-zero for color "${name}"`
      ).toBe(true);
    }
  });

  test('unknown color returns white and does not throw', async () => {
    const { resolveColor } = await import('../src/utils/color.ts');
    let result: { r: number; g: number; b: number } | undefined;
    expect(() => {
      result = resolveColor('totally_unknown_color_zzz');
    }).not.toThrow();
    expect(result).toEqual({ r: 255, g: 255, b: 255 });
  });

  test('warning dedup: console.warn fires only once for two calls with same unknown name', async () => {
    vi.resetModules();
    const { resolveColor } = await import('../src/utils/color.ts');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      resolveColor('unknown_xyz');
      resolveColor('unknown_xyz');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
