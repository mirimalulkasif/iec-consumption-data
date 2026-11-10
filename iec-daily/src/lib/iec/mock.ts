import type { ReadingsResult } from "./types";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Deterministic demo days so the UI can be used without live IEC login. */
export function mockReadings(days = 28): ReadingsResult {
  const out: { date: string; kwh: number }[] = [];
  const end = new Date();
  end.setUTCHours(12, 0, 0, 0);

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setUTCDate(end.getUTCDate() - i);
    const weekday = d.getUTCDay();
    const base = weekday === 5 || weekday === 6 ? 18.4 : 12.6;
    const wobble = ((i * 17) % 7) * 0.35;
    const kwh = Math.round((base + wobble) * 1000) / 1000;
    out.push({ date: ymd(d), kwh });
  }

  return {
    days: out,
    totalKwh: Math.round(out.reduce((s, d) => s + d.kwh, 0) * 1000) / 1000,
    dateFrom: out[0].date,
    dateTo: out[out.length - 1].date,
    contractId: "0001234567",
    meterSerial: "23231111",
    customerName: "Demo account",
    warnings: [
      "Demo mode — sample numbers, not your meter. Sign in with ID + OTP to pull live IEC data.",
    ],
    source: "mock",
  };
}
