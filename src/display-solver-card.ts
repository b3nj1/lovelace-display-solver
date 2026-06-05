import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

interface CardConfig {
  type: string;
  [key: string]: unknown;
}

interface StateObject {
  state: string;
  attributes: Record<string, unknown>;
  entity_id: string;
}

interface HomeAssistant {
  states: Record<string, StateObject>;
  callService(domain: string, service: string, serviceData?: Record<string, unknown>): Promise<void>;
  formatEntityState: (stateObj: StateObject) => string;
  [key: string]: unknown;
}

@customElement('display-solver-card')
export class DisplaySolverCard extends LitElement {
  private _config: CardConfig | null = null;
  private _hass: HomeAssistant | null = null;

  setConfig(config: CardConfig): void {
    if (!config) {
      throw new Error('Invalid configuration');
    }
    this._config = { ...config };
  }

  set hass(hass: HomeAssistant) {
    this._hass = hass;
    this.requestUpdate();
  }

  get hass(): HomeAssistant | null {
    return this._hass;
  }

  getCardSize(): number {
    return 3;
  }

  getGridOptions(): { rows: number; columns: number; min_rows: number; max_rows: number } {
    return { rows: 3, columns: 4, min_rows: 2, max_rows: 6 };
  }

  static async getConfigElement(): Promise<HTMLElement> {
    await import('./editor.js');
    return document.createElement('display-solver-card-editor');
  }

  render() {
    return html`
      <ha-card>
        <p>Display Solver</p>
      </ha-card>
    `;
  }
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
  documentationURL: 'https://github.com/YOUR_ORG/lovelace-display-solver',
});
