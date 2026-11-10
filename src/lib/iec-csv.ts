export type DailyRow = {
  date: string; // YYYY-MM-DD
  kwh: number;
  intervals: number;
};

export type IecParseResult = {
  days: DailyRow[];
  totalKwh: number;
  intervalCount: number;
  dateFrom: string;
  dateTo: string;
  warnings: string[];
};

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/["']/g, "")
    .replace(/\s+/g, " ");
}

function parseNumber(raw: string) {
  const cleaned = raw.trim().replace(/,/g, "").replace(/^\./, "0.");
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function parseIsraeliDate(raw: string): string | null {
  const text = raw.trim().replace(/"/g, "");
  const match = text.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${year.toString().padStart(4, "0")}-${month
    .toString()
    .padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if ((ch === "," || ch === ";") && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current);
  return cells;
}

function findColumnIndexes(headers: string[]) {
  const normalized = headers.map(normalizeHeader);
  const dateIdx = normalized.findIndex(
    (h) => h.includes("תאריך") || h === "date",
  );
  const timeIdx = normalized.findIndex(
    (h) =>
      h.includes("מועד") ||
      h.includes("שעה") ||
      h.includes("פעימה") ||
      h === "time",
  );
  let consIdx = normalized.findIndex(
    (h) =>
      (h.includes("צריכה") && (h.includes("קוט") || h.includes("kwh") || h.includes("קוטש"))) ||
      h.includes("consumption") ||
      h === "kwh",
  );
  if (consIdx < 0) {
    consIdx = normalized.findIndex((h) => h.includes("צריכה"));
  }

  // Fallback for headerless / oddly labeled files: look at first data-like row later
  return { dateIdx, timeIdx, consIdx };
}

export function parseIecMeterCsv(text: string): IecParseResult {
  const warnings: string[] = [];
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error("File looks empty. Download the meter_LP file again from IEC.");
  }

  let headerLineIndex = -1;
  let indexes = { dateIdx: -1, timeIdx: -1, consIdx: -1 };

  for (let i = 0; i < Math.min(lines.length, 40); i++) {
    const cells = splitCsvLine(lines[i]);
    const found = findColumnIndexes(cells);
    if (found.dateIdx >= 0 && found.consIdx >= 0) {
      headerLineIndex = i;
      indexes = found;
      break;
    }
  }

  // Old files sometimes have no Hebrew headers — detect by DD/MM/YYYY + time + number
  let start = headerLineIndex + 1;
  if (headerLineIndex < 0) {
    warnings.push(
      "No Hebrew header row found — guessing columns from the data shape.",
    );
    start = 0;
    for (let i = 0; i < Math.min(lines.length, 40); i++) {
      const cells = splitCsvLine(lines[i]);
      if (cells.length >= 3 && parseIsraeliDate(cells[0]) && parseNumber(cells[2]) !== null) {
        indexes = { dateIdx: 0, timeIdx: 1, consIdx: 2 };
        start = i;
        break;
      }
      if (cells.length >= 5 && parseIsraeliDate(cells[2]) && parseNumber(cells[4]) !== null) {
        indexes = { dateIdx: 2, timeIdx: 3, consIdx: 4 };
        start = i;
        break;
      }
    }
  }

  if (indexes.dateIdx < 0 || indexes.consIdx < 0) {
    throw new Error(
      "Could not find date / consumption columns. Keep the original meter_LP CSV from the email (don’t re-save from Excel).",
    );
  }

  const byDay = new Map<string, { kwh: number; intervals: number }>();

  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    if (cells.length <= Math.max(indexes.dateIdx, indexes.consIdx)) continue;

    const date = parseIsraeliDate(cells[indexes.dateIdx] ?? "");
    const kwh = parseNumber(cells[indexes.consIdx] ?? "");
    if (!date || kwh === null) continue;

    const existing = byDay.get(date) ?? { kwh: 0, intervals: 0 };
    existing.kwh += kwh;
    existing.intervals += 1;
    byDay.set(date, existing);
  }

  const days = [...byDay.entries()]
    .map(([date, value]) => ({
      date,
      kwh: Math.round(value.kwh * 1000) / 1000,
      intervals: value.intervals,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (days.length === 0) {
    throw new Error("No readable consumption rows found in that file.");
  }

  const totalKwh =
    Math.round(days.reduce((sum, day) => sum + day.kwh, 0) * 1000) / 1000;

  return {
    days,
    totalKwh,
    intervalCount: days.reduce((sum, day) => sum + day.intervals, 0),
    dateFrom: days[0].date,
    dateTo: days[days.length - 1].date,
    warnings,
  };
}

export const sampleIecCsv = `קוד ומספר מונה,סוג מונה,תאריך,מועד תחילת הפעימה,צריכה בקוט״ש,הזרמה בקוט״ש
503-00000000,צריכה,08/11/2026,00:00,0.210,0
503-00000000,צריכה,08/11/2026,00:15,0.180,0
503-00000000,צריכה,08/11/2026,00:30,0.160,0
503-00000000,צריכה,08/11/2026,00:45,0.150,0
503-00000000,צריכה,08/11/2026,12:00,0.420,0
503-00000000,צריכה,08/11/2026,12:15,0.510,0
503-00000000,צריכה,08/11/2026,18:00,0.680,0
503-00000000,צריכה,08/11/2026,18:15,0.720,0
503-00000000,צריכה,09/11/2026,00:00,0.200,0
503-00000000,צריכה,09/11/2026,00:15,0.190,0
503-00000000,צריכה,09/11/2026,12:00,0.450,0
503-00000000,צריכה,09/11/2026,18:00,0.700,0
503-00000000,צריכה,10/11/2026,00:00,0.220,0
503-00000000,צריכה,10/11/2026,08:00,0.330,0
503-00000000,צריכה,10/11/2026,18:00,0.610,0
`;

export const iecDownloadSteps = [
  "Open the IEC personal area and sign in with the account holder’s ID + SMS code.",
  "Go to consumption data (נתוני הצריכה / מחשבוני צריכה).",
  "Choose current consumption status (מצב צריכה עדכני).",
  "Request the Excel/CSV file emailed to you (קבלת קובץ… למייל).",
  "Save the meter_LP… attachment as-is — don’t open and re-save in Excel.",
  "Upload it below. This page sums every 15‑minute row into daily kWh in your browser.",
];
