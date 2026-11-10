"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { ReadingsResult } from "@/lib/iec/types";

type Step = "id" | "otp" | "loading" | "data";

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

export function DailyDashboard() {
  const [step, setStep] = useState<Step>("id");
  const [idNumber, setIdNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [factorType, setFactorType] = useState("sms");
  const [result, setResult] = useState<ReadingsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  const recent = useMemo(() => {
    if (!result) return [];
    return [...result.days].reverse().slice(0, 45);
  }, [result]);

  const maxDay = useMemo(
    () => (recent.length ? Math.max(...recent.map((d) => d.kwh)) : 1),
    [recent],
  );

  async function pullReadings(demo = false) {
    setBusy(true);
    setError(null);
    setStep("loading");
    try {
      const res = await fetch(
        demo ? "/api/iec/readings?demo=1" : "/api/iec/readings",
        { cache: "no-store" },
      );
      const body = await readJson(res);
      if (!body.data) throw new Error("No readings returned");
      setResult(body.data);
      setStep("data");
    } catch (err) {
      setResult(null);
      setStep("id");
      setError(err instanceof Error ? err.message : "Could not pull readings");
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
          await pullReadings(false);
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
      await pullReadings(false);
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
      setStep("id");
      setBusy(false);
    }
  }

  if (bootstrapping) {
    return (
      <section className="rounded-2xl border border-[var(--line)] bg-white/70 px-6 py-10 text-[var(--mute)]">
        Checking IEC session…
      </section>
    );
  }

  return (
    <section id="daily" className="scroll-mt-24 grid gap-10 lg:grid-cols-2">
      <div className="space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-[var(--amp)]">
            Pull from חברת החשמל
          </p>
          <h2 className="mt-2 font-display text-3xl text-[var(--ink)]">
            Sign in once — the plugin fetches daily kWh
          </h2>
          <p className="mt-3 text-[var(--mute)]">
            Same Okta login as the IEC app: Israeli ID, then SMS/email OTP. We
            call IEC&apos;s RemoteReadingRange API (no CSV download).
          </p>
        </div>

        {step === "id" && (
          <form
            onSubmit={sendOtp}
            className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 space-y-4"
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
              onClick={() => void pullReadings(true)}
              className="ms-2 rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink)] hover:bg-[var(--mist)]"
            >
              Preview demo data
            </button>
          </form>
        )}

        {step === "otp" && (
          <form
            onSubmit={confirmOtp}
            className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 space-y-4"
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
            Talking to iecapi.iec.co.il — loading contracts, meter, and daily
            remote readings…
          </div>
        )}

        {step === "data" && result && (
          <div className="rounded-2xl border border-[var(--line)] bg-white/85 p-5 space-y-3">
            <p className="text-sm text-[var(--mute)]">
              {result.customerName} · contract {result.contractId} · meter{" "}
              {result.meterSerial}
            </p>
            <p className="text-xs uppercase tracking-wider text-[var(--mute)]">
              Source: {result.source === "mock" ? "demo" : "IEC API"}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void pullReadings(result.source === "mock")}
                className="rounded-md bg-[var(--ink)] px-4 py-2 text-sm text-[var(--paper)] disabled:opacity-60"
              >
                {busy ? "Refreshing…" : "Refresh from IEC"}
              </button>
              {result.source !== "mock" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void logout()}
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink)]"
                >
                  Sign out
                </button>
              )}
              {result.source === "mock" && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setResult(null);
                    setStep("id");
                  }}
                  className="rounded-md border border-[var(--line)] bg-white px-4 py-2 text-sm text-[var(--ink)]"
                >
                  Sign in for live data
                </button>
              )}
            </div>
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
            After OTP, daily kWh appears here — pulled straight from IEC, not
            from a downloaded file.
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
