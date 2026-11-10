import { DailyDashboard } from "@/components/daily-dashboard";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 sm:px-8">
      <header className="mb-14 flex items-center justify-between">
        <p className="font-display text-2xl tracking-tight text-[var(--ink)]">IEC Daily</p>
        <a
          href="#daily"
          className="rounded-md border border-[var(--line)] bg-white/70 px-3 py-1.5 text-sm text-[var(--ink)] hover:bg-white"
        >
          Upload CSV
        </a>
      </header>

      <section className="mb-20 max-w-3xl">
        <p className="animate-rise text-sm font-medium uppercase tracking-[0.2em] text-[var(--amp)]">
          חברת החשמל · smart meter
        </p>
        <h1 className="animate-rise-delay mt-4 font-display text-5xl leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl">
          IEC Daily
        </h1>
        <p className="animate-rise-delay mt-5 max-w-xl text-lg text-[var(--mute)]">
          Download your meter_LP file from Israel Electric Corporation, upload it
          here, and see daily electricity use in kWh. Nothing is sent to a server.
        </p>
      </section>

      <DailyDashboard />
    </main>
  );
}
