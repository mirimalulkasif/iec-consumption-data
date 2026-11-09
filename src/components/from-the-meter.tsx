import { SerialConverter } from "@/components/serial-converter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fromMeterPaths,
  hardwareOptions,
  rfFacts,
} from "@/lib/meter-guide";

export function FromTheMeter() {
  return (
    <section id="from-meter" className="scroll-mt-24 space-y-10">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[hsl(var(--water-mid))]">
          When the utility blocks the website
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight text-[hsl(var(--water-deep))] sm:text-4xl">
          Yes — get the data from the meter itself
        </h2>
        <p className="mt-3 text-muted-foreground">
          Read Your Meter Pro is a courtesy portal the water company can turn
          off. The meter still measures, and most Arad AMI units still
          transmit. You do not need their website to read your own dial or to
          decode your own radio packets.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {fromMeterPaths.map((path, index) => (
          <article
            key={path.id}
            className="rounded-2xl border border-border/70 bg-white/70 p-6 backdrop-blur"
          >
            <Badge variant="outline">Option {index + 1}</Badge>
            <h3 className="mt-3 font-display text-2xl text-[hsl(var(--water-deep))]">
              {path.title}
            </h3>
            <p className="mt-1 text-sm text-[hsl(var(--water-mid))]" dir="rtl" lang="he">
              {path.hebrew}
            </p>
            <p className="mt-3 text-foreground/90">{path.summary}</p>
            <ol className="mt-4 list-decimal space-y-2 ps-5 text-sm text-muted-foreground">
              {path.steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </article>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="space-y-5">
          <h3 className="font-display text-2xl text-[hsl(var(--water-deep))]">
            Radio kit — pick one
          </h3>
          {hardwareOptions.map((option) => (
            <article
              key={option.id}
              className="border-t border-border/70 pt-5 first:border-t-0 first:pt-0"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h4 className="text-lg font-medium text-[hsl(var(--water-deep))]">
                  {option.title}
                </h4>
                <span className="text-xs uppercase tracking-wide text-muted-foreground">
                  {option.cost}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{option.bestFor}</p>
              <ul className="mt-3 list-disc space-y-1 ps-5 text-sm text-muted-foreground">
                {option.parts.map((part) => (
                  <li key={part}>{part}</li>
                ))}
              </ul>
              <p className="mt-3 text-sm">{option.software}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {option.links.map((link) => (
                  <Button key={link.href} asChild variant="outline" size="sm">
                    <a href={link.href} target="_blank" rel="noreferrer">
                      {link.label}
                    </a>
                  </Button>
                ))}
              </div>
            </article>
          ))}
        </div>

        <div className="space-y-5">
          <SerialConverter />
          <div className="rounded-2xl bg-[hsl(var(--water-deep))] p-5 text-[hsl(var(--water-foam))]">
            <h3 className="font-display text-xl">Dialog3G cheat sheet</h3>
            <dl className="mt-4 space-y-3 text-sm">
              {rfFacts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-2 last:border-b-0"
                >
                  <dt className="text-white/65">{fact.label}</dt>
                  <dd className="text-end font-medium">{fact.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-xs text-white/60">
              Only decode and keep packets that match your printed serial. Range
              is local — walls and metal pits cut it down.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
