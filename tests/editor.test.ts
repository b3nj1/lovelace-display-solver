// @vitest-environment happy-dom
// Note: visual rendering of HA components (ha-textfield, ha-select, ha-checkbox)
// cannot be unit-tested without a real HA frontend. These tests cover the
// data-dispatch logic only.
import { vi, describe, it, expect } from 'vitest';
import { DisplaySolverCardEditor } from '../src/editor';

const baseConfig = {
  tiers: ['critical', 'alert'],
  entities: [{
    id: 'e1',
    entity_id: 'binary_sensor.test',
    rules: [{ when: { state: 'on' }, then: { action: 'show' as const, tier: 'alert', color: 'red' } }],
  }],
  display_profiles: [{
    id: 'p1',
    type: 'canvas' as const,
    screen_px: [128, 128] as [number, number],
    margin_px: [4, 4] as [number, number],
    burn_in_drift: false,
    viewing_distance: 'near' as const,
    idle_glyph: 'check_circle',
    glyph_sizes: { small: { px: 24, fits_cols: 4 } },
    layouts: [{ icon: { min: 1, max: 16, size: 'small', cols: 4 }, info: { min: 0, max: 3 } }],
  }],
};

describe('DisplaySolverCardEditor', () => {
  it('setConfig stores the config', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    expect((editor as any)._config).toBe(baseConfig);
  });

  it('_dispatch emits config-changed event with config in detail', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    (editor as any)._dispatch(baseConfig);
    expect(events).toHaveLength(1);
    expect(events[0].detail.config).toBe(baseConfig);
  });

  it('config-changed event has bubbles: true and composed: true', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    let capturedEvent: CustomEvent | null = null;
    editor.addEventListener('config-changed', (e) => { capturedEvent = e as CustomEvent; });
    (editor as any)._dispatch(baseConfig);
    expect(capturedEvent).not.toBeNull();
    expect((capturedEvent as unknown as CustomEvent).bubbles).toBe(true);
    expect((capturedEvent as unknown as CustomEvent).composed).toBe(true);
  });

  it('dispatching updated defaults.unavailable_action fires event with new value', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    const updatedConfig = {
      ...baseConfig,
      defaults: { unavailable_action: 'show' as const },
    };
    (editor as any)._dispatch(updatedConfig);
    expect(events[0].detail.config.defaults?.unavailable_action).toBe('show');
  });

  it('_addEntity dispatches config with one more entity', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    (editor as any)._addEntity();
    expect(events).toHaveLength(1);
    expect(events[0].detail.config.entities).toHaveLength(2);
  });

  it('_removeEntity dispatches config with one fewer entity', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    (editor as any)._removeEntity(0);
    expect(events).toHaveLength(1);
    expect(events[0].detail.config.entities).toHaveLength(0);
  });
});
