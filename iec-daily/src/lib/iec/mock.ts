import type { ReadingsQuery, ReadingsResult } from "./types";

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

function parseYmd(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

/** Deterministic demo days so the UI can be used without live IEC login. */
export function mockReadings(
  daysOrQuery: number | ReadingsQuery = 28,
): ReadingsResult {
  const query: ReadingsQuery =
    typeof daysOrQuery === "number" ? {} : daysOrQuery;
  const spanDays =
    typeof daysOrQuery === "number" ? daysOrQuery : 28;

  let from = query.from;
  let to = query.to;
  if (from && to && from > to) {
    const swap = from;
    from = to;
    to = swap;
  }

  const out: { date: string; kwh: number }[] = [];

  function kwhForDate(date: Date) {
    const weekday = date.getUTCDay();
    const dayNum = Number(ymd(date).replace(/-/g, ""));
    const base = weekday === 5 || weekday === 6 ? 18.4 : 12.6;
    const wobble = (dayNum % 7) * 0.35;
    return Math.round((base + wobble) * 1000) / 1000;
  }

  if (from && to) {
    const start = parseYmd(from);
    const end = parseYmd(to);
    for (
      let cursor = new Date(start);
      cursor.getTime() <= end.getTime();
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    ) {
      out.push({ date: ymd(cursor), kwh: kwhForDate(cursor) });
    }
  } else {
    const end = new Date();
    end.setUTCHours(12, 0, 0, 0);
    for (let i = spanDays - 1; i >= 0; i--) {
      const d = new Date(end);
      d.setUTCDate(end.getUTCDate() - i);
      out.push({ date: ymd(d), kwh: kwhForDate(d) });
    }
  }

  const latest = out[out.length - 1] ?? null;

  return {
    days: out,
    latest,
    totalKwh: Math.round(out.reduce((s, d) => s + d.kwh, 0) * 1000) / 1000,
    dateFrom: out[0]?.date ?? "",
    dateTo: latest?.date ?? "",
    requestedFrom: from ?? null,
    requestedTo: to ?? null,
    contractId: "0001234567",
    meterSerial: "23231111",
    customerName: "Demo account",
    warnings: [
      "Demo mode — sample numbers, not your meter. Sign in with ID + OTP to pull live IEC data.",
    ],
    source: "mock",
  };
}
