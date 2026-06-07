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

  // Bug regression: _dispatch must update this._config so that subsequent
  // Lit re-renders (triggered by other @state changes like _expandedEntity) use
  // the latest config rather than the original value from when setConfig was called.
  // Without this, opening "Edit rules" after changing a dropdown snaps it back.
  it('_dispatch updates this._config so re-renders use the latest value', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    const newConfig = { ...baseConfig, defaults: { unavailable_action: 'show' as const } };
    (editor as any)._dispatch(newConfig);
    expect((editor as any)._config.defaults.unavailable_action).toBe('show');
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

  // -------------------------------------------------------------------------
  // Bug 4 regression: changing entity_id must reset rules
  //
  // Before the fix, _updateEntity spread `ent` with a new entity_id but kept
  // the old rules array.  Sun rules (above_horizon / below_horizon) were left
  // in place when the user switched to a garage door sensor, so nothing ever
  // matched and the display stayed blank.
  // -------------------------------------------------------------------------

  it('_changeEntityId: no event when newId equals current entity_id', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    const ent = baseConfig.entities[0];
    (editor as any)._changeEntityId(0, ent.entity_id, ent);
    expect(events).toHaveLength(0);
  });

  it('_changeEntityId: no event when newId is empty string', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    const ent = baseConfig.entities[0];
    (editor as any)._changeEntityId(0, '', ent);
    expect(events).toHaveLength(0);
  });

  it('_changeEntityId: dispatches event with new entity_id when id differs', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    const ent = baseConfig.entities[0];
    (editor as any)._changeEntityId(0, 'binary_sensor.garage', ent);
    expect(events).toHaveLength(1);
    expect(events[0].detail.config.entities[0].entity_id).toBe('binary_sensor.garage');
  });

  it('_changeEntityId: rules are reset to a single default rule when entity changes', () => {
    const sunConfig = {
      ...baseConfig,
      entities: [{
        id: 'sun',
        entity_id: 'sun.sun',
        rules: [
          { when: { state: 'above_horizon' }, then: { action: 'show' as const, tier: 'alert', color: 'orange' } },
          { when: { state: 'below_horizon' }, then: { action: 'hide' as const } },
        ],
      }],
    };
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(sunConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    const ent = sunConfig.entities[0];
    (editor as any)._changeEntityId(0, 'binary_sensor.garage', ent);

    expect(events).toHaveLength(1);
    const newRules = events[0].detail.config.entities[0].rules;
    expect(newRules).toHaveLength(1);
    // Old state-match rules must not survive
    const hasAboveHorizon = newRules.some((r: any) => r.when?.state === 'above_horizon');
    expect(hasAboveHorizon).toBe(false);
  });

  it('_changeEntityId: reset rule uses the first config tier', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any); // tiers: ['critical', 'alert']
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    const ent = baseConfig.entities[0];
    (editor as any)._changeEntityId(0, 'sensor.new', ent);
    const newRule = events[0].detail.config.entities[0].rules[0];
    expect(newRule.then.tier).toBe('critical'); // first tier in baseConfig
  });

  // -------------------------------------------------------------------------
  // Bug 1 regression: ha-select dispatches correct values through update paths
  //
  // The ha-select @selected event fires detail: { index } (not { value }).
  // The fix reads e.target.value instead.  We can't simulate DOM events here,
  // but we can verify the underlying _updateProfile and _updateEntity methods
  // dispatch the expected shape, and that passing an incorrect-type value
  // (like undefined) would result in no dispatch (the guard condition).
  // -------------------------------------------------------------------------

  it('_updateProfile dispatches with the updated profile', () => {
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(baseConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    const updatedProfile = { ...baseConfig.display_profiles[0], viewing_distance: 'far' as const };
    (editor as any)._updateProfile(0, updatedProfile);
    expect(events).toHaveLength(1);
    expect(events[0].detail.config.display_profiles[0].viewing_distance).toBe('far');
  });

  it('_updateProfile preserves other profiles unchanged', () => {
    const twoProfileConfig = {
      ...baseConfig,
      display_profiles: [
        { ...baseConfig.display_profiles[0], id: 'p1' },
        { ...baseConfig.display_profiles[0], id: 'p2', viewing_distance: 'near' as const },
      ],
    };
    const editor = new DisplaySolverCardEditor();
    editor.setConfig(twoProfileConfig as any);
    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));
    const updated = { ...twoProfileConfig.display_profiles[0], viewing_distance: 'far' as const };
    (editor as any)._updateProfile(0, updated);
    expect(events[0].detail.config.display_profiles[1].viewing_distance).toBe('near');
  });

  // -------------------------------------------------------------------------
  // Dropdown event-binding regression: native <select> @change must dispatch.
  //
  // The previous implementation used ha-select/@selected which silently broke
  // in newer HA versions because e.target.value was undefined on that element.
  // These tests render the component in a real DOM (happy-dom), find the
  // native <select>, and simulate a @change event — verifying the full
  // event-binding→dispatch chain, not just the helper methods.
  // -------------------------------------------------------------------------

  it('unavailable_action <select> dispatches config-changed when value changes', async () => {
    const editor = new DisplaySolverCardEditor();
    document.body.appendChild(editor);
    editor.setConfig(baseConfig as any);
    await (editor as any).updateComplete;

    const events: CustomEvent[] = [];
    editor.addEventListener('config-changed', (e) => events.push(e as CustomEvent));

    const selects = editor.shadowRoot!.querySelectorAll('select');
    // First select in the tiers section is the unavailable_action dropdown
    const sel = Array.from(selects).find(s =>
      s.querySelector('option[value="hide"]') !== null
    ) as HTMLSelectElement | undefined;
    expect(sel).toBeDefined();
    sel!.value = 'show';
    sel!.dispatchEvent(new Event('change', { bubbles: true }));

    expect(events).toHaveLength(1);
    expect(events[0].detail.config.defaults?.unavailable_action).toBe('show');

    document.body.removeChild(editor);
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
