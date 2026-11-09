import { AccessPaths } from "@/components/access-paths";
import { MeterDashboard } from "@/components/meter-dashboard";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[72vh] hero-sheen wave-mask"
      />
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -left-16 top-24 h-56 w-56 rounded-full bg-[hsl(186_70%_70%/0.28)] blur-3xl"
      />
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute right-[-4rem] top-40 h-72 w-72 rounded-full bg-[hsl(168_55%_62%/0.22)] blur-3xl"
        style={{ animationDelay: "1.5s" }}
      />

      <header className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 pb-2 pt-6 sm:px-8">
        <p className="font-display text-xl tracking-tight text-[hsl(var(--water-deep))] sm:text-2xl">
          Arad Meter Access
        </p>
        <nav className="flex items-center gap-2 text-sm">
          <a className="hidden text-muted-foreground hover:text-foreground sm:inline" href="#paths">
            Paths
          </a>
          <Button asChild size="sm" variant="secondary">
            <a href="#dashboard">Open dashboard</a>
          </Button>
        </nav>
      </header>

      <section className="relative mx-auto grid min-h-[78vh] w-full max-w-6xl items-end px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
        <div className="max-w-3xl">
          <p className="animate-rise text-sm font-medium uppercase tracking-[0.2em] text-[hsl(var(--water-mid))]">
            Water · Israel · Arad
          </p>
          <h1 className="animate-rise-delay mt-4 font-display text-5xl leading-[1.05] tracking-tight text-[hsl(var(--water-deep))] sm:text-6xl lg:text-7xl">
            Arad Meter Access
          </h1>
          <p className="animate-rise-late mt-5 max-w-xl text-lg text-foreground/80 sm:text-xl">
            You already have the meter. Here is how to unlock its readings —
            through Arad’s consumer cloud, your water corporation, or local RF —
            and a dashboard that can pull them.
          </p>
          <div className="animate-rise-late mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#paths">Show me the paths</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#dashboard">Try the dashboard</a>
            </Button>
          </div>
        </div>
      </section>

      <div className="relative mx-auto w-full max-w-6xl space-y-24 px-5 pb-24 sm:px-8">
        <AccessPaths />
        <MeterDashboard />

        <section className="border-t border-border/70 pt-10">
          <h2 className="font-display text-2xl text-[hsl(var(--water-deep))]">
            What this app talks to
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            Live mode uses the same consumer Harmony / Read Your Meter Pro API
            that Home Assistant’s{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">rympro</code>{" "}
            integration uses (
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">
              eu-customerportal-api.harmonyencoremdm.com
            </code>
            ). Optional secrets{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">RYM_EMAIL</code>{" "}
            and{" "}
            <code className="rounded bg-muted px-1.5 py-0.5 text-sm">RYM_PASSWORD</code>{" "}
            enable automatic live refresh without the form.
          </p>
        </section>
      </div>
    </main>
  );
}
