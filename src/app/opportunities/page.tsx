
import { AppNavigation } from "@/components/app-navigation";
import { LocalDateTime } from "@/components/local-date-time";
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

const stages = [
  ["new", "Nuevo"],
  ["contacted", "Contactado"],
  ["qualified", "Cualificado"],
  ["proposal", "Propuesta"],
  ["negotiation", "Negociación"],
  ["won", "Ganado"],
  ["lost", "Perdido"],
] as const;

const money = (amount: number, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(
    amount || 0
  );

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const params = await searchParams;
  const { supabase, workspaceId, role } = await getWorkspaceContext();
  const db = supabase as any;

  const { data: opportunities, error } = await db
    .from("opportunities")
    .select(
      "id,title,value,currency,stage,probability,expected_close_date,next_action_at,created_at,contact_id"
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(200);

  const { data: contacts } = await db
    .from("contacts")
    .select("id,first_name,last_name,company")
    .eq("workspace_id", workspaceId);

  const contactMap = new Map<string, string>(
    (contacts ?? []).map(
      (c: any): [string, string] => [
        String(c.id),
        [c.first_name, c.last_name].filter(Boolean).join(" ") ||
          String(c.company || "Contacto"),
      ]
    )
  );

  const rows = opportunities ?? [];
  const active = rows.filter(
    (o: any) => !["won", "lost"].includes(o.stage)
  );
  const total = active.reduce(
    (sum: number, o: any) => sum + Number(o.value || 0),
    0
  );
  const weighted = active.reduce(
    (sum: number, o: any) =>
      sum +
      (Number(o.value || 0) * Number(o.probability || 0)) / 100,
    0
  );

  return (
    <main className="nexo-page px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header
          className="flex flex-wrap items-start justify-between gap-4 border-b pb-6"
          style={{ borderColor: "var(--line)" }}
        >
          <div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold tracking-[0.25em]"
              style={{ color: "var(--accent)" }}
            >
              NEXO AI
            </Link>

            <p
              className="mt-4 text-xs font-semibold tracking-[0.2em]"
              style={{ color: "var(--accent)" }}
            >
              GESTIÓN COMERCIAL
            </p>

            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Pipeline comercial
            </h1>

            <p className="nexo-muted mt-2 text-sm">
              Controla oportunidades, etapas y previsión de ingresos.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/next-best-action"
              className="rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors"
              style={{
                borderColor: "var(--line)",
                backgroundColor: "var(--accent-soft)",
                color: "var(--ink)",
              }}
            >
              Next Best Action
            </Link>

            <Link
              href="/dashboard"
              className="nexo-field rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              Dashboard
            </Link>

            <Link
              href="/opportunities/new"
              className="rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--ink)",
                border: "1px solid var(--line)",
              }}
            >
              + Nueva oportunidad
            </Link>
          </div>
        </header>

        <AppNavigation role={role} />

        {params.saved && (
          <p
            role="status"
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--success)",
              backgroundColor: "var(--success-soft)",
              color: "var(--success)",
            }}
          >
            Cambios guardados correctamente. La oportunidad ya está actualizada
            en el pipeline.
          </p>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-3">
          <Metric
            label="Oportunidades activas"
            value={String(active.length)}
          />
          <Metric label="Valor del pipeline" value={money(total)} />
          <Metric label="Previsión ponderada" value={money(weighted)} />
        </section>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border p-3 text-sm"
            style={{
              borderColor: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            No se pudieron cargar las oportunidades.
          </p>
        )}

        <section className="mt-8 grid gap-4 xl:grid-cols-3">
          {stages.map(([stage, label]) => {
            const items = rows.filter(
              (o: any) => o.stage === stage
            );
            const subtotal = items.reduce(
              (sum: number, o: any) => sum + Number(o.value || 0),
              0
            );

            return (
              <div
                key={stage}
                className="nexo-card min-w-0 rounded-xl p-4"
              >
                <div className="mb-4 flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{label}</h2>

                  <span
                    className="rounded-full border px-2.5 py-1 text-xs"
                    style={{
                      borderColor: "var(--line)",
                      backgroundColor: "var(--surface-secondary)",
                      color: "var(--muted)",
                    }}
                  >
                    {items.length}
                  </span>
                </div>

                <p className="nexo-muted mb-3 text-xs">
                  {money(subtotal)}
                </p>

                <div className="space-y-3">
                  {items.map((o: any) => (
                    <Link
                      key={o.id}
                      href={`/opportunities/${o.id}`}
                      className="block rounded-lg border p-3 transition-colors"
                      style={{
                        borderColor: "var(--line)",
                        backgroundColor: "var(--surface-secondary)",
                      }}
                    >
                      <p className="font-medium">{o.title}</p>

                      <p className="nexo-muted mt-1 text-xs">
                        {contactMap.get(o.contact_id) ??
                          "Sin contacto vinculado"}
                      </p>

                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="font-semibold">
                          {money(
                            Number(o.value),
                            o.currency || "EUR"
                          )}
                        </span>

                        <span className="nexo-muted text-xs">
                          {o.probability}%
                        </span>
                      </div>

                      {o.next_action_at && (
                        <p className="nexo-muted mt-2 text-xs">
                          Próxima acción:{" "}
                          <LocalDateTime value={o.next_action_at} />
                        </p>
                      )}
                    </Link>
                  ))}

                  {items.length === 0 && (
                    <p
                      className="rounded-lg border border-dashed p-4 text-center text-xs"
                      style={{
                        borderColor: "var(--line)",
                        color: "var(--muted)",
                      }}
                    >
                      Sin oportunidades
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </section>

        <p className="nexo-muted mt-6 text-xs">
          Se muestran hasta 200 oportunidades. Los datos se consultan desde el
          espacio de trabajo autenticado.
        </p>
      </div>
    </main>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <article className="nexo-card rounded-xl p-5">
      <p className="nexo-muted text-sm">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">
        {value}
      </p>
    </article>
  );
}
