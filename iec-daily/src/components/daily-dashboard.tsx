"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ReadingsResult } from "@/lib/iec/types";

type Step = "id" | "otp" | "loading" | "data";

function jerusalemToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function daysAgo(n: number) {
  const today = jerusalemToday();
  const [y, m, d] = today.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  dt.setUTCDate(dt.getUTCDate() - n);
  return dt.toISOString().slice(0, 10);
}

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

async function readJson(res: Response) {
  const body = (await res.json()) as {
    ok?: boolean;
    error?: string;
    message?: string;
    factorType?: string;
    data?: ReadingsResult;
    signedIn?: boolean;
    awaitingOtp?: boolean;
  };
  if (!res.ok || body.ok === false) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body;
}

type PullOpts = {
  demo?: boolean;
  from?: string;
  to?: string;
  months?: number;
};

export function DailyDashboard() {
  const [step, setStep] = useState<Step>("id");
  const [idNumber, setIdNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [factorType, setFactorType] = useState("sms");
  const [result, setResult] = useState<ReadingsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [fromDate, setFromDate] = useState(() => daysAgo(13));
  const [toDate, setToDate] = useState(() => jerusalemToday());
  const [isDemo, setIsDemo] = useState(false);

  const latest = result?.latest ?? null;

  const recent = useMemo(() => {
    if (!result) return [];
    return [...result.days].reverse();
  }, [result]);

  const maxDay = useMemo(
    () => (recent.length ? Math.max(...recent.map((d) => d.kwh)) : 1),
    [recent],
  );

  async function pullReadings(opts: PullOpts = {}) {
    const demo = Boolean(opts.demo);
    setBusy(true);
    setError(null);
    setStep("loading");
    try {
      const params = new URLSearchParams();
      if (demo) params.set("demo", "1");
      if (opts.from && opts.to) {
        params.set("from", opts.from);
        params.set("to", opts.to);
      } else if (opts.months) {
        params.set("months", String(opts.months));
      } else {
        params.set("months", "1");
      }

      const res = await fetch(`/api/iec/readings?${params}`, {
        cache: "no-store",
      });
      const body = await readJson(res);
      if (!body.data) throw new Error("No readings returned");
      setResult(body.data);
      setIsDemo(body.data.source === "mock");
      if (body.data.dateFrom && body.data.dateTo) {
        setFromDate(body.data.requestedFrom ?? body.data.dateFrom);
        setToDate(body.data.requestedTo ?? body.data.dateTo);
      }
      setStep("data");
    } catch (err) {
      setResult(null);
      setError(err instanceof Error ? err.message : "Could not pull readings");
      try {
        const sessionRes = await fetch("/api/iec/session", {
          cache: "no-store",
        });
        const session = await readJson(sessionRes);
        if (session.signedIn) {
          setStep("data");
          setIsDemo(false);
          setResult({
            days: [],
            latest: null,
            totalKwh: 0,
            dateFrom: "",
            dateTo: "",
            requestedFrom: null,
            requestedTo: null,
            contractId: "—",
            meterSerial: "—",
            customerName: "Signed in",
            warnings: [
              err instanceof Error ? err.message : "Could not pull readings",
            ],
            source: "iec",
          });
        } else if (session.awaitingOtp) {
          setFactorType(session.factorType || "sms");
          setStep("otp");
        } else {
          setStep("id");
        }
      } catch {
        setStep("id");
      }
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/iec/session", { cache: "no-store" });
        const body = await readJson(res);
        if (cancelled) return;
        if (body.signedIn) {
          await pullReadings({ months: 1 });
        } else if (body.awaitingOtp) {
          setFactorType(body.factorType || "sms");
          setStep("otp");
        }
      } catch {
        // stay on id step
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendOtp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/iec/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ idNumber, preferSms: true }),
      });
      const body = await readJson(res);
      setFactorType(body.factorType || "sms");
      setStep("otp");
      setOtp("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  async function confirmOtp(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/iec/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ otp }),
      });
      await readJson(res);
      await pullReadings({ months: 1 });
    } catch (err) {
      setStep("otp");
      setError(err instanceof Error ? err.message : "OTP failed");
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/iec/logout", { method: "POST" });
    } finally {
      setResult(null);
      setOtp("");
      setIsDemo(false);
      setStep("id");
      setBusy(false);
    }
  }

  function applyPeriod(event: FormEvent) {
    event.preventDefault();
    if (!fromDate || !toDate) return;
    void pullReadings({
      demo: isDemo,
      from: fromDate,
      to: toDate,
    });
  }

  if (bootstrapping) {
    return (
      <section className="rounded-2xl border border-[var(--line)] bg-white/70 px-6 py-10 text-[var(--mute)]">
        Checking IEC session…
      </section>
    );
  }

  return (
    <section id="daily" className="scroll-mt-24 space-y-10">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--amp)]">
              Pull from חברת החשמל
            </p>
            <h2 className="mt-2 font-display text-3xl text-[var(--ink)]">
              Latest day first — then pick any period
            </h2>
            <p className="mt-3 text-[var(--mute)]">
              Sign in with Israeli ID + OTP. The plugin pulls daily kWh from
              IEC. Choose From / To dates to inspect a period.
            </p>
          </div>

          {step === "id" && (
            <form
              onSubmit={sendOtp}
              className="space-y-4 rounded-2xl border border-[var(--line)] bg-white/85 p-5"
            >
              <label className="block text-sm font-medium text-[var(--ink)]">
                Israeli ID (תעודת זהות)
                <input
                  inputMode="numeric"
                  autoComplete="username"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-base text-[var(--ink)] outline-none focus:border-[var(--amp)]"
                  placeholder="9 digits"
                  required
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] disabled:opacity-60"
              >
                {busy ? "Sending OTP…" : "Send OTP"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void pullReadings({ demo: true })}
                className="ms-2 rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--mist)]"
              >
                Preview demo data
              </button>
            </form>
          )}

          {step === "otp" && (
            <form
              onSubmit={confirmOtp}
              className="space-y-4 rounded-2xl border border-[var(--line)] bg-white/85 p-5"
            >
              <p className="text-sm text-[var(--mute)]">
                Enter the code IEC sent via <strong>{factorType}</strong>.
              </p>
              <label className="block text-sm font-medium text-[var(--ink)]">
                OTP code
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-base tracking-widest text-[var(--ink)] outline-none focus:border-[var(--amp)]"
                  placeholder="••••••"
                  required
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] disabled:opacity-60"
                >
                  {busy ? "Verifying…" : "Verify & pull readings"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setStep("id");
                    setOtp("");
                    setError(null);
                  }}
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink)]"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {step === "loading" && (
            <div className="rounded-2xl border border-[var(--line)] bg-white/85 px-5 py-8 text-[var(--mute)]">
              Pulling daily consumption from iecapi.iec.co.il…
            </div>
          )}

          {step === "data" && result && (
            <div className="space-y-4 rounded-2xl border border-[var(--line)] bg-white/85 p-5">
              <p className="text-sm text-[var(--mute)]">
                {result.customerName} · contract {result.contractId} · meter{" "}
                {result.meterSerial}
              </p>

              <form onSubmit={applyPeriod} className="grid gap-3 sm:grid-cols-2">
                <label className="block text-sm font-medium text-[var(--ink)]">
                  From
                  <input
                    type="date"
                    value={fromDate}
                    max={toDate || jerusalemToday()}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--amp)]"
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-[var(--ink)]">
                  To
                  <input
                    type="date"
                    value={toDate}
                    min={fromDate}
                    max={jerusalemToday()}
                    onChange={(e) => setToDate(e.target.value)}
                    className="mt-2 w-full rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--amp)]"
                    required
                  />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] disabled:opacity-60"
                  >
                    {busy ? "Loading…" : "Apply period"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void pullReadings({
                        demo: isDemo,
                        from: daysAgo(6),
                        to: jerusalemToday(),
                      })
                    }
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
                  >
                    Last 7 days
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void pullReadings({
                        demo: isDemo,
                        from: daysAgo(29),
                        to: jerusalemToday(),
                      })
                    }
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
                  >
                    Last 30 days
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void pullReadings({ demo: isDemo, months: 1 })
                    }
                    className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
                  >
                    This month
                  </button>
                  {!isDemo && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void logout()}
                      className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
                    >
                      Sign out
                    </button>
                  )}
                  {isDemo && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setResult(null);
                        setStep("id");
                      }}
                      className="rounded-md border border-[var(--line)] bg-white px-3 py-2 text-sm text-[var(--ink)]"
                    >
                      Sign in for live data
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <div className="space-y-4">
          {!result && !error && step !== "loading" && (
            <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-6 text-[var(--mute)]">
              After OTP, the latest daily kWh shows here. Use From / To to
              inspect any period.
            </div>
          )}

          {result && latest && (
            <div className="animate-rise overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--ink)] px-6 py-7 text-[var(--paper)]">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-[var(--glow)]">
                Latest daily consumption
              </p>
              <p className="mt-3 font-display text-5xl tabular-nums tracking-tight sm:text-6xl">
                {latest.kwh.toFixed(2)}
                <span className="ms-2 text-2xl font-normal text-[var(--mist)]">
                  kWh
                </span>
              </p>
              <p className="mt-3 text-sm text-[var(--mist)]">
                {formatDay(latest.date)}
                {result.source === "mock" ? " · demo" : " · from IEC"}
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="flex flex-wrap gap-2 text-sm">
                <span className="rounded-full bg-[var(--ink)] px-3 py-1 text-[var(--paper)]">
                  {result.days.length} days
                </span>
                <span className="rounded-full bg-[var(--amp)]/25 px-3 py-1 text-[var(--ink)]">
                  {result.totalKwh.toFixed(1)} kWh in period
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
                  Days in period
                </div>
                {recent.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-[var(--mute)]">
                    No days in this period yet.
                  </p>
                ) : (
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
                            style={{
                              width: `${(day.kwh / maxDay) * 100}%`,
                            }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
