import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { CardConfig, EntityConfig, DisplayProfile, Rule } from './solver/types';

@customElement('display-solver-card-editor')
export class DisplaySolverCardEditor extends LitElement {
  @state() private _config?: CardConfig;
  @state() private _expandedEntity: number | null = null;
  @state() private _hass?: Record<string, unknown>; // HomeAssistant, typed loosely to avoid HA-specific imports

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  get hass(): Record<string, unknown> | undefined {
    return this._hass;
  }

  set hass(hass: Record<string, unknown>) {
    this._hass = hass;
  }

  private _dispatch(config: CardConfig): void {
    this._config = config;
    this.dispatchEvent(new CustomEvent('config-changed', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    if (!this._config) return html``;
    return html`
      <div class="editor">
        ${this._renderTiersSection()}
        ${this._renderEntitiesSection()}
        ${this._renderProfilesSection()}
      </div>
    `;
  }

  private _renderTiersSection() {
    return html`
      <div class="section">
        <h3>Alert Levels &amp; Settings</h3>
        <ha-textfield
          label="Alert levels (comma-separated, most urgent first)"
          .value=${(this._config?.tiers ?? []).join(', ')}
          placeholder="critical, alert, status"
          @change=${(e: Event) => {
            const val = (e.target as HTMLInputElement).value;
            this._dispatch({ ...this._config!, tiers: val.split(',').map(s => s.trim()).filter(Boolean) });
          }}
        ></ha-textfield>
        <label class="select-row">
          <span class="select-label">When entity unavailable</span>
          <select
            .value=${this._config?.defaults?.unavailable_action ?? 'hide'}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value as 'hide' | 'show';
              this._dispatch({ ...this._config!, defaults: { ...this._config!.defaults, unavailable_action: value } });
            }}
          >
            <option value="hide">Hide (recommended)</option>
            <option value="show">Show (use with a specific unavailable rule)</option>
          </select>
        </label>
        <label class="checkbox-row">
          <ha-checkbox
            .checked=${this._config?.defaults?.show_info ?? false}
            @change=${(e: Event) => {
              this._dispatch({ ...this._config!, defaults: { ...this._config!.defaults, show_info: (e.target as HTMLInputElement).checked } });
            }}
          ></ha-checkbox>
          Show info lines by default
        </label>
      </div>
    `;
  }

  private _renderEntitiesSection() {
    const entities = this._config?.entities ?? [];
    return html`
      <div class="section">
        <h3>Entities</h3>
        ${entities.map((ent, i) => this._renderEntityRow(ent, i))}
        <button class="add-btn" @click=${this._addEntity}>+ Add entity</button>
      </div>
    `;
  }

  private _renderEntityRow(ent: EntityConfig, i: number) {
    return html`
      <div class="entity-row">
        <ha-textfield
          label="ID"
          .value=${ent.id}
          @change=${(e: Event) => this._updateEntity(i, { ...ent, id: (e.target as HTMLInputElement).value })}
        ></ha-textfield>
        ${this._hass
          ? html`<ha-entity-picker
              .hass=${this._hass}
              .value=${ent.entity_id}
              label="Entity"
              allow-custom-entity
              @value-changed=${(e: CustomEvent) => {
                const newId = (e.detail as { value: string }).value;
                this._changeEntityId(i, newId, ent);
              }}
            ></ha-entity-picker>`
          : html`<ha-textfield
              label="Entity ID (e.g. binary_sensor.garage)"
              .value=${ent.entity_id}
              placeholder="domain.entity_name"
              @change=${(e: Event) => this._updateEntity(i, { ...ent, entity_id: (e.target as HTMLInputElement).value })}
            ></ha-textfield>`
        }
        <ha-textfield
          label="Glyph name"
          .value=${ent.glyph ?? ''}
          placeholder="garage or mdi:garage"
          @change=${(e: Event) => this._updateEntity(i, { ...ent, glyph: (e.target as HTMLInputElement).value || undefined })}
        ></ha-textfield>
        <p class="field-hint">
          Use a <a href="https://fonts.google.com/icons?icon.style=Sharp" target="_blank" rel="noopener">Material Symbols Sharp</a> name (e.g. <code>garage</code>, <code>door_open</code>, <code>lock</code>) — these always work.
          MDI names (e.g. <code>mdi:garage</code>) only work for icons in the built-in mapping; if one shows as <code>?</code>, use the MSS name directly.
        </p>
        <ha-textfield
          label="Label (optional display name)"
          .value=${ent.label ?? ''}
          @change=${(e: Event) => this._updateEntity(i, { ...ent, label: (e.target as HTMLInputElement).value || undefined })}
        ></ha-textfield>
        <div class="entity-rules">
          <button class="toggle-btn" @click=${() => {
            this._expandedEntity = this._expandedEntity === i ? null : i;
          }}>
            ${this._expandedEntity === i ? 'Hide rules' : `Edit rules (${(ent.rules?.length ?? ent.thresholds?.length ?? 0)})`}
          </button>
          ${this._expandedEntity === i ? this._renderRuleEditor(ent, i) : ''}
        </div>
        <button class="remove-btn" @click=${() => this._removeEntity(i)}>Remove</button>
      </div>
    `;
  }

  private _renderRuleEditor(ent: EntityConfig, entityIndex: number) {
    const tiers = this._config?.tiers ?? [];
    const rules = ent.rules ?? [];
    return html`
      <div class="rule-editor">
        ${rules.map((rule, ri) => html`
          <div class="rule-row">
            <ha-textfield
              label="When state equals"
              .value=${rule.when.state ?? ''}
              placeholder="on, off, above_horizon…"
              @change=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                const updated: Rule = { ...rule, when: { ...rule.when, state: val || undefined } };
                this._updateEntityRules(entityIndex, rules.map((r, j) => j === ri ? updated : r));
              }}
            ></ha-textfield>
            <label class="select-row">
              <span class="select-label">Action</span>
              <select
                .value=${rule.then.action}
                @change=${(e: Event) => {
                  const value = (e.target as HTMLSelectElement).value as 'show' | 'hide' | 'indicator';
                  const updated: Rule = { ...rule, then: { ...rule.then, action: value } };
                  this._updateEntityRules(entityIndex, rules.map((r, j) => j === ri ? updated : r));
                }}
              >
                <option value="show">Show</option>
                <option value="hide">Hide</option>
                <option value="indicator">Indicator only</option>
              </select>
            </label>
            <label class="select-row">
              <span class="select-label">Tier</span>
              <select
                .value=${rule.then.tier ?? ''}
                @change=${(e: Event) => {
                  const value = (e.target as HTMLSelectElement).value;
                  const updated: Rule = { ...rule, then: { ...rule.then, tier: value || undefined } };
                  this._updateEntityRules(entityIndex, rules.map((r, j) => j === ri ? updated : r));
                }}
              >
                ${tiers.length === 0
                  ? html`<option value="" disabled>Define tiers above first</option>`
                  : tiers.map(t => html`<option value=${t}>${t}</option>`)
                }
              </select>
            </label>
            ${tiers.length === 0 ? html`<p class="field-hint">Add alert levels in the "Alert Levels &amp; Settings" section above first.</p>` : ''}
            <ha-textfield
              label="Color (name or hex)"
              .value=${rule.then.color ?? ''}
              placeholder="red, #ff6600…"
              @change=${(e: Event) => {
                const val = (e.target as HTMLInputElement).value;
                const updated: Rule = { ...rule, then: { ...rule.then, color: val || undefined } };
                this._updateEntityRules(entityIndex, rules.map((r, j) => j === ri ? updated : r));
              }}
            ></ha-textfield>
            <button class="remove-btn" @click=${() =>
              this._updateEntityRules(entityIndex, rules.filter((_, j) => j !== ri))
            }>Remove rule</button>
          </div>
        `)}
        <button class="add-btn" @click=${() =>
          this._updateEntityRules(entityIndex, [...rules, { when: {}, then: { action: 'show' as const } }])
        }>+ Add rule</button>
      </div>
    `;
  }

  // Extracted so tests can call it directly without simulating DOM events.
  _changeEntityId(index: number, newId: string, ent: EntityConfig): void {
    if (!newId || newId === ent.entity_id) return;
    // Reset rules so stale state-match rules from the old entity don't carry over.
    this._updateEntity(index, {
      ...ent,
      entity_id: newId,
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: this._config!.tiers?.[0], color: 'red' } }],
      thresholds: undefined,
    });
  }

  private _updateEntity(i: number, updated: EntityConfig): void {
    if (!this._config) return;
    const entities = [...(this._config.entities ?? [])];
    entities[i] = updated;
    this._dispatch({ ...this._config, entities });
  }

  private _updateEntityRules(entityIndex: number, rules: Rule[]): void {
    if (!this._config) return;
    const entities = [...(this._config.entities ?? [])];
    entities[entityIndex] = { ...entities[entityIndex], rules };
    this._dispatch({ ...this._config, entities });
  }

  private _addEntity(): void {
    if (!this._config) return;
    const entities = [...(this._config.entities ?? [])];
    const newEntity: EntityConfig = {
      id: `entity_${entities.length + 1}`,
      entity_id: '',
      rules: [{ when: { state: 'on' }, then: { action: 'show', tier: this._config.tiers?.[0], color: 'red' } }],
    };
    this._dispatch({ ...this._config, entities: [...entities, newEntity] });
  }

  private _removeEntity(i: number): void {
    if (!this._config) return;
    const entities = (this._config.entities ?? []).filter((_, j) => j !== i);
    this._dispatch({ ...this._config, entities });
  }

  private _renderProfilesSection() {
    const profiles = this._config?.display_profiles ?? [];
    return html`
      <div class="section">
        <h3>Display Profiles</h3>
        ${profiles.map((p, i) => this._renderProfileRow(p, i))}
        <button class="add-btn" @click=${this._addProfile}>+ Add profile</button>
        <p class="yaml-note">
          Advanced layout and zone configuration: edit the card YAML directly.
          See the <a href="https://github.com/b3nj1/lovelace-display-solver#readme" target="_blank" rel="noopener">README</a> for the full schema reference.
        </p>
      </div>
    `;
  }

  private _renderProfileRow(p: DisplayProfile, i: number) {
    return html`
      <div class="profile-row">
        <ha-textfield
          label="Profile ID"
          .value=${p.id}
          @change=${(e: Event) => this._updateProfile(i, { ...p, id: (e.target as HTMLInputElement).value })}
        ></ha-textfield>
        <label class="select-row">
          <span class="select-label">Output type</span>
          <select
            .value=${p.type}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value as DisplayProfile['type'];
              this._updateProfile(i, { ...p, type: value });
            }}
          >
            <option value="canvas">Canvas (browser preview)</option>
            <option value="esphome">ESPHome display</option>
          </select>
        </label>
        ${p.type === 'esphome' ? html`
          <ha-textfield
            label="Service (esphome.device_set_display_glyphs)"
            .value=${p.service ?? ''}
            placeholder="esphome.device_set_display_glyphs"
            @change=${(e: Event) => this._updateProfile(i, { ...p, service: (e.target as HTMLInputElement).value || undefined })}
          ></ha-textfield>
        ` : ''}
        <ha-textfield
          label="Width (px)"
          type="number"
          .value=${String(p.screen_px[0])}
          @change=${(e: Event) => {
            const w = parseInt((e.target as HTMLInputElement).value, 10);
            if (!isNaN(w)) this._updateProfile(i, { ...p, screen_px: [w, p.screen_px[1]] });
          }}
        ></ha-textfield>
        <ha-textfield
          label="Height (px)"
          type="number"
          .value=${String(p.screen_px[1])}
          @change=${(e: Event) => {
            const h = parseInt((e.target as HTMLInputElement).value, 10);
            if (!isNaN(h)) this._updateProfile(i, { ...p, screen_px: [p.screen_px[0], h] });
          }}
        ></ha-textfield>
        <label class="select-row">
          <span class="select-label">Viewing distance</span>
          <select
            .value=${p.viewing_distance}
            @change=${(e: Event) => {
              const value = (e.target as HTMLSelectElement).value as DisplayProfile['viewing_distance'];
              this._updateProfile(i, { ...p, viewing_distance: value });
            }}
          >
            <option value="close">Close (desk / tablet)</option>
            <option value="near">Near (across the room)</option>
            <option value="far">Far (hallway / at a distance)</option>
          </select>
          <span class="field-hint">Only affects layout selection when the profile has multiple layouts configured.</span>
        </label>
        <label class="checkbox-row">
          <ha-checkbox
            .checked=${p.burn_in_drift}
            @change=${(e: Event) => this._updateProfile(i, { ...p, burn_in_drift: (e.target as HTMLInputElement).checked })}
          ></ha-checkbox>
          Enable burn-in drift (OLED displays)
        </label>
        <ha-textfield
          label="Icon page dwell (seconds — only when icons overflow the layout)"
          type="number"
          .value=${String(p.page_dwell_s ?? 5)}
          @change=${(e: Event) => {
            const val = parseFloat((e.target as HTMLInputElement).value);
            if (!isNaN(val)) this._updateProfile(i, { ...p, page_dwell_s: val });
          }}
        ></ha-textfield>
        <button class="remove-btn" @click=${() => this._removeProfile(i)}>Remove profile</button>
      </div>
    `;
  }

  private _updateProfile(i: number, updated: DisplayProfile): void {
    if (!this._config) return;
    const profiles = [...(this._config.display_profiles ?? [])];
    profiles[i] = updated;
    this._dispatch({ ...this._config, display_profiles: profiles });
  }

  private _addProfile(): void {
    if (!this._config) return;
    const profiles = [...(this._config.display_profiles ?? [])];
    const newProfile: DisplayProfile = {
      id: `profile_${profiles.length + 1}`,
      type: 'canvas',
      screen_px: [400, 300],
      margin_px: [8, 8],
      burn_in_drift: false,
      viewing_distance: 'near',
      idle_glyph: 'check_circle',
      glyph_sizes: { small: { px: 24, fits_cols: 4 } },
      layouts: [{ icon: { min: 1, max: 16, size: 'small', cols: 4 }, info: { min: 0, max: 3 } }],
    };
    this._dispatch({ ...this._config, display_profiles: [...profiles, newProfile] });
  }

  private _removeProfile(i: number): void {
    if (!this._config) return;
    const profiles = (this._config.display_profiles ?? []).filter((_, j) => j !== i);
    this._dispatch({ ...this._config, display_profiles: profiles });
  }

  static styles = css`
    .editor { display: flex; flex-direction: column; gap: 16px; padding: 8px; }
    .section { border: 1px solid var(--divider-color, #e0e0e0); border-radius: 8px; padding: 12px; }
    .section h3 { margin: 0 0 12px; font-size: 1em; color: var(--primary-text-color); }
    .entity-row, .profile-row { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .entity-row:last-of-type, .profile-row:last-of-type { border-bottom: none; }
    .rule-editor { margin-left: 16px; padding: 8px; background: var(--secondary-background-color, #f5f5f5); border-radius: 4px; }
    .rule-row { display: flex; flex-direction: column; gap: 6px; margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid var(--divider-color, #e0e0e0); }
    .checkbox-row { display: flex; align-items: center; gap: 8px; }
    .add-btn { background: var(--primary-color); color: white; border: none; padding: 6px 14px; border-radius: 4px; cursor: pointer; font-size: 0.9em; }
    .remove-btn { background: transparent; color: var(--error-color, red); border: 1px solid var(--error-color, red); padding: 4px 10px; border-radius: 4px; cursor: pointer; align-self: flex-start; }
    .toggle-btn { background: transparent; color: var(--primary-color); border: 1px solid var(--primary-color); padding: 4px 10px; border-radius: 4px; cursor: pointer; }
    .yaml-note { font-size: 0.85em; color: var(--secondary-text-color); margin: 8px 0 0; }
    .yaml-note a { color: var(--primary-color); }
    .field-hint { font-size: 0.8em; color: var(--secondary-text-color); margin: 2px 0 4px; }
    .field-hint a { color: var(--primary-color); }
    .field-hint code { background: var(--secondary-background-color, #f5f5f5); padding: 1px 4px; border-radius: 3px; }
    .select-row { display: flex; flex-direction: column; gap: 4px; }
    .select-label { font-size: 0.85em; color: var(--secondary-text-color, rgba(0,0,0,0.6)); }
    select {
      padding: 8px 10px;
      border: 1px solid var(--input-idle-line-color, rgba(0,0,0,0.42));
      border-radius: 4px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color, #000);
      font-family: inherit;
      font-size: 0.95em;
      cursor: pointer;
    }
    select:focus { outline: none; border-color: var(--primary-color, #03a9f4); }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'display-solver-card-editor': DisplaySolverCardEditor;
  }
}
