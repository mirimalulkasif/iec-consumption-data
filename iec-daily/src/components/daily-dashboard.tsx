"use client";

import { useMemo, useState } from "react";
import {
  iecDownloadSteps,
  parseIecMeterCsv,
  sampleIecCsv,
  type IecParseResult,
} from "@/lib/iec-csv";

function formatDay(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IL", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jerusalem",
    }).format(new Date(`${iso}T12:00:00+02:00`));
  } catch {
    return iso;
  }
}

export function DailyDashboard() {
  const [result, setResult] = useState<IecParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const recent = useMemo(() => {
    if (!result) return [];
    return [...result.days].reverse().slice(0, 45);
  }, [result]);

  const maxDay = useMemo(
    () => (recent.length ? Math.max(...recent.map((d) => d.kwh)) : 1),
    [recent],
  );

  async function handleFile(file: File) {
    setPending(true);
    setError(null);
    try {
      const text = await file.text();
      setResult(parseIecMeterCsv(text));
      setFileName(file.name);
    } catch (err) {
      setResult(null);
      setFileName(null);
      setError(err instanceof Error ? err.message : "Could not parse that file");
    } finally {
      setPending(false);
    }
  }

  function loadSample() {
    setError(null);
    setFileName("sample-meter_LP.csv");
    setResult(parseIecMeterCsv(sampleIecCsv));
  }

  return (
    <section id="daily" className="scroll-mt-24 grid gap-10 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--amp)]">
            From חברת החשמל
          </p>
          <h2 className="mt-2 font-display text-3xl text-[var(--ink)]">
            Download meter_LP, get daily kWh
          </h2>
        </div>
        <ol className="list-decimal space-y-2 ps-5 text-[var(--mute)]">
          {iecDownloadSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <a
          className="inline-flex rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] transition hover:bg-black"
          href="https://www.iec.co.il/"
          target="_blank"
          rel="noreferrer"
        >
          Open IEC website
        </a>

        <div className="rounded-2xl border border-[var(--line)] bg-white/80 p-5">
          <p className="text-sm font-medium text-[var(--ink)]">Upload meter_LP CSV</p>
          <input
            type="file"
            accept=".csv,text/csv,.txt"
            className="mt-3 block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-[var(--amp)] file:px-3 file:py-2 file:text-sm file:text-[var(--ink)]"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadSample}
              className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] hover:bg-[var(--mist)]"
            >
              Load sample days
            </button>
            {pending && <span className="text-sm text-[var(--mute)]">Parsing…</span>}
          </div>
          {fileName && (
            <p className="mt-3 text-xs text-[var(--mute)]">Loaded: {fileName}</p>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}

        {!result && !error && (
          <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-6 text-[var(--mute)]">
            Upload your IEC file to see one row per day.
          </div>
        )}

        {result && (
          <>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-[var(--paper)]">
                {result.days.length} days
              </span>
              <span className="rounded-full bg-[var(--amp)]/25 px-3 py-1 text-[var(--ink)]">
                {result.totalKwh.toFixed(1)} kWh total
              </span>
              <span className="rounded-full border border-[var(--line)] px-3 py-1 text-[var(--mute)]">
                {result.dateFrom} → {result.dateTo}
              </span>
            </div>

            {result.warnings.map((warning) => (
              <div
                key={warning}
                className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                {warning}
              </div>
            ))}

            <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white/85">
              <div className="border-b border-[var(--line)] px-4 py-3 text-sm font-medium text-[var(--ink)]">
                Latest days
              </div>
              <ul className="divide-y divide-[var(--line)]">
                {recent.map((day) => (
                  <li
                    key={day.date}
                    className="grid grid-cols-[minmax(0,1fr)_96px_minmax(64px,1fr)] items-center gap-3 px-4 py-2.5 text-sm"
                  >
                    <span>{formatDay(day.date)}</span>
                    <span className="text-end font-medium tabular-nums text-[var(--ink)]">
                      {day.kwh.toFixed(2)} kWh
                    </span>
                    <span className="h-2 rounded-full bg-[var(--mist)]">
                      <span
                        className="block h-2 rounded-full bg-[var(--amp)]"
                        style={{ width: `${(day.kwh / maxDay) * 100}%` }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
