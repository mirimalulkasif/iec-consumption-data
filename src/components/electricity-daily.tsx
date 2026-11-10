"use client";

import { useMemo, useState } from "react";
import { AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

export function ElectricityDaily() {
  const [result, setResult] = useState<IecParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const recent = useMemo(() => {
    if (!result) return [];
    return [...result.days].reverse().slice(0, 31);
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
      const parsed = parseIecMeterCsv(text);
      setResult(parsed);
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
    <section id="electricity" className="scroll-mt-24 space-y-8">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[hsl(var(--water-mid))]">
          Electricity · חברת החשמל
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight text-[hsl(var(--water-deep))] sm:text-4xl">
          Daily consumption from your smart meter file
        </h2>
        <p className="mt-3 text-muted-foreground">
          Because you’re billed by IEC, download the official{" "}
          <code className="rounded bg-muted px-1.5 py-0.5 text-sm">meter_LP</code>{" "}
          CSV (15‑minute rows), then upload it here to get daily kWh totals. The
          file stays in your browser.
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="space-y-5">
          <ol className="list-decimal space-y-2 ps-5 text-sm text-muted-foreground">
            {iecDownloadSteps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Button asChild variant="outline">
            <a
              href="https://www.iec.co.il/"
              target="_blank"
              rel="noreferrer"
            >
              Open IEC website
            </a>
          </Button>

          <div className="rounded-2xl border border-dashed border-border/80 bg-white/70 p-5">
            <Labelish />
            <input
              id="iec-file"
              type="file"
              accept=".csv,text/csv,.txt"
              className="mt-3 block w-full text-sm file:me-3 file:rounded-md file:border-0 file:bg-[hsl(var(--water-mid))] file:px-3 file:py-2 file:text-sm file:text-white"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={loadSample}>
                Load sample days
              </Button>
              {pending && (
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" />
                  Parsing…
                </span>
              )}
            </div>
            {fileName && (
              <p className="mt-3 text-xs text-muted-foreground">
                Loaded: {fileName}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Could not read the file</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!result && !error && (
            <div className="rounded-2xl border border-border/70 bg-white/70 p-6 text-muted-foreground">
              <FileSpreadsheet className="mb-3 size-6 text-[hsl(var(--water-mid))]" />
              Upload your IEC file (or load the sample) to see daily kWh.
            </div>
          )}

          {result && (
            <>
              <div className="flex flex-wrap gap-2">
                <Badge>{result.days.length} days</Badge>
                <Badge variant="secondary">{result.totalKwh.toFixed(1)} kWh total</Badge>
                <Badge variant="outline">
                  {result.dateFrom} → {result.dateTo}
                </Badge>
              </div>

              {result.warnings.map((warning) => (
                <Alert key={warning}>
                  <AlertCircle className="size-4" />
                  <AlertTitle>Note</AlertTitle>
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}

              <div className="overflow-hidden rounded-2xl border border-border/70 bg-white/80">
                <div className="border-b border-border/70 px-4 py-3 text-sm font-medium text-[hsl(var(--water-deep))]">
                  Last {Math.min(31, recent.length)} days
                </div>
                <ul className="divide-y divide-border/60">
                  {recent.map((day) => (
                    <li
                      key={day.date}
                      className="grid grid-cols-[minmax(0,1fr)_88px_minmax(72px,1fr)] items-center gap-3 px-4 py-2.5 text-sm"
                    >
                      <span>{formatDay(day.date)}</span>
                      <span className="text-end font-medium tabular-nums">
                        {day.kwh.toFixed(2)} kWh
                      </span>
                      <span className="h-2 rounded-full bg-muted">
                        <span
                          className="block h-2 rounded-full bg-[hsl(var(--water-mid))]"
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
      </div>
    </section>
  );
}

function Labelish() {
  return (
    <p className="text-sm font-medium text-[hsl(var(--water-deep))]">
      Upload meter_LP CSV
    </p>
  );
}
