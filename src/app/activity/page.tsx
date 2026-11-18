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

  const { supabase, workspaceId } = await getWorkspaceContext();
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
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</Link>
            <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-cyan-300">SEGUIMIENTO COMERCIAL</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Historial de actividad</h1>
            <p className="mt-2 text-sm text-slate-400">Registro cronológico de las interacciones y cambios realizados en el espacio de trabajo.</p>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500">Dashboard</Link>
        </header>

        <form method="get" className="mt-7 flex flex-wrap items-end gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <label className="text-sm text-slate-300">
            Tipo de actividad
            <select name="type" defaultValue={selectedType} className="mt-1 block min-w-48 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm">
              <option value="all">Todos los tipos</option>
              <option value="call">Llamadas</option>
              <option value="email">Emails</option>
              <option value="meeting">Reuniones</option>
              <option value="note">Notas</option>
              <option value="other">Otros</option>
              <option value="status_change">Cambios de etapa</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">
            Periodo
            <select name="period" defaultValue={selectedPeriod} className="mt-1 block min-w-40 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm">
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 90 días</option>
              <option value="all">Todo el historial</option>
            </select>
          </label>
          <button type="submit" className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Aplicar filtros</button>
          <Link href="/activity" className="px-2 py-2.5 text-sm text-slate-400 hover:text-white">Limpiar</Link>
        </form>

        <section className="mt-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Actividad registrada</h2>
            <p className="text-sm text-slate-500">{rows.length} registros{rows.length === 1000 ? " · máximo mostrado: 1.000" : ""}</p>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-900 bg-rose-950/30 p-5 text-sm text-rose-300">No se pudo cargar el historial de actividad.</div>
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
                  <article key={activity.id} className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 sm:p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="rounded-full border border-cyan-900 bg-cyan-950/40 px-2.5 py-1 text-xs font-medium text-cyan-300">
                        {activityLabels[activity.type] ?? activity.type}
                      </span>
                      <time className="text-xs text-slate-500">{new Date(activity.occurred_at).toLocaleString("es-ES")}</time>
                    </div>
                    <h3 className="mt-3 font-medium text-slate-100">{activity.subject}</h3>
                    {activity.body && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-400">{activity.body}</p>}
                    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-slate-800 pt-3 text-xs text-slate-500">
                      {activity.contact_id && contactMap.has(activity.contact_id) ? (
                        <Link href={`/contacts/${activity.contact_id}`} className="hover:text-cyan-300">Contacto: {contactName}</Link>
                      ) : (
                        <span>Contacto: {contactName}</span>
                      )}
                      {activity.opportunity_id && opportunityTitle ? (
                        <Link href={`/opportunities/${activity.opportunity_id}`} className="hover:text-cyan-300">Oportunidad: {opportunityTitle}</Link>
                      ) : activity.opportunity_id ? (
                        <span>Oportunidad asociada no disponible</span>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-700 p-8 text-center">
              <p className="font-medium text-slate-300">No hay actividades para estos filtros.</p>
              <p className="mt-2 text-sm text-slate-500">Prueba con otro periodo o selecciona todos los tipos.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
