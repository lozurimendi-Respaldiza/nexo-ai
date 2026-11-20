
import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { deleteOpportunityAction, updateOpportunityAction } from "../actions";
import { ConfirmDeleteButton } from "../confirm-delete-button";
import { LocalDateTimeField } from "@/components/local-date-time";

export const dynamic = "force-dynamic";

export default async function OpportunityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId, canManageWorkspace } =
    await getWorkspaceContext();
  const db = supabase as any;

  const { data: opportunity, error } = await db
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error || !opportunity) notFound();

  const { data: contacts } = await db
    .from("contacts")
    .select("id,first_name,last_name,company")
    .eq("workspace_id", workspaceId)
    .order("first_name")
    .limit(500);

  return (
    <main className="nexo-page px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl">
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
              Editar oportunidad
            </h1>

            <p className="nexo-muted mt-2 max-w-2xl text-sm">
              Actualiza la información, el estado comercial y las previsiones
              de esta oportunidad.
            </p>

            <p className="mt-3 text-sm font-medium">
              {opportunity.title}
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            <Link
              href="/next-best-action"
              className="rounded-lg border px-4 py-2.5 text-sm transition-colors"
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
              className="nexo-field rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Pipeline
            </Link>

            <Link
              href="/dashboard"
              className="nexo-field rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Dashboard
            </Link>
          </nav>
        </header>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/opportunities"
            className="text-sm transition-colors"
            style={{ color: "var(--muted)" }}
          >
            ← Volver al pipeline
          </Link>

          <span
            className="rounded-full border px-3 py-1 text-xs"
            style={{
              borderColor: "var(--line)",
              backgroundColor: "var(--surface-secondary)",
              color: "var(--muted)",
            }}
          >
            Registro comercial
          </span>
        </div>

        {query.saved && (
          <p
            role="status"
            className="mt-5 rounded-lg border p-3 text-sm"
            style={{
              borderColor: "var(--success)",
              backgroundColor: "var(--success-soft)",
              color: "var(--success)",
            }}
          >
            Cambios guardados correctamente.
          </p>
        )}

        {query.error === "forbidden" ? (
          <p
            role="alert"
            className="mt-5 rounded-lg border p-3 text-sm"
            style={{
              borderColor: "var(--warning)",
              backgroundColor: "var(--warning-soft)",
              color: "var(--warning)",
            }}
          >
            Tu rol no permite eliminar oportunidades. Solicita esta operación
            a un administrador del espacio.
          </p>
        ) : (
          query.error && (
            <p
              role="alert"
              className="mt-5 rounded-lg border p-3 text-sm"
              style={{
                borderColor: "var(--danger)",
                backgroundColor: "var(--danger-soft)",
                color: "var(--danger)",
              }}
            >
              No se pudo completar la operación. Comprueba los datos e
              inténtalo de nuevo.
            </p>
          )
        )}

        <section className="nexo-card mt-6 rounded-2xl p-5 sm:p-7">
          <div
            className="mb-6 border-b pb-5"
            style={{ borderColor: "var(--line)" }}
          >
            <h2 className="text-lg font-semibold">
              Datos de la oportunidad
            </h2>
            <p className="nexo-muted mt-1 text-sm">
              Los cambios se aplicarán al guardar el formulario.
            </p>
          </div>

          <form action={updateOpportunityAction} className="space-y-5">
            <input type="hidden" name="id" value={opportunity.id} />

            <Field label="Nombre de la oportunidad">
              <input
                name="title"
                required
                minLength={2}
                maxLength={160}
                defaultValue={opportunity.title}
                className={input}
              />
            </Field>

            <Field label="Contacto asociado">
              <select
                name="contact_id"
                defaultValue={opportunity.contact_id ?? ""}
                className={input}
              >
                <option value="">Sin contacto vinculado</option>
                {(contacts ?? []).map((contact: any) => (
                  <option key={contact.id} value={contact.id}>
                    {[contact.first_name, contact.last_name]
                      .filter(Boolean)
                      .join(" ")}
                    {contact.company ? ` · ${contact.company}` : ""}
                  </option>
                ))}
              </select>
            </Field>

            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Valor (€)">
                <input
                  name="value"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={opportunity.value}
                  className={input}
                />
              </Field>

              <Field label="Probabilidad (%)">
                <input
                  name="probability"
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  defaultValue={opportunity.probability}
                  className={input}
                />
              </Field>

              <Field label="Etapa comercial">
                <select
                  name="stage"
                  defaultValue={opportunity.stage}
                  className={input}
                >
                  {stages.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Fecha de cierre prevista">
                <input
                  name="expected_close_date"
                  type="date"
                  defaultValue={opportunity.expected_close_date ?? ""}
                  className={input}
                />
              </Field>

              <Field label="Fecha y hora de próxima acción">
                <LocalDateTimeField
                  name="next_action_at"
                  initialValue={opportunity.next_action_at}
                  className={input}
                />
              </Field>
            </div>

            <div
              className="flex flex-wrap justify-end gap-3 border-t pt-5"
              style={{ borderColor: "var(--line)" }}
            >
              <Link
                href="/opportunities"
                className="nexo-field rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
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
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        {canManageWorkspace && (
          <section
            className="nexo-card mt-6 rounded-2xl p-5 sm:p-6"
            style={{ borderColor: "var(--danger)" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2
                  className="font-semibold"
                  style={{ color: "var(--danger)" }}
                >
                  Eliminar oportunidad
                </h2>

                <p className="nexo-muted mt-1 text-sm">
                  Esta acción es permanente y no se puede deshacer.
                </p>
              </div>

              <form action={deleteOpportunityAction}>
                <input
                  type="hidden"
                  name="id"
                  value={opportunity.id}
                />
                <ConfirmDeleteButton />
              </form>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const stages = [
  ["new", "Nuevo"],
  ["contacted", "Contactado"],
  ["qualified", "Cualificado"],
  ["proposal", "Propuesta"],
  ["negotiation", "Negociación"],
  ["won", "Ganado"],
  ["lost", "Perdido"],
];

const input =
  "nexo-field mt-1 block w-full rounded-lg px-3 py-2.5 text-sm outline-none transition focus:ring-2";

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
