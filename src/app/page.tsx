
import Link from "next/link";
import { demoOpportunities, stageLabels } from "@/lib/domain";
import { ThemeSelector } from "@/components/theme-selector";

const euro = new Intl.NumberFormat("es-ES", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

export default function HomePage() {
  const pipelineValue = demoOpportunities.reduce(
    (sum, item) => sum + item.valueEur,
    0
  );

  return (
    <main
      className="min-h-screen md:grid md:grid-cols-[230px_1fr]"
      style={{ backgroundColor: "var(--canvas)", color: "var(--ink)" }}
    >
      <aside
        className="border-r p-6"
        style={{
          borderColor: "var(--line)",
          backgroundColor: "var(--surface)",
        }}
      >
        <div className="mb-10">
          <div className="text-xl font-bold tracking-tight">
            NEXO <span style={{ color: "var(--accent)" }}>AI</span>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
            Sales workspace
          </p>
        </div>

        <nav className="space-y-2 text-sm">
          <div
            className="rounded-lg px-3 py-2 font-semibold"
            style={{
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            Resumen
          </div>
          {["Oportunidades", "Contactos", "Tareas", "Configuración"].map(
            (item) => (
              <div
                key={item}
                className="rounded-lg px-3 py-2"
                style={{ color: "var(--muted)" }}
              >
                {item}
              </div>
            )
          )}
        </nav>

        <div
          className="mt-12 rounded-xl border border-dashed p-3 text-xs leading-5"
          style={{
            borderColor: "var(--line)",
            color: "var(--muted)",
          }}
        >
          Entorno de demostración. Los datos mostrados son ficticios.
        </div>
      </aside>

      <section className="min-w-0 p-6 md:p-10">
        <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Workspace de demostración
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Resumen comercial
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
              Prioriza oportunidades y define la siguiente acción.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ThemeSelector compact />
            <span
              className="rounded-full border px-3 py-1 text-xs font-medium"
              style={{
                color: "var(--warning)",
                backgroundColor: "var(--warning-soft)",
                borderColor: "var(--warning)",
              }}
            >
              Prototipo · sin datos reales
            </span>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-xl px-8 py-4 text-base font-bold shadow-md transition hover:opacity-90 focus-visible:outline"
            style={{
              backgroundColor: "var(--accent)",
              color: "#ffffff",
            }}
          >
            ACCEDER A NEXO AI
            <span className="ml-3 text-xl" aria-hidden="true">
              →
            </span>
          </Link>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric
            label="Oportunidades activas"
            value={String(demoOpportunities.length)}
            hint="Datos de ejemplo"
          />
          <Metric
            label="Valor del pipeline"
            value={euro.format(pipelineValue)}
            hint="Importe ilustrativo"
          />
          <Metric
            label="Siguiente acción"
            value="Hoy"
            hint="Revisar oportunidad prioritaria"
          />
        </div>

        <section
          className="mt-8 overflow-hidden rounded-2xl border"
          style={{
            borderColor: "var(--line)",
            backgroundColor: "var(--surface)",
          }}
        >
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: "var(--line)" }}
          >
            <div>
              <h2 className="font-semibold">Oportunidades recientes</h2>
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                Vista inicial con datos ficticios
              </p>
            </div>
            <span className="text-xs" style={{ color: "var(--muted)" }}>
              3 registros
            </span>
          </div>

          <div>
            {demoOpportunities.map((item) => (
              <article
                key={item.id}
                className="grid gap-2 border-b px-5 py-4 last:border-b-0 md:grid-cols-[1.3fr_0.8fr_0.7fr_1.2fr] md:items-center"
                style={{ borderColor: "var(--line)" }}
              >
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                    {item.company}
                  </p>
                </div>
                <p className="text-sm font-medium">
                  {euro.format(item.valueEur)}
                </p>
                <p className="text-xs" style={{ color: "var(--muted)" }}>
                  {stageLabels[item.stage]}
                </p>
                <div>
                  <p className="text-sm">{item.nextAction}</p>
                  <p
                    className="mt-1 text-xs"
                    style={{ color: "var(--accent)" }}
                  >
                    {item.dueLabel}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <div
          className="mt-6 rounded-2xl border p-5"
          style={{
            borderColor: "var(--accent-soft)",
            backgroundColor: "var(--accent-soft)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: "var(--accent)" }}
          >
            Next Best Action
          </p>
          <h2 className="mt-2 text-lg font-semibold">
            Empieza por la oportunidad que necesita seguimiento hoy.
          </h2>
          <p
            className="mt-1 max-w-2xl text-sm leading-6"
            style={{ color: "var(--muted)" }}
          >
            La recomendación inteligente se incorporará después de conectar
            datos reales, reglas de prioridad y el motor IA.
          </p>
        </div>
      </section>
    </main>
  );
}

function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <article
      className="rounded-2xl border p-5"
      style={{
        borderColor: "var(--line)",
        backgroundColor: "var(--surface)",
      }}
    >
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="mt-3 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
        {hint}
      </p>
    </article>
  );
}
