import { demoOpportunities, stageLabels } from "@/lib/domain";

const euro = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0
});

export default function HomePage() {
  const pipelineValue = demoOpportunities.reduce((sum, item) => sum + item.valueEur, 0);

  return (
    <main className="min-h-screen md:grid md:grid-cols-[230px_1fr]">
      <aside className="border-r border-[var(--line)] bg-white p-6">
        <div className="mb-10">
          <div className="text-xl font-bold tracking-tight">NEXO <span className="text-blue-700">AI</span></div>
          <p className="mt-1 text-xs text-[var(--muted)]">Sales workspace</p>
        </div>
        <nav className="space-y-2 text-sm">
          <div className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-800">Resumen</div>
          <div className="rounded-lg px-3 py-2 text-slate-600">Oportunidades</div>
          <div className="rounded-lg px-3 py-2 text-slate-600">Contactos</div>
          <div className="rounded-lg px-3 py-2 text-slate-600">Tareas</div>
          <div className="rounded-lg px-3 py-2 text-slate-600">Configuración</div>
        </nav>
        <div className="mt-12 rounded-xl border border-dashed border-slate-300 p-3 text-xs leading-5 text-slate-500">
          Entorno de demostración. Los datos mostrados son ficticios.
        </div>
      </aside>

      <section className="p-6 md:p-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-[var(--muted)]">Workspace de demostración</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Resumen comercial</h1>
            <p className="mt-2 text-sm text-[var(--muted)]">Prioriza oportunidades y define la siguiente acción.</p>
          </div>
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            Prototipo · sin datos reales
          </span>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric label="Oportunidades activas" value={String(demoOpportunities.length)} hint="Datos de ejemplo" />
          <Metric label="Valor del pipeline" value={euro.format(pipelineValue)} hint="Importe ilustrativo" />
          <Metric label="Siguiente acción" value="Hoy" hint="Revisar oportunidad prioritaria" />
        </div>

        <section className="mt-8 overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
          <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4">
            <div>
              <h2 className="font-semibold">Oportunidades recientes</h2>
              <p className="mt-1 text-xs text-[var(--muted)]">Vista inicial con datos ficticios</p>
            </div>
            <span className="text-xs text-[var(--muted)]">3 registros</span>
          </div>
          <div className="divide-y divide-[var(--line)]">
            {demoOpportunities.map((item) => (
              <article key={item.id} className="grid gap-2 px-5 py-4 md:grid-cols-[1.3fr_0.8fr_0.7fr_1.2fr] md:items-center">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{item.company}</p>
                </div>
                <p className="text-sm font-medium">{euro.format(item.valueEur)}</p>
                <p className="text-xs text-slate-600">{stageLabels[item.stage]}</p>
                <div>
                  <p className="text-sm">{item.nextAction}</p>
                  <p className="mt-1 text-xs text-blue-700">{item.dueLabel}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Next Best Action</p>
          <h2 className="mt-2 text-lg font-semibold">Empieza por la oportunidad que necesita seguimiento hoy.</h2>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
            La recomendación inteligente se incorporará después de conectar datos reales, reglas de prioridad y el motor IA.
          </p>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <article className="rounded-2xl border border-[var(--line)] bg-white p-5">
      <p className="text-sm text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-2 text-xs text-[var(--muted)]">{hint}</p>
    </article>
  );
}
