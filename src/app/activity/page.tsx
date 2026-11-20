import { AppNavigation } from "@/components/app-navigation";
import { LocalDateTime } from "@/components/local-date-time";
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type ActivityFilters = {
  type?: string;
  period?: string;
};

const activityLabels: Record<string, string> = {
  call: "Llamada",
  email: "Email",
  meeting: "Reunión",
  note: "Nota",
  other: "Otro",
  status_change: "Cambio de etapa",
};

const allowedTypes = ["call", "email", "meeting", "note", "other", "status_change"];

export default async function ActivityHistoryPage({
  searchParams,
}: {
  searchParams: Promise<ActivityFilters>;
}) {
  const params = await searchParams;
  const selectedType = allowedTypes.includes(params.type ?? "") ? params.type! : "all";
  const selectedPeriod = ["7", "30", "90", "all"].includes(params.period ?? "")
    ? params.period!
    : "all";

  const { supabase, workspaceId, role } = await getWorkspaceContext();
  let query = supabase
    .from("activities")
    .select("id, type, subject, body, occurred_at, contact_id, opportunity_id")
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: false })
    .limit(1000);

  if (selectedType !== "all") query = query.eq("type", selectedType);
  if (selectedPeriod !== "all") {
    const from = new Date();
    from.setDate(from.getDate() - Number(selectedPeriod));
    query = query.gte("occurred_at", from.toISOString());
  }

  const { data: activities, error } = await query;
  const rows = activities ?? [];

  const contactIds = [...new Set(rows.flatMap((activity) => activity.contact_id ? [activity.contact_id] : []))];
  const opportunityIds = [...new Set(rows.flatMap((activity) => activity.opportunity_id ? [activity.opportunity_id] : []))];

  const [{ data: contacts }, { data: opportunities }] = await Promise.all([
    contactIds.length
      ? supabase.from("contacts").select("id, first_name, last_name, company").eq("workspace_id", workspaceId).in("id", contactIds)
      : Promise.resolve({ data: [] as { id: string; first_name: string; last_name: string | null; company: string | null }[] }),
    opportunityIds.length
      ? supabase.from("opportunities").select("id, title").eq("workspace_id", workspaceId).in("id", opportunityIds)
      : Promise.resolve({ data: [] as { id: string; title: string }[] }),
  ]);

  const contactMap = new Map<string, string>((contacts ?? []).map((contact) => [
    contact.id,
    [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company || "Contacto",
  ] as [string, string]));
  const opportunityMap = new Map<string, string>((opportunities ?? []).map((opportunity) => [
    opportunity.id,
    opportunity.title,
  ] as [string, string]));


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
              SEGUIMIENTO COMERCIAL
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Historial de actividad
            </h1>
            <p className="nexo-muted mt-2 text-sm">
              Registro cronológico de las interacciones y cambios realizados
              en el espacio de trabajo.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="nexo-field rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
          >
            Dashboard
          </Link>
        </header>

        <div className="mt-6">
          <AppNavigation role={role} />
        </div>

        <form
          method="get"
          className="nexo-card mt-7 flex flex-wrap items-end gap-3 rounded-xl p-4"
        >
          <label className="text-sm font-medium">
            Tipo de actividad
            <select
              name="type"
              defaultValue={selectedType}
              className="nexo-field mt-1 block min-w-48 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="all">Todos los tipos</option>
              <option value="call">Llamadas</option>
              <option value="email">Emails</option>
              <option value="meeting">Reuniones</option>
              <option value="note">Notas</option>
              <option value="other">Otros</option>
              <option value="status_change">Cambios de etapa</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Periodo
            <select
              name="period"
              defaultValue={selectedPeriod}
              className="nexo-field mt-1 block min-w-40 rounded-lg px-3 py-2.5 text-sm"
            >
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="all">Todo el historial</option>
            </select>
          </label>

          <button
            type="submit"
            className="rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{
              borderColor: "var(--accent)",
              backgroundColor: "var(--accent-soft)",
              color: "var(--accent)",
            }}
          >
            Aplicar filtros
          </button>

          <Link
            href="/activity"
            className="nexo-muted rounded-lg px-2 py-2.5 text-sm transition-colors hover:underline"
          >
            Limpiar
          </Link>
        </form>

        <section className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Actividad registrada</h2>
            <p className="nexo-muted text-sm">
              {rows.length} registros
              {rows.length === 1000 ? " · máximo mostrado: 1.000" : ""}
            </p>
          </div>

          {error ? (
            <div
              className="rounded-xl border p-5 text-sm"
              style={{
                borderColor: "var(--danger)",
                backgroundColor: "var(--danger-soft)",
                color: "var(--danger)",
              }}
            >
              No se pudo cargar el historial de actividad.
            </div>
          ) : rows.length ? (
            <div className="space-y-3">
              {rows.map((activity) => {
                const contactName = activity.contact_id
                  ? contactMap.get(activity.contact_id) ?? "Contacto eliminado"
                  : "Contacto eliminado";
                const opportunityTitle = activity.opportunity_id
                  ? opportunityMap.get(activity.opportunity_id)
                  : null;

                return (
                  <article
                    key={activity.id}
                    className="nexo-card rounded-xl p-4 sm:p-5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className="rounded-full border px-2.5 py-1 text-xs font-medium"
                        style={{
                          borderColor: "var(--accent)",
                          backgroundColor: "var(--accent-soft)",
                          color: "var(--accent)",
                        }}
                      >
                        {activityLabels[activity.type] ?? activity.type}
                      </span>
                      <time className="nexo-muted text-xs">
                        <LocalDateTime value={activity.occurred_at} />
                      </time>
                    </div>

                    <h3 className="mt-3 font-medium">
                      {activity.subject}
                    </h3>

                    {activity.body && (
                      <p className="nexo-muted mt-2 whitespace-pre-wrap text-sm leading-6">
                        {activity.body}
                      </p>
                    )}

                    <div
                      className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t pt-3 text-xs"
                      style={{ borderColor: "var(--line)" }}
                    >
                      {activity.contact_id &&
                      contactMap.has(activity.contact_id) ? (
                        <Link
                          href={`/contacts/${activity.contact_id}`}
                          className="transition-colors hover:underline"
                          style={{ color: "var(--accent)" }}
                        >
                          Contacto: {contactName}
                        </Link>
                      ) : (
                        <span className="nexo-muted">
                          Contacto: {contactName}
                        </span>
                      )}

                      {activity.opportunity_id && opportunityTitle ? (
                        <Link
                          href={`/opportunities/${activity.opportunity_id}`}
                          className="transition-colors hover:underline"
                          style={{ color: "var(--accent)" }}
                        >
                          Oportunidad: {opportunityTitle}
                        </Link>
                      ) : activity.opportunity_id ? (
                        <span className="nexo-muted">
                          Oportunidad asociada no disponible
                        </span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div
              className="nexo-card rounded-xl border-dashed p-8 text-center"
              style={{ borderColor: "var(--line)" }}
            >
              <p className="font-medium">
                No hay actividades para estos filtros.
              </p>
              <p className="nexo-muted mt-2 text-sm">
                Prueba con otro periodo o selecciona todos los tipos.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
