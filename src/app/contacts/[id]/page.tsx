import Link from "next/link";
import { notFound } from "next/navigation";
import { createContactActivityAction, deleteContactAction } from "@/app/contacts/actions";
import { DeleteContactButton } from "@/app/contacts/delete-contact-button";
import { getWorkspaceContext } from "@/lib/workspace-context";

type ContactDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ updated?: string; activityCreated?: string; activityError?: string; error?: string }>;
};

const statusLabels: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Cualificado",
  inactive: "Inactivo",
};

const activityLabels: Record<string, string> = {
  call: "Llamada",
  email: "Email",
  meeting: "Reunión",
  note: "Nota",
  other: "Otro",
};

const fieldLabel = "text-xs font-medium uppercase tracking-wide text-slate-500";

export default async function ContactDetailPage({ params, searchParams }: ContactDetailProps) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId, canManageWorkspace } = await getWorkspaceContext();

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (contactError || !contact) notFound();

  const { data: activities, error: activitiesError } = await supabase
    .from("activities")
    .select("id, type, subject, body, occurred_at, created_at")
    .eq("workspace_id", workspaceId)
    .eq("contact_id", id)
    .order("occurred_at", { ascending: false })
    .limit(50);

  const deleteAction = deleteContactAction.bind(null, id);
  const addActivityAction = createContactActivityAction.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link href="/contacts" className="text-sm text-cyan-300 hover:text-cyan-200">← Volver a contactos</Link>
        <header className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <p className="text-xs font-semibold tracking-[0.25em] text-cyan-300">FICHA DE CONTACTO</p>
            <h1 className="mt-2 text-2xl font-semibold">{contact.first_name} {contact.last_name ?? ""}</h1>
            <p className="mt-1 text-sm text-slate-400">{contact.company ?? "Empresa no indicada"} · {statusLabels[contact.status] ?? contact.status}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href={`/contacts/${id}/edit`} className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500">Editar</Link>
            {canManageWorkspace && <DeleteContactButton action={deleteAction} />}
          </div>
        </header>

        {query.updated && <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">Cambios guardados.</p>}
        {query.activityCreated && <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">Actividad registrada.</p>}
        {query.error === "forbidden" && <p className="mt-5 rounded-lg border border-amber-900 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">Tu rol no permite eliminar contactos. Solicita esta operación a un administrador del espacio.</p>}
        {query.error === "pending" && <p className="mt-5 rounded-lg border border-amber-900 bg-amber-950/30 px-4 py-3 text-sm text-amber-200">Este contacto tiene oportunidades pendientes. Ciérralas como ganadas o perdidas antes de eliminarlo. El historial de oportunidades cerradas, actividades y tareas se conservará al eliminar el contacto.</p>}
        {query.error && query.error !== "pending" && query.error !== "forbidden" && <p className="mt-5 rounded-lg border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">No se pudo eliminar el contacto.</p>}
        {query.activityError && <p className="mt-5 rounded-lg border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">No se pudo registrar la actividad. Revisa los datos.</p>}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Email", contact.email],
            ["Teléfono", contact.phone],
            ["Empresa", contact.company],
            ["Origen", contact.source],
            ["Estado", statusLabels[contact.status] ?? contact.status],
            ["Fecha de alta", new Date(contact.created_at).toLocaleDateString("es-ES")],
          ].map(([label, value]) => (
            <article key={label} className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <p className={fieldLabel}>{label}</p>
              <p className="mt-2 break-words text-sm text-slate-200">{value || "—"}</p>
            </article>
          ))}
        </section>

        {contact.notes && (
          <section className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
            <h2 className="text-sm font-semibold text-slate-300">Notas del contacto</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-400">{contact.notes}</p>
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h2 className="text-lg font-semibold">Actividad comercial</h2>
            <p className="mt-1 text-sm text-slate-400">Historial de llamadas, emails, reuniones y notas.</p>
            {activitiesError ? (
              <p className="mt-4 rounded-lg border border-rose-900 p-4 text-sm text-rose-300">No se pudo cargar el historial.</p>
            ) : activities?.length ? (
              <div className="mt-4 space-y-3">
                {activities.map((activity) => (
                  <article key={activity.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-cyan-300">{activityLabels[activity.type] ?? activity.type}</span>
                      <time className="text-xs text-slate-500">{new Date(activity.occurred_at).toLocaleString("es-ES")}</time>
                    </div>
                    <h3 className="mt-2 text-sm font-medium">{activity.subject}</h3>
                    {activity.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{activity.body}</p>}
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-6 text-sm text-slate-500">Todavía no hay actividad registrada para este contacto.</div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold">Registrar actividad</h2>
            <p className="mt-1 text-sm text-slate-400">Añade una interacción al historial de este contacto.</p>
            <form action={addActivityAction} className="mt-4 space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <label className="block text-sm text-slate-300">
                Tipo
                <select name="type" defaultValue="call" className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm">
                  <option value="call">Llamada</option>
                  <option value="email">Email</option>
                  <option value="meeting">Reunión</option>
                  <option value="note">Nota</option>
                  <option value="other">Otro</option>
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Asunto *
                <input name="subject" required maxLength={160} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" placeholder="Ej. Primera llamada de seguimiento" />
              </label>
              <label className="block text-sm text-slate-300">
                Detalle
                <textarea name="body" rows={4} maxLength={5000} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm" placeholder="Resumen de la conversación, acuerdos o próximos pasos..." />
              </label>
              <button type="submit" className="w-full rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Guardar actividad</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
