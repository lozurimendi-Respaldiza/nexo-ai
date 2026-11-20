
import { LocalDate, LocalDateTime } from "@/components/local-date-time";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  createContactActivityAction,
  deleteContactAction,
} from "@/app/contacts/actions";
import { DeleteContactButton } from "@/app/contacts/delete-contact-button";
import { getWorkspaceContext } from "@/lib/workspace-context";

type ContactDetailProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    updated?: string;
    activityCreated?: string;
    activityError?: string;
    error?: string;
  }>;
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

const fieldLabel =
  "text-xs font-medium uppercase tracking-wide";

const surfaceStyle = {
  backgroundColor: "var(--surface)",
  borderColor: "var(--line)",
  color: "var(--ink)",
};

const mutedStyle = { color: "var(--muted)" };

export default async function ContactDetailPage({
  params,
  searchParams,
}: ContactDetailProps) {
  const { id } = await params;
  const query = await searchParams;
  const { supabase, workspaceId, canManageWorkspace } =
    await getWorkspaceContext();

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
    <main className="nexo-page px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/contacts"
          className="text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          ← Volver a contactos
        </Link>

        <header
          className="mt-5 flex flex-wrap items-start justify-between gap-4 border-b pb-6"
          style={{ borderColor: "var(--line)" }}
        >
          <div>
            <p
              className="text-xs font-semibold tracking-[0.25em]"
              style={{ color: "var(--accent)" }}
            >
              FICHA DE CONTACTO
            </p>
            <h1 className="mt-2 text-2xl font-semibold">
              {contact.first_name} {contact.last_name ?? ""}
            </h1>
            <p className="nexo-muted mt-1 text-sm">
              {contact.company ?? "Empresa no indicada"} ·{" "}
              {statusLabels[contact.status] ?? contact.status}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/contacts/${id}/edit`}
              className="rounded-lg border px-4 py-2 text-sm transition-colors"
              style={surfaceStyle}
            >
              Editar
            </Link>
            {canManageWorkspace && (
              <DeleteContactButton action={deleteAction} />
            )}
          </div>
        </header>

        {query.updated && (
          <p
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: "var(--success)",
              backgroundColor: "var(--success-soft)",
              borderColor: "var(--line)",
            }}
          >
            Cambios guardados.
          </p>
        )}

        {query.activityCreated && (
          <p
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: "var(--success)",
              backgroundColor: "var(--success-soft)",
              borderColor: "var(--line)",
            }}
          >
            Actividad registrada.
          </p>
        )}

        {query.error === "forbidden" && (
          <p
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: "var(--warning)",
              backgroundColor: "var(--warning-soft)",
              borderColor: "var(--line)",
            }}
          >
            Tu rol no permite eliminar contactos. Solicita esta operación a un administrador del espacio.
          </p>
        )}

        {query.error === "pending" && (
          <p
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: "var(--warning)",
              backgroundColor: "var(--warning-soft)",
              borderColor: "var(--line)",
            }}
          >
            Este contacto tiene oportunidades pendientes. Ciérralas como ganadas o perdidas antes de eliminarlo. El historial de oportunidades cerradas, actividades y tareas se conservará al eliminar el contacto.
          </p>
        )}

        {query.error &&
          query.error !== "pending" &&
          query.error !== "forbidden" && (
            <p
              className="mt-5 rounded-lg border px-4 py-3 text-sm"
              style={{
                color: "var(--danger)",
                backgroundColor: "var(--danger-soft)",
                borderColor: "var(--line)",
              }}
            >
              No se pudo eliminar el contacto.
            </p>
          )}

        {query.activityError && (
          <p
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              borderColor: "var(--line)",
            }}
          >
            No se pudo registrar la actividad. Revisa los datos.
          </p>
        )}

        <section className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { label: "Email", value: contact.email },
            { label: "Teléfono", value: contact.phone },
            { label: "Empresa", value: contact.company },
            { label: "Origen", value: contact.source },
            {
              label: "Estado",
              value: statusLabels[contact.status] ?? contact.status,
            },
            {
              label: "Fecha de alta",
              value: <LocalDate value={contact.created_at} />,
            },
          ].map(({ label, value }) => (
            <article
              key={label}
              className="nexo-card rounded-xl p-5"
            >
              <p
                className={fieldLabel}
                style={mutedStyle}
              >
                {label}
              </p>
              <p className="mt-2 break-words text-sm">
                {value || "—"}
              </p>
            </article>
          ))}
        </section>

        {contact.notes && (
          <section className="nexo-card mt-4 rounded-xl p-5">
            <h2 className="text-sm font-semibold">
              Notas del contacto
            </h2>
            <p
              className="mt-3 whitespace-pre-wrap text-sm leading-6"
              style={mutedStyle}
            >
              {contact.notes}
            </p>
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h2 className="text-lg font-semibold">
              Actividad comercial
            </h2>
            <p className="nexo-muted mt-1 text-sm">
              Historial de llamadas, emails, reuniones y notas.
            </p>

            {activitiesError ? (
              <p
                className="mt-4 rounded-lg border p-4 text-sm"
                style={{
                  color: "var(--danger)",
                  backgroundColor: "var(--danger-soft)",
                  borderColor: "var(--line)",
                }}
              >
                No se pudo cargar el historial.
              </p>
            ) : activities?.length ? (
              <div className="mt-4 space-y-3">
                {activities.map((activity) => (
                  <article
                    key={activity.id}
                    className="nexo-card rounded-xl p-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: "var(--accent)" }}
                      >
                        {activityLabels[activity.type] ?? activity.type}
                      </span>
                      <time
                        className="nexo-muted text-xs"
                      >
                        <LocalDateTime value={activity.occurred_at} />
                      </time>
                    </div>
                    <h3 className="mt-2 text-sm font-medium">
                      {activity.subject}
                    </h3>
                    {activity.body && (
                      <p
                        className="mt-2 whitespace-pre-wrap text-sm leading-6"
                        style={mutedStyle}
                      >
                        {activity.body}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <div
                className="mt-4 rounded-xl border border-dashed p-6 text-sm"
                style={{
                  borderColor: "var(--line)",
                  color: "var(--muted)",
                }}
              >
                Todavía no hay actividad registrada para este contacto.
              </div>
            )}
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              Registrar actividad
            </h2>
            <p className="nexo-muted mt-1 text-sm">
              Añade una interacción al historial de este contacto.
            </p>

            <form
              action={addActivityAction}
              className="nexo-card mt-4 space-y-4 rounded-xl p-5"
            >
              <label className="block text-sm">
                Tipo
                <select
                  name="type"
                  defaultValue="call"
                  className="nexo-field mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                >
                  <option value="call">Llamada</option>
                  <option value="email">Email</option>
                  <option value="meeting">Reunión</option>
                  <option value="note">Nota</option>
                  <option value="other">Otro</option>
                </select>
              </label>

              <label className="block text-sm">
                Asunto *
                <input
                  name="subject"
                  required
                  maxLength={160}
                  className="nexo-field mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Ej. Primera llamada de seguimiento"
                />
              </label>

              <label className="block text-sm">
                Detalle
                <textarea
                  name="body"
                  rows={4}
                  maxLength={5000}
                  className="nexo-field mt-1 w-full rounded-lg px-3 py-2.5 text-sm"
                  placeholder="Resumen de la conversación, acuerdos o próximos pasos..."
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                }}
              >
                Guardar actividad
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
