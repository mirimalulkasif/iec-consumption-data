/**
 * IEC Daily Lovelace card
 * Shows latest daily kWh, period picker, period total, and predicted bill.
 *
 * type: custom:iec-daily-card
 * latest_entity: sensor.iec_daily_latest_daily_consumption
 * period_entity: sensor.iec_daily_period_consumption
 * bill_entity: sensor.iec_daily_predicted_bill
 */
class IecDailyCard extends HTMLElement {
  static getStubConfig(hass, unusedEntities, allEntities) {
    const pick = (needle) =>
      allEntities.find((e) => e.includes(needle)) || unusedEntities.find((e) => e.includes(needle));
    return {
      type: "custom:iec-daily-card",
      latest_entity: pick("latest_daily_consumption") || "",
      period_entity: pick("period_consumption") || "",
      bill_entity: pick("predicted_bill") || "",
    };
  }

  setConfig(config) {
    if (!config.latest_entity) {
      throw new Error("Set latest_entity to the Latest daily consumption sensor");
    }
    this._config = {
      name: "IEC Daily",
      ...config,
    };
    this._from = "";
    this._to = "";
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 5;
  }

  _state(entityId) {
    if (!entityId || !this._hass) return null;
    return this._hass.states[entityId] || null;
  }

  _syncDatesFromPeriod() {
    const period = this._state(this._config.period_entity);
    if (!period) return;
    const from = period.attributes.period_from;
    const to = period.attributes.period_to;
    if (from && !this._from) this._from = from;
    if (to && !this._to) this._to = to;
  }

  async _applyPeriod() {
    if (!this._from || !this._to || !this._hass) return;
    this._busy = true;
    this._render();
    try {
      await this._hass.callService("iec_daily", "set_period", {
        from: this._from,
        to: this._to,
      });
    } catch (err) {
      this._error = err?.message || String(err);
    } finally {
      this._busy = false;
      this._render();
    }
  }

  async _refresh() {
    if (!this._hass) return;
    this._busy = true;
    this._render();
    try {
      await this._hass.callService("iec_daily", "refresh", {});
    } catch (err) {
      this._error = err?.message || String(err);
    } finally {
      this._busy = false;
      this._render();
    }
  }

  _preset(days) {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (days - 1));
    const ymd = (d) => d.toISOString().slice(0, 10);
    this._from = ymd(start);
    this._to = ymd(end);
    this._applyPeriod();
  }

  _render() {
    if (!this._config) return;
    this._syncDatesFromPeriod();

    const latest = this._state(this._config.latest_entity);
    const period = this._state(this._config.period_entity);
    const bill = this._config.bill_entity
      ? this._state(this._config.bill_entity)
      : null;

    const latestVal = latest ? Number(latest.state) : null;
    const latestDay = latest?.attributes?.day || "";
    const periodVal = period ? Number(period.state) : null;
    const daysCount = period?.attributes?.days_count ?? "";
    const billVal = bill && bill.state !== "unknown" ? Number(bill.state) : null;
    const projected = bill?.attributes?.projected_kwh;
    const method = bill?.attributes?.method || "";
    const dayRows = Array.isArray(period?.attributes?.days)
      ? [...period.attributes.days].reverse().slice(0, 14)
      : [];
    const maxKwh = dayRows.reduce((m, d) => Math.max(m, Number(d.kwh) || 0), 1);

    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; }
        .card {
          background: var(--ha-card-background, var(--card-background-color, #fff));
          border-radius: var(--ha-card-border-radius, 12px);
          box-shadow: var(--ha-card-box-shadow, none);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color));
          padding: 16px;
          color: var(--primary-text-color);
          font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
        }
        .title { font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; }
        .hero {
          background: #1a1714;
          color: #f7f3ea;
          border-radius: 12px;
          padding: 16px 18px;
          margin-bottom: 14px;
        }
        .hero .label {
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #ffd56a;
          margin: 0 0 6px;
        }
        .hero .value {
          font-size: 2.4rem;
          font-weight: 650;
          line-height: 1.1;
          margin: 0;
        }
        .hero .unit { font-size: 1rem; font-weight: 400; opacity: 0.75; margin-inline-start: 6px; }
        .hero .meta { margin-top: 6px; font-size: 0.85rem; opacity: 0.75; }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 14px;
        }
        .stat {
          border: 1px solid var(--divider-color);
          border-radius: 10px;
          padding: 10px 12px;
        }
        .stat .label { font-size: 0.75rem; opacity: 0.7; }
        .stat .value { font-size: 1.25rem; font-weight: 600; margin-top: 2px; }
        .period {
          display: grid;
          grid-template-columns: 1fr 1fr auto;
          gap: 8px;
          align-items: end;
          margin-bottom: 8px;
        }
        label { display: grid; gap: 4px; font-size: 0.8rem; }
        input[type="date"] {
          border: 1px solid var(--divider-color);
          border-radius: 8px;
          padding: 8px;
          background: var(--secondary-background-color, transparent);
          color: inherit;
        }
        button {
          border: 0;
          border-radius: 8px;
          padding: 9px 12px;
          background: var(--primary-color);
          color: var(--text-primary-color, #fff);
          cursor: pointer;
          font-weight: 600;
        }
        button.secondary {
          background: transparent;
          color: var(--primary-text-color);
          border: 1px solid var(--divider-color);
        }
        button:disabled { opacity: 0.55; cursor: default; }
        .presets { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 12px; }
        .error {
          background: rgba(220, 53, 69, 0.12);
          color: var(--error-color, #c62828);
          border-radius: 8px;
          padding: 8px 10px;
          font-size: 0.85rem;
          margin-bottom: 10px;
        }
        .days { list-style: none; margin: 0; padding: 0; }
        .days li {
          display: grid;
          grid-template-columns: 1fr 72px 1fr;
          gap: 8px;
          align-items: center;
          padding: 6px 0;
          border-top: 1px solid var(--divider-color);
          font-size: 0.85rem;
        }
        .bar {
          height: 8px;
          border-radius: 999px;
          background: var(--divider-color);
          overflow: hidden;
        }
        .bar > span {
          display: block;
          height: 100%;
          background: #e0a100;
        }
        .muted { opacity: 0.65; font-size: 0.8rem; }
      </style>
      <div class="card">
        <div class="title">${this._escape(this._config.name || "IEC Daily")}</div>
        ${this._error ? `<div class="error">${this._escape(this._error)}</div>` : ""}
        <div class="hero">
          <p class="label">Latest daily consumption</p>
          <p class="value">
            ${latestVal == null || Number.isNaN(latestVal) ? "—" : latestVal.toFixed(2)}
            <span class="unit">kWh</span>
          </p>
          <div class="meta">${this._escape(latestDay || "Waiting for IEC data")}</div>
        </div>
        <div class="grid">
          <div class="stat">
            <div class="label">Period total</div>
            <div class="value">${periodVal == null || Number.isNaN(periodVal) ? "—" : periodVal.toFixed(1)} kWh</div>
            <div class="muted">${this._escape(String(daysCount))} days</div>
          </div>
          <div class="stat">
            <div class="label">Predicted bill</div>
            <div class="value">${billVal == null || Number.isNaN(billVal) ? "—" : "₪" + billVal.toFixed(0)}</div>
            <div class="muted">${projected != null ? this._escape(String(projected)) + " kWh · " + this._escape(method) : "tariff-based estimate"}</div>
          </div>
        </div>
        <div class="period">
          <label>From<input type="date" id="from" value="${this._escape(this._from)}"></label>
          <label>To<input type="date" id="to" value="${this._escape(this._to)}"></label>
          <button id="apply" ${this._busy ? "disabled" : ""}>${this._busy ? "…" : "Apply"}</button>
        </div>
        <div class="presets">
          <button class="secondary" id="d7" ${this._busy ? "disabled" : ""}>Last 7 days</button>
          <button class="secondary" id="d30" ${this._busy ? "disabled" : ""}>Last 30 days</button>
          <button class="secondary" id="refresh" ${this._busy ? "disabled" : ""}>Refresh IEC</button>
        </div>
        <ul class="days">
          ${dayRows
            .map((d) => {
              const kwh = Number(d.kwh) || 0;
              const width = Math.max(4, Math.round((kwh / maxKwh) * 100));
              return `<li>
                <span>${this._escape(d.date)}</span>
                <span style="text-align:end">${kwh.toFixed(2)}</span>
                <span class="bar"><span style="width:${width}%"></span></span>
              </li>`;
            })
            .join("")}
        </ul>
      </div>
    `;

    const fromEl = this.shadowRoot.getElementById("from");
    const toEl = this.shadowRoot.getElementById("to");
    fromEl?.addEventListener("change", (e) => {
      this._from = e.target.value;
    });
    toEl?.addEventListener("change", (e) => {
      this._to = e.target.value;
    });
    this.shadowRoot.getElementById("apply")?.addEventListener("click", () => this._applyPeriod());
    this.shadowRoot.getElementById("d7")?.addEventListener("click", () => this._preset(7));
    this.shadowRoot.getElementById("d30")?.addEventListener("click", () => this._preset(30));
    this.shadowRoot.getElementById("refresh")?.addEventListener("click", () => this._refresh());
  }

  _escape(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
}

customElements.define("iec-daily-card", IecDailyCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "iec-daily-card",
  name: "IEC Daily",
  description: "Latest daily kWh, selectable period, and predicted IEC bill",
  preview: true,
});
