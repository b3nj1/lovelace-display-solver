// Note: release.yml upload is a manual verification step — it requires a real GitHub Actions run.
// These tests verify the static artifacts are correct before any release is attempted.

import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';
import yaml from 'js-yaml';

describe('release artifacts', () => {
  it('hacs.json has required keys and correct filename', () => {
    const raw = readFileSync(join(process.cwd(), 'hacs.json'), 'utf-8');
    const data = JSON.parse(raw);
    expect(data.name).toBeTruthy();
    expect(data.filename).toBe('display-solver.js');
    expect(data.homeassistant).toBeTruthy();
    expect(data.hacs).toBeTruthy();
  });

  it('README.md contains all required H2 section headings', () => {
    const readme = readFileSync(join(process.cwd(), 'README.md'), 'utf-8');
    const requiredHeadings = [
      '## Installation',
      '## Quick Start',
      '## Entity Configuration',
      '## Display Profile Configuration',
      '## Viewing Distance Presets',
      '## Glyph Names',
      '## ESPHome Setup',
      '## Troubleshooting',
    ];
    for (const heading of requiredHeadings) {
      expect(readme).toContain(heading);
    }
  });

  it('dist/display-solver.js exists and is non-empty', () => {
    const distPath = join(process.cwd(), 'dist', 'display-solver.js');
    expect(existsSync(distPath)).toBe(true);
    const stats = statSync(distPath);
    expect(stats.size).toBeGreaterThan(1000); // bundled file must be substantial
  });

  it('release.yml is valid YAML with required fields', () => {
    const raw = readFileSync(join(process.cwd(), '.github', 'workflows', 'release.yml'), 'utf-8');
    const doc = yaml.load(raw) as Record<string, unknown>;
    expect(doc).toBeTruthy();
    expect(doc['on']).toBeTruthy();
    expect(doc['jobs']).toBeTruthy();
  });

  it('hacs.json filename is display-solver.js (matches HACS file resolution)', () => {
    const data = JSON.parse(readFileSync(join(process.cwd(), 'hacs.json'), 'utf-8'));
    expect(data.filename).toBe('display-solver.js');
  });

  it('release.yml uses npm ci for reproducible builds', () => {
    const raw = readFileSync(join(process.cwd(), '.github', 'workflows', 'release.yml'), 'utf-8');
    expect(raw).toContain('npm ci');
    expect(raw).not.toContain('npm install');
  });
});
