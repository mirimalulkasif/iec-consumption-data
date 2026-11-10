# IEC Daily

Standalone plugin for **Israel Electric Corporation** smart-meter customers.

Sign in with Israeli ID + OTP (same Okta flow as the IEC app). The app pulls **daily kWh** from IEC’s `RemoteReadingRange` API — you do not download or upload a CSV.

Separate from the Arad water-meter app.

## Run

```bash
cd iec-daily
npm install
npm run dev -- --port 3851
```

Open [http://127.0.0.1:3851](http://127.0.0.1:3851).

## How it works

1. Enter the account holder’s Israeli ID  
2. Enter the SMS/email OTP IEC sends  
3. App loads contracts → smart meter → last ~2 months of daily consumption  
4. Refresh anytime; session cookie keeps you signed in  

Demo mode (no IEC account): use **Preview demo data**, or `GET /api/iec/readings?demo=1`.

IEC smart-meter readings often lag by about 1–2 days.

## API routes

| Route | Purpose |
| --- | --- |
| `POST /api/iec/login` | Start Okta login, send OTP |
| `POST /api/iec/verify` | Verify OTP, store session |
| `GET /api/iec/readings` | Pull daily kWh from IEC |
| `POST /api/iec/logout` | Clear session |

Optional env:

- `IEC_SESSION_SECRET` — cookie signing secret  
- `IEC_MOCK=1` — always return demo readings  
- `IEC_CLIENT_ID` / `IEC_REDIRECT_URI` — override Okta app defaults (usually leave alone)

## Stack

Next.js, TypeScript, Tailwind CSS. Talks to `iecapi.iec.co.il` + `iec-ext.okta.com` (same public API used by [py-iec-api](https://github.com/GuyKh/py-iec-api) / Home Assistant).
