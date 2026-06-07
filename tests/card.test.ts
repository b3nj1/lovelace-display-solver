// @vitest-environment happy-dom
import { vi, describe, it, expect } from 'vitest';
import { DisplaySolverCard } from '../src/display-solver-card';
import { validateCardConfig } from '../src/solver/types';

const validConfig = {
  tiers: ['critical', 'alert'],
  entities: [{
    id: 'e1',
    entity_id: 'binary_sensor.test',
    rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'alert', color: 'red' } }],
  }],
  display_profiles: [{
    id: 'test-canvas',
    type: 'canvas',
    screen_px: [128, 128],
    margin_px: [4, 4],
    burn_in_drift: false,
    viewing_distance: 'near',
    idle_glyph: 'check_circle',
    glyph_sizes: { small: { px: 24, fits_cols: 4 } },
    layouts: [{ icon: { min: 1, max: 16, size: 'small', cols: 4 }, info: { min: 0, max: 3 } }],
  }],
};

const esphomeConfig = {
  tiers: ['critical'],
  entities: [{
    id: 'e1',
    entity_id: 'binary_sensor.test',
    rules: [{ when: { state: 'on' }, then: { action: 'show', tier: 'critical', color: 'red' } }],
  }],
  display_profiles: [{
    id: 'esp',
    type: 'esphome',
    service: 'esphome.device_set_display_glyphs',
    screen_px: [128, 128],
    margin_px: [4, 4],
    burn_in_drift: false,
    viewing_distance: 'near',
    idle_glyph: 'check_circle',
    glyph_sizes: { small: { px: 24, fits_cols: 4 } },
    layouts: [{ icon: { min: 1, max: 16, size: 'small', cols: 4 }, info: { min: 0, max: 3 } }],
  }],
};

describe('DisplaySolverCard', () => {
  it('setConfig with valid config clears errors', () => {
    const card = new DisplaySolverCard();
    card.setConfig(validConfig);
    expect((card as unknown as { _errors: string[] })._errors).toHaveLength(0);
  });

  it('setConfig with invalid config (missing tiers) populates _errors', () => {
    const card = new DisplaySolverCard();
    card.setConfig({ entities: [], display_profiles: [] });
    expect((card as unknown as { _errors: string[] })._errors.length).toBeGreaterThan(0);
  });

  it('setConfig clones config so mutating original does not affect _config', () => {
    const card = new DisplaySolverCard();
    const cfg = JSON.parse(JSON.stringify(validConfig));
    card.setConfig(cfg);
    cfg.tiers.push('extra');
    const stored = (card as unknown as { _config: typeof validConfig })._config;
    expect(stored!.tiers).not.toContain('extra');
  });

  it('set hass triggers _runSolver and calls callService for esphome profile', () => {
    const card = new DisplaySolverCard();
    card.setConfig(esphomeConfig);
    const callService = vi.fn().mockResolvedValue(undefined);
    card.hass = {
      states: {
        'binary_sensor.test': { state: 'on', attributes: {} },
      },
      callService,
      formatEntityState: () => '',
    };
    expect(callService).toHaveBeenCalledWith(
      'esphome',
      'device_set_display_glyphs',
      expect.any(Object),
    );
  });

  it('getCardSize returns a positive integer', () => {
    const card = new DisplaySolverCard();
    card.setConfig(validConfig);
    const size = card.getCardSize();
    expect(typeof size).toBe('number');
    expect(size).toBeGreaterThan(0);
    expect(Number.isInteger(size)).toBe(true);
  });

  it('getGridOptions returns object with rows, columns, min_rows, max_rows', () => {
    const card = new DisplaySolverCard();
    const opts = card.getGridOptions();
    expect(opts).toMatchObject({
      rows: expect.any(Number),
      columns: expect.any(Number),
      min_rows: expect.any(Number),
      max_rows: expect.any(Number),
    });
  });

  it('getStubConfig produces a valid config', () => {
    const stub = DisplaySolverCard.getStubConfig({} as any);
    const errors = validateCardConfig(stub);
    expect(errors).toHaveLength(0);
  });

  // Bug regression: setConfig must call _runSolver when hass is already set.
  // Before this fix, config changes (e.g. from the editor) only took effect on the
  // next entity state update, so viewing-distance changes appeared to have no effect.
  it('setConfig re-runs solver immediately when hass is already set', () => {
    const card = new DisplaySolverCard();
    card.setConfig(validConfig);
    card.hass = {
      states: { 'binary_sensor.test': { state: 'off', attributes: {} } },
      callService: vi.fn().mockResolvedValue(undefined),
      formatEntityState: () => '',
    };

    const spy = vi.spyOn(card as any, '_runSolver');
    const updatedConfig = JSON.parse(JSON.stringify(validConfig));
    updatedConfig.display_profiles[0].viewing_distance = 'far';
    card.setConfig(updatedConfig);

    expect(spy).toHaveBeenCalledOnce();
    spy.mockRestore();
  });

  it('setConfig does NOT call _runSolver when hass is not yet set', () => {
    const card = new DisplaySolverCard();
    const spy = vi.spyOn(card as any, '_runSolver');
    card.setConfig(validConfig);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
