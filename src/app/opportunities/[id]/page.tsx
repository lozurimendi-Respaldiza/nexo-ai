import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { deleteOpportunityAction, updateOpportunityAction } from "../actions";
import { ConfirmDeleteButton } from "../confirm-delete-button";

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
  const { supabase, workspaceId, canManageWorkspace } = await getWorkspaceContext();
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
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold tracking-[0.25em] text-cyan-300"
            >
              NEXO AI
            </Link>
            <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-cyan-300">
              GESTIÓN COMERCIAL
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
              Editar oportunidad
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              Actualiza la información, el estado comercial y las previsiones de esta oportunidad.
            </p>
            <p className="mt-3 text-sm font-medium text-slate-300">
              {opportunity.title}
            </p>
          </div>

          <nav className="flex flex-wrap gap-2">
            <Link
              href="/next-best-action"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-200 transition hover:border-cyan-700 hover:text-cyan-300"
            >
              Next Best Action
            </Link>
            <Link
              href="/opportunities"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-200 transition hover:border-slate-500"
            >
              Pipeline
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-200 transition hover:border-slate-500"
            >
              Dashboard
            </Link>
          </nav>
        </header>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/opportunities"
            className="text-sm text-slate-400 transition hover:text-cyan-300"
          >
            ← Volver al pipeline
          </Link>
          <span className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
            Registro comercial
          </span>
        </div>

        {query.saved && (
          <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-300">
            Cambios guardados correctamente.
          </p>
        )}
        {query.error === "forbidden" ? (
          <p className="mt-5 rounded-lg border border-amber-900 bg-amber-950/30 p-3 text-sm text-amber-200">
            Tu rol no permite eliminar oportunidades. Solicita esta operación a un administrador del espacio.
          </p>
        ) : query.error && (
          <p className="mt-5 rounded-lg border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-300">
            No se pudo completar la operación. Comprueba los datos e inténtalo de nuevo.
          </p>
        )}

        <section className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-black/10 sm:p-7">
          <div className="mb-6 border-b border-slate-800 pb-5">
            <h2 className="text-lg font-semibold text-white">Datos de la oportunidad</h2>
            <p className="mt-1 text-sm text-slate-400">
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
                    {[contact.first_name, contact.last_name].filter(Boolean).join(" ")}
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
                <input
                  name="next_action_at"
                  type="datetime-local"
                  defaultValue={
                    opportunity.next_action_at
                      ? new Date(opportunity.next_action_at).toISOString().slice(0, 16)
                      : ""
                  }
                  className={input}
                />
              </Field>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-slate-800 pt-5">
              <Link
                href="/opportunities"
                className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500 hover:text-white"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-300 focus:ring-offset-2 focus:ring-offset-slate-900"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </section>

        {canManageWorkspace && <section className="mt-6 rounded-2xl border border-rose-950/80 bg-slate-900/50 p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-semibold text-rose-300">Eliminar oportunidad</h2>
              <p className="mt-1 text-sm text-slate-400">
                Esta acción es permanente y no se puede deshacer.
              </p>
            </div>
            <form action={deleteOpportunityAction}>
              <input type="hidden" name="id" value={opportunity.id} />
              <ConfirmDeleteButton />
            </form>
          </div>
        </section>}
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
  "mt-1 block w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-950";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm font-medium text-slate-300">
      {label}
      {children}
    </label>
  );
}
