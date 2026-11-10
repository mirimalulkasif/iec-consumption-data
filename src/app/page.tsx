import { AccessPaths } from "@/components/access-paths";
import { AliExpressCart } from "@/components/aliexpress-cart";
import { FromTheMeter } from "@/components/from-the-meter";
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
          <a
            className="hidden text-muted-foreground hover:text-foreground sm:inline"
            href="#from-meter"
          >
            From the meter
          </a>
          <Button asChild size="sm" variant="secondary">
            <a href="#order">AliExpress list</a>
          </Button>
        </nav>
      </header>

      <section className="relative mx-auto grid min-h-[78vh] w-full max-w-6xl items-end px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-16">
        <div className="max-w-3xl">
          <p className="animate-rise text-sm font-medium uppercase tracking-[0.2em] text-[hsl(var(--water-mid))]">
            No portal? Still readable
          </p>
          <h1 className="animate-rise-delay mt-4 font-display text-5xl leading-[1.05] tracking-tight text-[hsl(var(--water-deep))] sm:text-6xl lg:text-7xl">
            Arad Meter Access
          </h1>
          <p className="animate-rise-late mt-5 max-w-xl text-lg text-foreground/80 sm:text-xl">
            If the water company never enabled Arad’s website, you can still
            read the dial on the meter — or catch the Dialog3G radio packets it
            already broadcasts.
          </p>
          <div className="animate-rise-late mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href="#from-meter">Read it from the meter</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#order">Order the parts</a>
            </Button>
          </div>
        </div>
      </section>

      <div className="relative mx-auto w-full max-w-6xl space-y-24 px-5 pb-24 sm:px-8">
        <FromTheMeter />
        <AliExpressCart />
        <AccessPaths />
        <MeterDashboard />

        <section className="border-t border-border/70 pt-10">
          <h2 className="font-display text-2xl text-[hsl(var(--water-deep))]">
            About the optional Connect form
          </h2>
          <p className="mt-3 max-w-3xl text-muted-foreground">
            The dashboard’s Connect form only works when Read Your Meter Pro is
            already enabled for your account. It cannot unlock a portal the
            תאגיד turned off. For blocked accounts, use the serial converter and
            RF kit list above — that path talks to the meter over the air, not
            to Arad’s consumer website.
          </p>
        </section>
      </div>
    </main>
  );
}
