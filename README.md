# IEC Daily

Home Assistant custom integration + Lovelace widget for **Israel Electric Corporation** smart meters.

Pulls daily kWh from IEC’s API (same Okta ID + OTP flow as the official app). No CSV downloads.

## What you get

| Piece | What it does |
| --- | --- |
| **Latest daily consumption** sensor | Newest day IEC has published (often lags ~1–2 days) |
| **Period consumption** sensor | Sum for a From/To range you choose |
| **Predicted bill** sensor | Estimate for the current billing cycle (kWh tariff + delivery/distribution/KVA when available) |
| **IEC Daily Lovelace card** | Widget: big latest-kWh hero, date period, bill prediction, recent days |

There is also a standalone web app under [`iec-daily/`](iec-daily/) if you want the same data outside Home Assistant.

## Install (Home Assistant)

### HACS (manual / custom repository)

1. Copy `custom_components/iec_daily` into your HA `config/custom_components/` folder  
   (or add this repo as a custom HACS integration when published).
2. Restart Home Assistant.
3. **Settings → Devices & services → Add integration → IEC Daily**
4. Enter Israeli ID → OTP from SMS/email.
5. Add the Lovelace card (see below).

### Lovelace card

The integration serves the card at `/iec_daily_static/iec-daily-card.js` and tries to register it automatically.

If the card does not appear under **Add card → Custom**, add a resource:

1. **Settings → Dashboards → ⋮ → Resources → Add resource**
2. URL: `/iec_daily_static/iec-daily-card.js`
3. Type: **JavaScript module**

Card YAML:

```yaml
type: custom:iec-daily-card
name: IEC Daily
latest_entity: sensor.iec_daily_latest_daily_consumption
period_entity: sensor.iec_daily_period_consumption
bill_entity: sensor.iec_daily_predicted_bill
```

Entity IDs may include your contract number — pick them from **Developer tools → States**.

## Services

- `iec_daily.set_period` — `{ from: YYYY-MM-DD, to: YYYY-MM-DD }`
- `iec_daily.refresh` — pull again from IEC

## How it appears in HomeKit

This integration creates **Home Assistant sensors**. They do **not** appear in Apple Home by themselves.

To show them in HomeKit:

1. Enable HA’s **HomeKit Bridge** (or HomeKit Device) integration  
2. Include the IEC Daily sensors (energy / monetary) in the bridge expose list  
3. In the Home app they show up as **sensors** (kWh / ₪), not as a native “electricity meter” accessory type  

Predicted bill is a monetary sensor; latest/period are energy sensors.

## Bill prediction note

The predicted sum uses IEC’s `futureConsumption` when available, otherwise projects this month’s average daily use to month end, then applies the published kWh tariff plus available fixed tariffs. It is an **estimate**, not the official IEC invoice.

## Web app (optional)

```bash
cd iec-daily
npm install
npm run dev -- --port 3851
```

## License

Use at your own risk with your IEC account credentials. Not affiliated with חברת החשמל.
