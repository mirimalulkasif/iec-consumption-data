import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { aliexpressOrder, buyThisNow, wiringReminder } from "@/lib/aliexpress-order";

export function AliExpressCart() {
  return (
    <section id="order" className="scroll-mt-24 space-y-8">
      <div className="max-w-3xl">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-[hsl(var(--water-mid))]">
          AliExpress shopping list
        </p>
        <h2 className="mt-2 font-display text-3xl tracking-tight text-[hsl(var(--water-deep))] sm:text-4xl">
          What to order for the ESP32 + SI4432 setup
        </h2>
        <p className="mt-3 text-muted-foreground">
          Set AliExpress ship-to Israel. Start with the three “buy this”
          links below — cheapest matching picks — then follow the SKU notes
          exactly.
        </p>
      </div>

      <div className="space-y-4">
        {buyThisNow.map((item) => (
          <article
            key={item.id}
            className="rounded-2xl border border-[hsl(var(--water-mid))]/30 bg-[hsl(var(--water-foam))]/70 p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <Badge className="mb-2">Buy #{item.rank}</Badge>
                <h3 className="text-lg font-medium text-[hsl(var(--water-deep))]">
                  {item.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{item.priceNote}</p>
              </div>
              <Button asChild>
                <a href={item.url} target="_blank" rel="noreferrer">
                  Open cheapest match
                </a>
              </Button>
            </div>
            {"directUrl" in item && item.directUrl && (
              <p className="mt-2 text-sm">
                Direct listing backup:{" "}
                <a
                  className="underline underline-offset-2"
                  href={item.directUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  open item
                </a>
              </p>
            )}
            <ol className="mt-3 list-decimal space-y-1 ps-5 text-sm text-muted-foreground">
              {item.select.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            {item.reject.length > 0 && (
              <p className="mt-3 text-sm text-destructive">
                Skip: {item.reject.join(" · ")}
              </p>
            )}
          </article>
        ))}
      </div>

      <div className="space-y-6">
        <h3 className="font-display text-2xl text-[hsl(var(--water-deep))]">
          Full kit (including optional later items)
        </h3>
        {aliexpressOrder.map((item, index) => (
          <article
            key={item.id}
            className="grid gap-4 rounded-2xl border border-border/70 bg-white/75 p-5 backdrop-blur lg:grid-cols-[72px_minmax(0,1fr)_auto]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--water-foam))] font-display text-xl text-[hsl(var(--water-deep))]">
              {index + 1}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-medium text-[hsl(var(--water-deep))]">
                  {item.name}
                </h3>
                <Badge variant="secondary">{item.qty}</Badge>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{item.why}</p>
              <p className="mt-2 text-sm">
                <span className="font-medium">Must match: </span>
                {item.must}
              </p>
              {item.avoid && (
                <p className="mt-2 text-sm text-destructive">{item.avoid}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:items-stretch">
              <Button asChild>
                <a href={item.searchUrl} target="_blank" rel="noreferrer">
                  Search AliExpress
                </a>
              </Button>
              {item.exampleUrl && (
                <Button asChild variant="outline">
                  <a href={item.exampleUrl} target="_blank" rel="noreferrer">
                    Example listing
                  </a>
                </Button>
              )}
            </div>
          </article>
        ))}
      </div>

      <div className="rounded-2xl bg-[hsl(var(--water-deep))] p-6 text-[hsl(var(--water-foam))]">
        <h3 className="font-display text-xl">SPI wiring (Dialog3g-Decoder)</h3>
        <p className="mt-2 text-sm text-white/70">
          After the parts arrive, connect like this — 3.3 V only on the radio.
        </p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {wiringReminder.map((row) => (
            <div
              key={row.esp}
              className="flex justify-between gap-3 border-b border-white/15 pb-2"
            >
              <dt className="font-mono text-white/80">{row.esp}</dt>
              <dd className="font-mono">{row.radio}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-white/60">
          Software:{" "}
          <a
            className="underline underline-offset-2"
            href="https://github.com/assafms/Dialog3g-Decoder"
            target="_blank"
            rel="noreferrer"
          >
            Dialog3g-Decoder
          </a>{" "}
          ESPHome component. First power it indoors on USB and walk toward the
          meter with a power bank to test range.
        </p>
      </div>
    </section>
  );
}
