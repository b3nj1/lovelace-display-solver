import { LitElement, html, css, type PropertyValues } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import type { CardConfig, DisplayProfile, SolverResult } from './solver/types';
import { validateCardConfig } from './solver/types';
import { solve } from './solver/index';
import { packESPhomePayload } from './adapters/esphome';
import { renderToCanvas } from './adapters/canvas';
import { resolveGlyph, resolveGlyphForCanvas } from './utils/glyph';

interface HomeAssistant {
  states: Record<string, { state: string; attributes: Record<string, unknown> }>;
  callService(domain: string, service: string, serviceData?: object): Promise<void>;
  formatEntityState: (stateObj: { state: string; attributes: Record<string, unknown> }) => string;
}

@customElement('display-solver-card')
export class DisplaySolverCard extends LitElement {
  @state() private _config?: CardConfig;
  @state() private _hass?: HomeAssistant;
  @state() private _errors: string[] = [];

  private _results: Map<string, SolverResult> = new Map();
  private _pageState: Record<string, { currentPage: number; dwellTimer?: ReturnType<typeof setTimeout> }> = {};

  setConfig(config: unknown): void {
    const errors = validateCardConfig(config);
    if (errors.length > 0) {
      this._errors = errors;
      return;
    }
    this._config = structuredClone(config as CardConfig);
    this._errors = [];
    if (this._hass) {
      this._runSolver();
    }
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    // Cancel pending dwell timers so stale callbacks don't fire after re-solve.
    // Do NOT reset currentPage here — that would prevent pagination from advancing
    // on active HA instances where sensors update more frequently than the dwell period.
    for (const key of Object.keys(this._pageState)) {
      clearTimeout(this._pageState[key].dwellTimer);
    }
    this._runSolver();
  }

  get hass(): HomeAssistant | undefined {
    return this._hass;
  }

  private _runSolver(): void {
    if (!this._config || !this._hass) return;

    for (const profile of this._config.display_profiles) {
      this._pageState[profile.id] ??= { currentPage: 0 };
      const ps = this._pageState[profile.id];

      const glyphResolver = profile.type === 'canvas' ? resolveGlyphForCanvas : resolveGlyph;
      const result = solve(
        this._config.entities,
        this._hass.states,
        this._config.tiers,
        this._config.defaults ?? {},
        this._config.groups ?? [],
        profile,
        glyphResolver,
        ps.currentPage,
      );

      this._results.set(profile.id, result);

      if (profile.type === 'canvas') {
        this.requestUpdate();
      } else if (profile.type === 'esphome' && !result.error) {
        const parts = profile.service!.split('.');
        const domain = parts[0];
        const svcName = parts.slice(1).join('.');
        const payload = packESPhomePayload(result, profile);
        this._hass.callService(domain, svcName, payload).catch((err: unknown) => {
          console.error('display-solver: callService failed', err);
        });
      }

      if (result.page_count > 1) {
        const dwellMs = (profile.page_dwell_s ?? 5.0) * 1000;
        ps.dwellTimer = setTimeout(() => {
          const ps2 = this._pageState[profile.id];
          if (ps2) {
            ps2.currentPage = (ps2.currentPage + 1) % result.page_count;
            this._runSolver();
          }
        }, dwellMs);
      }
    }
  }

  updated(changedProperties: PropertyValues): void {
    super.updated(changedProperties);
    if (!this._config) return;
    for (const profile of this._config.display_profiles) {
      if (profile.type !== 'canvas') continue;
      const result = this._results.get(profile.id);
      if (!result) continue;
      const canvas = this.shadowRoot?.querySelector(`#canvas-${profile.id}`) as HTMLCanvasElement | null;
      if (canvas) {
        renderToCanvas(result, profile, canvas).catch((err: unknown) => {
          console.error('display-solver: renderToCanvas failed', err);
        });
      }
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const key of Object.keys(this._pageState)) {
      clearTimeout(this._pageState[key].dwellTimer);
    }
  }

  render() {
    if (this._errors.length > 0) {
      return html`<ha-card>
        <div class="error">
          <b>Display Solver config error:</b>
          <ul>${this._errors.map(e => html`<li>${e}</li>`)}</ul>
        </div>
      </ha-card>`;
    }
    const canvasProfiles = this._config?.display_profiles.filter(p => p.type === 'canvas') ?? [];
    return html`<ha-card>
      ${canvasProfiles.map(p => html`
        <div class="profile-wrapper">
          <canvas id="canvas-${p.id}"></canvas>
        </div>
      `)}
    </ha-card>`;
  }

  getCardSize(): number {
    return Math.ceil(this._config?.display_profiles?.length ?? 1);
  }

  getGridOptions(): { rows: number; columns: number; min_rows: number; max_rows: number } {
    return {
      rows: 3,
      columns: 4,
      min_rows: 2,
      max_rows: Math.max(6, (this._config?.display_profiles?.length ?? 1) * 3),
    };
  }

  static getConfigElement(): HTMLElement {
    // fire-and-forget; editor element registers itself on module load.
    // This only works correctly because rollup.config.js uses inlineDynamicImports: true.
    import('./editor.js');
    return document.createElement('display-solver-card-editor');
  }

  static getStubConfig(_hass: HomeAssistant): CardConfig {
    return {
      tiers: ['critical', 'alert', 'status'],
      defaults: { unavailable_action: 'hide', show_info: true },
      entities: [{
        id: 'sun',
        entity_id: 'sun.sun',
        glyph: 'sunny',
        rules: [
          { when: { state: 'above_horizon' }, then: { action: 'show', tier: 'alert', color: 'orange' } },
          { when: { state: 'below_horizon' }, then: { action: 'hide' } },
        ],
      }],
      display_profiles: [{
        id: 'preview',
        type: 'canvas',
        screen_px: [256, 256],
        margin_px: [8, 8],
        burn_in_drift: false,
        viewing_distance: 'close',
        idle_glyph: 'check_circle',
        glyph_sizes: { small: { px: 48, fits_cols: 3 } },
        layouts: [{ icon: { min: 1, max: 9, size: 'small', cols: 3 }, info: { min: 0, max: 2 } }],
      }],
    };
  }

  static styles = css`
    ha-card {
      background: var(--card-background-color);
      overflow: hidden;
    }
    .profile-wrapper {
      padding: 8px;
    }
    canvas {
      display: block;
      width: 100%;
    }
    .error {
      color: var(--error-color, red);
      padding: 8px;
    }
    .error ul {
      margin: 4px 0;
      padding-left: 1.5em;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    'display-solver-card': DisplaySolverCard;
  }
  interface Window {
    customCards: Array<{
      type: string;
      name: string;
      description: string;
      preview: boolean;
      documentationURL: string;
    }>;
  }
}

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'display-solver-card',
  name: 'Display Solver',
  description: 'Priority dashboard for ESPHome and Chromecast displays',
  preview: true,
  documentationURL: 'https://github.com/b3nj1/lovelace-display-solver',
});
