# IEC Consumption Data

Israel Electric Corporation (**חברת החשמל**) smart-meter tools:

1. **Home Assistant integration** — `custom_components/iec_daily`
2. **Optional web app** — `iec-daily/` (ID + OTP pull in the browser)

No water-meter / Arad code. Daily kWh is pulled from IEC’s API (Okta ID + OTP). No CSV downloads.

## Home Assistant

### Install with HACS (GUI)

1. HACS → **⋮** (top right) → **Custom repositories**
2. Repository: `https://github.com/mirimalulkasif/iec-consumption-data`
3. Type / category: **Integration** → **Add**
4. HACS → **Integrations** → search **IEC Daily** → **Download**
5. **Restart** Home Assistant
6. Settings → **Devices & services** → **Add integration** → **IEC Daily**
7. Enter Israeli ID → OTP

If it still does not show after adding the custom repository, open **HACS → Integrations → ⋮ → Check for updates**, or restart HA once, then search again for **IEC Daily** (not “iec consumption”).

### Manual install

1. Copy `custom_components/iec_daily` into your HA  
   `config/custom_components/iec_daily`
2. Restart Home Assistant
3. **Settings → Devices & services → Add integration → IEC Daily**
4. Enter Israeli ID → OTP

### Lovelace card

```yaml
type: custom:iec-daily-card
latest_entity: sensor.iec_daily_latest_daily_consumption
period_entity: sensor.iec_daily_period_consumption
bill_entity: sensor.iec_daily_predicted_bill
```

If needed, add resource `/iec_daily_static/iec-daily-card.js` (JavaScript module).

### Sensors

| Sensor | Meaning |
| --- | --- |
| Latest daily consumption | Newest day IEC published (kWh) |
| Period consumption | Sum for the selected From/To dates |
| Predicted bill | Estimate for the current cycle (₪) |
| kWh tariff | Published tariff |

Services: `iec_daily.set_period`, `iec_daily.refresh`.

### HomeKit

Expose the sensors via **HomeKit Bridge** if you want them in Apple Home (energy / monetary tiles).

## Web app (optional)

```bash
cd iec-daily
npm install
npm run dev -- --port 3851
```

## Clone this repo

```bash
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh
origin auth login
origin repo clone miri-malul/iec-consumption-data
```

Repo: https://cursor.com/codebase/miri-malul/iec-consumption-data  

Not affiliated with חברת החשמל.
