import { statSync, readFileSync } from 'fs';
import { describe, test, expect } from 'vitest';

describe('scaffold build artifacts', () => {
  test('dist/display-solver.js exists and is non-empty', () => {
    const stat = statSync('dist/display-solver.js');
    expect(stat.size).toBeGreaterThan(0);
  });

  test('dist/display-solver.js contains card type registration', () => {
    const content = readFileSync('dist/display-solver.js', 'utf-8');
    expect(content).toContain('display-solver-card');
  });
});
