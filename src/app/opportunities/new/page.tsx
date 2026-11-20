
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { createOpportunityAction } from "../actions";
import { LocalDateTimeField } from "@/components/local-date-time";

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

const inputClass =
  "nexo-field mt-1 block w-full rounded-lg px-3 py-2.5 text-sm outline-none transition focus:ring-2";

export default async function NewOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const { supabase, workspaceId } = await getWorkspaceContext();
  const db = supabase as any;

  const { data: contacts } = await db
    .from("contacts")
    .select("id,first_name,last_name,company")
    .eq("workspace_id", workspaceId)
    .order("first_name")
    .limit(500);

  return (
    <main className="nexo-page px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
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
              Nueva oportunidad
            </h1>

            <p className="nexo-muted mt-2 text-sm">
              Registra el potencial comercial y define su siguiente paso.
            </p>
          </div>

          <nav
            className="flex flex-wrap items-center gap-3"
            aria-label="Navegación principal"
          >
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
              href="/opportunities"
              className="nexo-field rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              Pipeline
            </Link>
          </nav>
        </header>

        {params.error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            No se pudo crear la oportunidad. Revisa los datos introducidos e
            inténtalo de nuevo.
          </p>
        )}

        <section className="nexo-card mt-7 rounded-xl p-5 sm:p-7">
          <div className="mb-6">
            <h2 className="text-lg font-semibold">
              Datos de la oportunidad
            </h2>

            <p className="nexo-muted mt-1 text-sm">
              Completa la información comercial. Podrás modificarla
              posteriormente.
            </p>
          </div>

          <form action={createOpportunityAction} className="space-y-5">
            <Field label="Nombre de la oportunidad">
              <input
                name="title"
                required
                minLength={2}
                maxLength={160}
                className={inputClass}
                placeholder="Ej. Renovación de suministro de empresa"
              />
            </Field>

            <Field label="Contacto asociado">
              <select
                name="contact_id"
                className={inputClass}
                defaultValue=""
              >
                <option value="">Sin contacto vinculado</option>
                {(contacts ?? []).map((contact: any) => (
                  <option key={contact.id} value={contact.id}>
                    {[contact.first_name, contact.last_name]
                      .filter(Boolean)
                      .join(" ") || "Contacto"}
                    {contact.company ? ` · ${contact.company}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Valor estimado (€)">
                <input
                  name="value"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue="0"
                  className={inputClass}
                />
              </Field>

              <Field label="Probabilidad de cierre (%)">
                <input
                  name="probability"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue="10"
                  className={inputClass}
                />
              </Field>

              <Field label="Etapa">
                <select
                  name="stage"
                  defaultValue="new"
                  className={inputClass}
                >
                  {stages.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Fecha prevista de cierre">
                <input
                  name="expected_close_date"
                  type="date"
                  className={inputClass}
                />
              </Field>

              <Field label="Fecha de la próxima acción">
                <LocalDateTimeField
                  name="next_action_at"
                  className={inputClass}
                />
              </Field>
            </div>

            <div
              className="flex flex-wrap justify-end gap-3 border-t pt-5"
              style={{ borderColor: "var(--line)" }}
            >
              <Link
                href="/opportunities"
                className="nexo-field rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                className="rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  color: "var(--ink)",
                  border: "1px solid var(--line)",
                }}
              >
                Crear oportunidad
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className="block text-sm font-medium"
      style={{ color: "var(--ink)" }}
    >
      {label}
      {children}
    </label>
  );
}
