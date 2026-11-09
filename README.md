# Arad Meter Access

Guide and dashboard for reading an **Arad** water meter in Israel when you own the meter but cannot see the data.

## What you can get

| Path | What it gives you | What you need |
| --- | --- | --- |
| **Read Your Meter Pro** (recommended) | Last read, daily / monthly consumption, forecast, leak alerts | Utility that enables Arad consumer access + RYM Pro account |
| **Local Dialog3G RF** | Near-real-time m³ from packets on ~916.3 MHz | SDR or ESP + SI4432 near the meter, your meter serial |
| **Water corporation** | Billing enablement / official portal | Ask your תאגיד מים to turn on consumer access |

## Quick start

```bash
npm install
npm run dev -- --port 3847
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

The dashboard starts with sample data. Use **Connect Read Your Meter Pro** with your [rym-pro.com](https://rym-pro.com/) email and password to pull live readings through Arad’s consumer API.

### Optional env secrets

```bash
RYM_EMAIL=you@example.com
RYM_PASSWORD=your-password
```

With both set, `GET /api/meter` returns live data automatically.

## Registering for Read Your Meter Pro

1. Open your water bill and find **מספר משלם** (payer) and **מספר נכס** (property), or use the phone number on the account.
2. Register at [rym-pro.com](https://rym-pro.com/) or the **Read Your Meter Pro** mobile app.
3. If signup fails, ask the water corporation whether Arad consumer access is enabled for your address.
4. Arad support: `1-700-50-6565` · `supportarad@arad.co.il`

## API routes

- `GET /api/meter` — mock sample, or live if `RYM_EMAIL` / `RYM_PASSWORD` are set
- `POST /api/meter` — `{ "email", "password" }` → live meter snapshot (credentials not stored)

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui.
