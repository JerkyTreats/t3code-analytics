import { Link, Route, Router, Routes, useQuery } from "lakebed/client";
import type { ComponentChildren } from "preact";
import type { DashboardView, MetricFamily, SnapshotMetric } from "../shared/analytics";

const displayStyle = { fontFamily: '"Iowan Old Style", "Palatino Linotype", Palatino, serif' };
const monoStyle = { fontFamily: '"IBM Plex Mono", "Azeret Mono", ui-monospace, monospace' };

const familyStyle: Record<MetricFamily, { bar: string; ink: string; wash: string }> = {
  throughput: { bar: "bg-[#ee5f3c]", ink: "text-[#9e321b]", wash: "bg-[#f7d3c7]" },
  reach: { bar: "bg-[#087e8b]", ink: "text-[#075f68]", wash: "bg-[#c7e5e3]" },
  activity: { bar: "bg-[#e8ad27]", ink: "text-[#8a5b00]", wash: "bg-[#f4e3ad]" },
  capacity: { bar: "bg-[#4d628a]", ink: "text-[#35466a]", wash: "bg-[#d2d9e7]" }
};

function Shell({ children }: { children: ComponentChildren }) {
  return (
    <div className="min-h-screen overflow-hidden bg-[#f0eadc] text-[#172b38] selection:bg-[#ee5f3c] selection:text-white">
      <style>{`
        @keyframes settle { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        .settle { animation: settle 600ms cubic-bezier(.2,.7,.2,1) both; }
      `}</style>
      <div className="pointer-events-none fixed inset-0 opacity-[0.075] [background-image:repeating-linear-gradient(0deg,transparent_0,transparent_23px,#172b38_24px)]" />
      <header className="relative border-b-2 border-[#172b38] bg-[#f0eadc]/95 px-5 py-4 backdrop-blur md:px-10">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-6">
          <Link className="flex items-center gap-3" to="/">
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden border-2 border-[#172b38] bg-[#f7f2e7]">
              <span className="absolute bottom-1 left-1 right-1 h-1 bg-[#172b38]" />
              <span className="absolute bottom-3 left-2 right-2 h-1 bg-[#087e8b]" />
              <span className="absolute bottom-5 left-3 right-3 h-1 bg-[#ee5f3c]" />
            </span>
            <span>
              <span className="block text-lg font-black leading-none tracking-[-0.03em]" style={displayStyle}>Strata</span>
              <span className="mt-1 block text-[9px] uppercase tracking-[0.28em] text-[#5c6b70]" style={monoStyle}>T3Code field report</span>
            </span>
          </Link>
          <nav className="flex gap-5 text-[9px] uppercase tracking-[0.22em]" style={monoStyle}>
            <Link className="border-b border-[#172b38] pb-1" to="/">Current bed</Link>
            <Link className="pb-1 text-[#5c6b70] hover:text-[#172b38]" to="/method">Method</Link>
          </nav>
        </div>
      </header>
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <Shell>
      <main className="relative mx-auto grid min-h-[calc(100vh-74px)] max-w-[1380px] place-items-center px-5 py-16 md:px-10">
        <section className="settle w-full max-w-3xl border-2 border-[#172b38] bg-[#f7f2e7] p-8 shadow-[12px_12px_0_#172b38] md:p-14">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#9e321b]" style={monoStyle}>Publication boundary open</p>
          <h1 className="mt-5 max-w-2xl text-5xl font-black leading-[0.88] tracking-[-0.055em] md:text-7xl" style={displayStyle}>No accepted layer yet.</h1>
          <p className="mt-7 max-w-xl text-sm leading-7 text-[#4f6066]">The capsule is healthy. It will remain blank until the local experiment loader publishes a complete synthetic snapshot.</p>
          <div className="mt-9 border-l-4 border-[#e8ad27] bg-[#f4e3ad] px-5 py-4 text-xs leading-6" style={monoStyle}>
            Waiting for fixture alpha or beta through the protected local endpoint.
          </div>
        </section>
      </main>
    </Shell>
  );
}

function MetricBlock({ metric, index }: { metric: SnapshotMetric; index: number }) {
  const visual = familyStyle[metric.family] ?? familyStyle.capacity;
  return (
    <article
      className={`settle group relative min-h-64 overflow-hidden border-b-2 border-[#172b38] p-6 last:border-b-0 md:min-h-72 md:p-8 ${visual.wash}`}
      style={{ animationDelay: `${120 + index * 80}ms` }}
    >
      <div className={`absolute bottom-0 left-0 top-0 w-2 ${visual.bar} transition-[width] duration-300 group-hover:w-4`} />
      <div className="flex items-start justify-between gap-6 pl-3">
        <div>
          <p className={`text-[9px] font-bold uppercase tracking-[0.22em] ${visual.ink}`} style={monoStyle}>{metric.family}</p>
          <h2 className="mt-3 text-sm font-bold uppercase tracking-[0.08em]">{metric.label}</h2>
        </div>
        <span className="text-[10px] text-[#617177]" style={monoStyle}>{metric.ordinal}</span>
      </div>
      <div className="absolute bottom-6 left-9 right-6 md:bottom-8 md:left-11 md:right-8">
        <p className="text-6xl font-black leading-none tracking-[-0.065em] md:text-7xl" style={displayStyle}>{metric.value}</p>
        <p className="mt-3 text-[9px] uppercase tracking-[0.24em] text-[#4f6066]" style={monoStyle}>{metric.unit}</p>
      </div>
    </article>
  );
}

function DashboardPage() {
  const dashboard = useQuery<DashboardView | null>("dashboard");
  if (!dashboard) {
    return <EmptyState />;
  }

  const snapshot = dashboard.snapshot;
  return (
    <Shell>
      <main className="relative mx-auto max-w-[1380px] px-5 pb-20 pt-10 md:px-10 md:pt-16">
        <section className="grid gap-10 border-b-2 border-[#172b38] pb-12 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
          <div className="settle">
            <div className="flex items-center gap-3 text-[9px] uppercase tracking-[0.24em] text-[#075f68]" style={monoStyle}>
              <span className="h-2.5 w-2.5 rounded-full bg-[#087e8b] shadow-[0_0_0_5px_#087e8b22]" />
              Published atomically
            </div>
            <h1 className="mt-7 max-w-4xl text-[clamp(4rem,10vw,9rem)] font-black leading-[0.75] tracking-[-0.075em]" style={displayStyle}>
              Read the layer, not the noise.
            </h1>
          </div>
          <aside className="settle border-l-2 border-[#172b38] pl-6 [animation-delay:100ms]">
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#5c6b70]" style={monoStyle}>Current snapshot</p>
            <p className="mt-3 text-3xl font-black tracking-tight" style={displayStyle}>{snapshot.label}</p>
            <dl className="mt-7 grid gap-4 text-[10px] leading-5" style={monoStyle}>
              <div>
                <dt className="uppercase tracking-[0.14em] text-[#7a878b]">Observed</dt>
                <dd>{snapshot.observedAt}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.14em] text-[#7a878b]">Lineage</dt>
                <dd>{snapshot.source}</dd>
              </div>
              <div>
                <dt className="uppercase tracking-[0.14em] text-[#7a878b]">Quality</dt>
                <dd>{snapshot.quality}</dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="grid border-x-2 border-b-2 border-[#172b38] md:grid-cols-2">
          {dashboard.metrics.map((metric, index) => (
            <div className="border-[#172b38] odd:md:border-r-2" key={metric.id}>
              <MetricBlock index={index} metric={metric} />
            </div>
          ))}
        </section>

        <section className="grid gap-8 border-b-2 border-[#172b38] py-10 lg:grid-cols-[0.65fr_1.35fr]">
          <div>
            <p className="text-[9px] uppercase tracking-[0.22em] text-[#9e321b]" style={monoStyle}>Experimental contract</p>
            <h2 className="mt-3 text-4xl font-black leading-none tracking-[-0.04em]" style={displayStyle}>One visible truth at a time.</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["01", "Prepare", "Insert the new snapshot as inactive."],
              ["02", "Reconcile", "Write every metric row inside the transaction."],
              ["03", "Publish", "Retire the old layer and activate the new one."]
            ].map(([number, title, body]) => (
              <article className="border-t-4 border-[#172b38] bg-[#f7f2e7] p-5" key={number}>
                <p className="text-[9px] text-[#7a878b]" style={monoStyle}>{number}</p>
                <h3 className="mt-5 text-lg font-black" style={displayStyle}>{title}</h3>
                <p className="mt-2 text-xs leading-5 text-[#5c6b70]">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <footer className="flex flex-col justify-between gap-4 pt-7 text-[9px] uppercase tracking-[0.2em] text-[#65747a] sm:flex-row" style={monoStyle}>
          <span>Fixture data only · no T3Code records</span>
          <span>Snapshot key · {snapshot.snapshotKey}</span>
        </footer>
      </main>
    </Shell>
  );
}

function MethodPage() {
  return (
    <Shell>
      <main className="relative mx-auto grid max-w-[1100px] gap-12 px-5 py-14 md:px-10 lg:grid-cols-[0.7fr_1.3fr] lg:py-24">
        <div className="settle">
          <p className="text-[9px] uppercase tracking-[0.24em] text-[#9e321b]" style={monoStyle}>Experiment boundary</p>
          <h1 className="mt-5 text-6xl font-black leading-[0.82] tracking-[-0.06em]" style={displayStyle}>A view is not a warehouse.</h1>
        </div>
        <div className="settle space-y-10 border-l-2 border-[#172b38] pl-7 [animation-delay:100ms] md:pl-12">
          <section>
            <h2 className="text-3xl font-black tracking-tight" style={displayStyle}>What this proves</h2>
            <p className="mt-4 text-base leading-8 text-[#4f6066]">Lakebed can hold a small materialized snapshot, switch the visible version inside one write transaction, and serve the result through a reactive query and a compact Preact client.</p>
          </section>
          <section>
            <h2 className="text-3xl font-black tracking-tight" style={displayStyle}>What stays outside</h2>
            <p className="mt-4 text-base leading-8 text-[#4f6066]">Extraction, privacy admission, joins, token reconciliation, source snapshots, and data quality execution remain upstream responsibilities. This capsule receives only accepted aggregate rows.</p>
          </section>
          <section className="border-2 border-[#172b38] bg-[#f4e3ad] p-6 shadow-[8px_8px_0_#172b38]">
            <p className="text-[9px] uppercase tracking-[0.22em]" style={monoStyle}>Safety note</p>
            <p className="mt-4 text-2xl font-black" style={displayStyle}>Everything here is synthetic.</p>
            <p className="mt-3 text-sm leading-6 text-[#4f6066]">No account, client, device, session, thread, turn, message, prompt, tool payload, path, or credential from T3Code is present.</p>
          </section>
          <Link className="inline-block border-b-2 border-[#172b38] pb-1 text-[9px] uppercase tracking-[0.2em]" style={monoStyle} to="/">Return to current bed</Link>
        </div>
      </main>
    </Shell>
  );
}

export function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/method" element={<MethodPage />} />
        <Route path="*" element={<DashboardPage />} />
      </Routes>
    </Router>
  );
}
