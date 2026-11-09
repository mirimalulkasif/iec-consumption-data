"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertCircle, Droplets, Loader2, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { weeklyMock } from "@/lib/mock-data";
import type { MeterPayload } from "@/lib/rympro";

function formatM3(value: number) {
  return `${value.toLocaleString(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} m³`;
}

function formatWhen(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IL", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Jerusalem",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function MeterDashboard() {
  const [data, setData] = useState<MeterPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [connecting, setConnecting] = useState(false);

  function loadMockOrSecrets() {
    startTransition(async () => {
      setError(null);
      try {
        const response = await fetch("/api/meter", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Could not load meter data");
        }
        const json = (await response.json()) as MeterPayload;
        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Load failed");
      }
    });
  }

  useEffect(() => {
    loadMockOrSecrets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect(event: React.FormEvent) {
    event.preventDefault();
    setConnecting(true);
    setError(null);
    try {
      const response = await fetch("/api/meter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Login failed");
      }
      setData(json as MeterPayload);
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
    } finally {
      setConnecting(false);
    }
  }

  const maxLiters = Math.max(...weeklyMock.map((d) => d.liters));

  return (
    <section id="dashboard" className="scroll-mt-24 space-y-8">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[hsl(var(--water-mid))]">
          Dashboard
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight text-[hsl(var(--water-deep))] sm:text-4xl">
          Optional cloud dashboard
        </h2>
        <p className="mt-3 text-muted-foreground">
          Sample data so you can see the layout. The Connect form only works if
          the utility later enables Read Your Meter Pro — it will not bypass a
          blocked portal. For blocked accounts, use{" "}
          <a href="#from-meter" className="underline underline-offset-2">
            From the meter
          </a>
          .
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={data?.source === "live" ? "default" : "secondary"}>
              {data?.source === "live" ? "Live RYM Pro" : "Sample data"}
            </Badge>
            {data && (
              <span className="text-sm text-muted-foreground">
                Updated {formatWhen(data.fetchedAt)} (Asia/Jerusalem)
              </span>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="ms-auto"
              onClick={loadMockOrSecrets}
              disabled={pending}
            >
              {pending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              Refresh
            </Button>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="size-4" />
              <AlertTitle>Could not load live data</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {data?.message && (
            <Alert>
              <Droplets className="size-4" />
              <AlertTitle>Demo mode</AlertTitle>
              <AlertDescription>{data.message}</AlertDescription>
            </Alert>
          )}

          {!data && pending && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Loading meter snapshot…
            </div>
          )}

          {data?.meters.map((meter) => (
            <article
              key={meter.meterCount}
              className="rounded-2xl border border-border/70 bg-white/75 p-5 shadow-[0_20px_50px_-35px_hsl(205_55%_20%/0.45)] backdrop-blur"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-2xl text-[hsl(var(--water-deep))]">
                    {meter.address || `Meter ${meter.meterCount}`}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Serial {meter.meterSerial || "—"} · ID {meter.meterCount}
                    {data.accountName ? ` · ${data.accountName}` : ""}
                  </p>
                </div>
                <div className="text-end">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Last read
                  </p>
                  <p className="font-display text-3xl text-[hsl(var(--water-mid))]">
                    {formatM3(meter.lastRead)}
                  </p>
                </div>
              </div>

              <Separator className="my-4" />

              <dl className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-muted-foreground">Today</dt>
                  <dd className="mt-1 text-lg font-medium">
                    {formatM3(meter.dailyConsumption)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">This month</dt>
                  <dd className="mt-1 text-lg font-medium">
                    {formatM3(meter.monthlyConsumption)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Forecast</dt>
                  <dd className="mt-1 text-lg font-medium">
                    {formatM3(meter.forecast)}
                  </dd>
                </div>
              </dl>
            </article>
          ))}

          {data?.source === "mock" && (
            <div className="rounded-2xl border border-dashed border-border/80 bg-white/50 p-5">
              <p className="text-sm font-medium text-[hsl(var(--water-deep))]">
                Sample week (liters/day)
              </p>
              <div className="mt-4 flex h-36 items-end gap-2">
                {weeklyMock.map((day) => (
                  <div key={day.day} className="flex flex-1 flex-col items-center gap-2">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-[hsl(var(--water-deep))] to-[hsl(var(--water-mid))] transition-all"
                      style={{ height: `${(day.liters / maxLiters) * 100}%` }}
                      title={`${day.liters} L`}
                    />
                    <span className="text-xs text-muted-foreground">{day.day}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <form
          onSubmit={connect}
          className="h-fit rounded-2xl border border-border/70 bg-[hsl(var(--water-deep))] p-6 text-[hsl(var(--water-foam))] shadow-[0_24px_60px_-30px_hsl(205_55%_10%/0.7)]"
        >
          <h3 className="font-display text-2xl">Connect Read Your Meter Pro</h3>
          <p className="mt-2 text-sm text-white/75">
            Credentials are sent only to this app’s server route, which talks to
            Arad’s Harmony API. They are not stored. Prefer bound secrets for a
            personal deploy.
          </p>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-white/85">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border-white/20 bg-white/10 text-white placeholder:text-white/45"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-white/85">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border-white/20 bg-white/10 text-white placeholder:text-white/45"
                placeholder="••••••••"
              />
            </div>
            <Button
              type="submit"
              disabled={connecting}
              className="w-full bg-[hsl(168_55%_42%)] text-white hover:bg-[hsl(168_55%_36%)]"
            >
              {connecting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                "Pull my meter data"
              )}
            </Button>
          </div>

          <p className="mt-4 text-xs text-white/60">
            No account yet? Register at{" "}
            <a
              className="underline underline-offset-2"
              href="https://rym-pro.com/"
              target="_blank"
              rel="noreferrer"
            >
              rym-pro.com
            </a>{" "}
            with the phone or payer/property numbers from your water bill.
          </p>
        </form>
      </div>
    </section>
  );
}
