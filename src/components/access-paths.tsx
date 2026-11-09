import { accessSteps } from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AccessPaths() {
  return (
    <section id="paths" className="scroll-mt-24 space-y-8">
      <div className="max-w-2xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[hsl(var(--water-mid))]">
          How to get the data
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight text-[hsl(var(--water-deep))] sm:text-4xl">
          Three practical doors into an Arad meter
        </h2>
        <p className="mt-3 text-muted-foreground">
          Owning the meter is not enough by itself — readings live either in the
          utility’s Arad cloud, or in short RF bursts from the meter. Pick the
          path that matches what you have today.
        </p>
      </div>

      <div className="space-y-10">
        {accessSteps.map((path, index) => (
          <article key={path.id} className="grid gap-5 border-t border-border/70 pt-8 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <Badge variant="outline" className="mb-3">
                Path {index + 1}
              </Badge>
              <h3 className="font-display text-2xl text-[hsl(var(--water-deep))]">
                {path.title}
              </h3>
              <p className="mt-2 text-sm text-[hsl(var(--water-mid))]" dir="rtl" lang="he">
                {path.hebrew}
              </p>
            </div>
            <div>
              <p className="text-foreground/90">{path.summary}</p>
              <ol className="mt-4 list-decimal space-y-2 ps-5 text-muted-foreground">
                {path.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <p className="mt-4 text-sm text-muted-foreground">{path.support}</p>
              {path.links.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {path.links.map((link) => (
                    <Button key={link.href} asChild variant="outline" size="sm">
                      <a href={link.href} target="_blank" rel="noreferrer">
                        {link.label}
                      </a>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
