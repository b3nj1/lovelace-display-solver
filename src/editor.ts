import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('display-solver-card-editor')
export class DisplaySolverCardEditor extends LitElement {
  private _config: Record<string, unknown> = {};

  setConfig(config: Record<string, unknown>): void {
    this._config = config;
  }

  render() {
    return html`<p>Editor coming soon</p>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'display-solver-card-editor': DisplaySolverCardEditor;
  }
}
