# Arad Meter Access

Guide for reading an **Arad** water meter in Israel when the water company has **not** enabled Read Your Meter Pro / CityMind web access.

## Short answer

Yes — you can get data from the meter itself:

1. **Read the dial** on the meter face (cumulative m³). No hardware, no approval.
2. **Catch Dialog3G RF** packets the meter already broadcasts (~every 30s on **916.3 MHz** in Israel) with an RTL-SDR + `rtl_433`, or an ESP32 + SI4432/XL4432 (ESPHome). Filter on your printed serial so you only keep your meter.

The utility website is optional. Blocking the portal does not stop the dial or the local radio transmission.

## Quick start

```bash
npm install
npm run dev -- --port 3847
```

Open [http://127.0.0.1:3847](http://127.0.0.1:3847).

The page includes a **serial → hex** converter for decoder config, RF kit options, and an optional RYM Pro connect form (only useful if the utility later enables the portal).

### Optional cloud secrets (only if portal works)

```bash
RYM_EMAIL=you@example.com
RYM_PASSWORD=your-password
```

## Useful projects

- [Dialog3g-Decoder](https://github.com/assafms/Dialog3g-Decoder) — ESPHome + SI4432/XL4432
- [rtl_433 Arad Dialog3G](https://github.com/merbanan/rtl_433/pull/2984)

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui.
