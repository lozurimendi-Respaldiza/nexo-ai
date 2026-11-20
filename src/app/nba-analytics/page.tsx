import { AppNavigation } from "@/components/app-navigation";
import { LocalDateTime } from "@/components/local-date-time";
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ days?: string }>;
type EventRow = {
  id: string;
  kind: "opportunity" | "task";
  title_snapshot: string;
  score: number;
  status: "recommended" | "executed" | "dismissed";
  recommended_at: string;
  acted_at: string | null;
  opportunity_id: string | null;
  task_id: string | null;
};

function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function bucketStart(value: string, days: number) {
  const date = new Date(value);
  date.setUTCHours(0, 0, 0, 0);
  if (days === 7) return utcDateKey(date);
  const day = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - day);
  return utcDateKey(date);
}

function bucketLabel(key: string, days: number) {
  const date = new Date(`${key}T12:00:00.000Z`);
  return new Intl.DateTimeFormat("es-ES", {
    ...(days === 7 ? { weekday: "short" as const } : {}),
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(date);
}

function createTrendBuckets(days: number, now = new Date()) {
  const current = new Date(now);
  current.setUTCHours(0, 0, 0, 0);
  const start = new Date(current);

  if (days === 7) {
    start.setUTCDate(start.getUTCDate() - 6);
  } else {
    start.setUTCDate(start.getUTCDate() - (days - 1));
    const weekday = (start.getUTCDay() + 6) % 7;
    start.setUTCDate(start.getUTCDate() - weekday);
  }

  const buckets = new Map<string, { total: number; executed: number }>();
  const cursor = new Date(start);
  while (cursor <= current) {
    buckets.set(utcDateKey(cursor), { total: 0, executed: 0 });
    cursor.setUTCDate(cursor.getUTCDate() + (days === 7 ? 1 : 7));
  }
  return buckets;
}

export default async function NbaAnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requestedDays = Number(params.days);
  const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 90;
  const { supabase, workspaceId, role } = await getWorkspaceContext();
  const db = supabase as any;
  const sinceDate = new Date(Date.now() - days * 86_400_000);
  const since = sinceDate.toISOString();

  const { data: rawEvents, error } = await db.from("nba_recommendation_events")
    .select("id,kind,title_snapshot,score,status,recommended_at:created_at,acted_at,opportunity_id,task_id")
    .eq("workspace_id", workspaceId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = (rawEvents ?? []) as EventRow[];
  const total = rows.length;
  const executed = rows.filter((event) => event.status === "executed").length;
  const dismissed = rows.filter((event) => event.status === "dismissed").length;
  const pending = rows.filter((event) => event.status === "recommended").length;
  const executionRate = total ? Math.round((executed / total) * 100) : null;

  const opportunityEvents = rows.filter((event) => event.kind === "opportunity" && event.opportunity_id);
  const trackedOpportunityIds = [...new Set(opportunityEvents.map((event) => event.opportunity_id as string))];

  let activities: Array<{ opportunity_id: string | null; occurred_at: string; type: string; subject: string }> = [];
  let activityError: string | null = null;
  if (trackedOpportunityIds.length) {
    const result = await db.from("activities")
      .select("opportunity_id,occurred_at,type,subject")
      .eq("workspace_id", workspaceId)
      .in("opportunity_id", trackedOpportunityIds)
      .gte("occurred_at", since)
      .order("occurred_at", { ascending: true })
      .limit(5000);
    activities = result.data ?? [];
    activityError = result.error?.message ?? null;
  }

  const stageChangeActivities = activities.filter((activity) =>
    activity.type === "status_change" || activity.subject?.startsWith("Etapa comercial:")
  );

  // La ejecución se mide por evento; el avance comercial, por oportunidad única.
  const executedEvents = rows.filter((event) => event.status === "executed" && event.acted_at);
  const executionDurationsMs = executedEvents
    .map((event) => new Date(event.acted_at!).getTime() - new Date(event.recommended_at).getTime())
    .filter((duration) => Number.isFinite(duration) && duration >= 0);
  const averageExecutionMs = executionDurationsMs.length
    ? executionDurationsMs.reduce((sum, duration) => sum + duration, 0) / executionDurationsMs.length
    : null;

  const executedOpportunityEvents = executedEvents.filter(
    (event) => event.kind === "opportunity" && event.opportunity_id
  );
  const executedOpportunityIds = [...new Set(
    executedOpportunityEvents.map((event) => event.opportunity_id as string)
  )];

  const advancedAfterExecutionIds = new Set<string>();
  for (const event of executedOpportunityEvents) {
    const advancedAfterExecution = stageChangeActivities.some((activity) =>
      activity.opportunity_id === event.opportunity_id &&
      new Date(activity.occurred_at).getTime() > new Date(event.acted_at!).getTime()
    );
    if (advancedAfterExecution && event.opportunity_id) {
      advancedAfterExecutionIds.add(event.opportunity_id);
    }
  }

  let wonAfterExecutionTracked = 0;
  let wonQueryError = false;
  if (executedOpportunityIds.length) {
    const { data: wonRows, error: wonError } = await db.from("opportunities")
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("stage", "won")
      .in("id", executedOpportunityIds);
    wonQueryError = !!wonError;
    if (!wonError) wonAfterExecutionTracked = wonRows?.length ?? 0;
  }

  const formatDuration = (milliseconds: number | null) => {
    if (milliseconds === null) return "Sin datos";
    const minutes = Math.round(milliseconds / 60_000);
    if (minutes < 60) return `${minutes} min`;
    const hours = minutes / 60;
    if (hours < 48) return `${Math.round(hours * 10) / 10} h`;
    return `${Math.round(hours / 24 * 10) / 10} días`;
  };

  // Precrear todos los intervalos evita ocultar semanas/días sin actividad.
  // Las claves y el formateo usan UTC para no desplazar fechas por la zona horaria del servidor.
  const buckets = createTrendBuckets(days);
  for (const event of rows) {
    const key = bucketStart(event.recommended_at, days);
    const current = buckets.get(key);
    if (!current) continue;
    current.total += 1;
    if (event.status === "executed") current.executed += 1;
  }
  const trend = [...buckets.entries()];
  const maxBucket = Math.max(1, ...trend.map(([, value]) => value.total));

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</Link>
            <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-cyan-300">MEDICIÓN COMERCIAL</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Resultados NBA</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">Actividad y evolución de las recomendaciones registradas durante el periodo seleccionado.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/next-best-action" className="rounded-lg border border-cyan-800 px-4 py-2.5 text-sm text-cyan-300 hover:border-cyan-500">Volver a NBA</Link>
            <Link href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm hover:border-slate-500">Dashboard</Link>
          </div>
        </header>
<AppNavigation role={role} />
        <nav aria-label="Periodo de analítica" className="mt-6 flex flex-wrap items-center gap-2">
          <span className="mr-2 text-sm text-slate-400">Periodo:</span>
          {[7, 30, 90].map((period) => (
            <Link key={period} href={`/nba-analytics?days=${period}`}
              aria-current={days === period ? "page" : undefined}
              className={`rounded-lg border px-4 py-2 text-sm ${days === period ? "border-cyan-700 bg-cyan-950/50 text-cyan-200" : "border-slate-700 text-slate-300 hover:border-slate-500"}`}>
              {period} días
            </Link>
          ))}
        </nav>

        {error ? (
          <p className="mt-7 rounded-xl border border-rose-900 bg-rose-950/30 p-5 text-sm text-rose-300">No se pudieron consultar los eventos NBA. Comprueba la conexión y las políticas RLS.</p>
        ) : (
          <>
            <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Recomendaciones registradas" value={String(total)} />
              <Metric label="Ejecutadas" value={String(executed)} />
              <Metric label="Pendientes" value={String(pending)} />
              <Metric label="Descartadas" value={String(dismissed)} />
            </section>
            <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Tasa de ejecución" value={executionRate === null ? "Sin datos" : `${executionRate}%`} detail={`${executed} ejecutadas / ${total} registradas`} />
              <Metric label="Tiempo medio hasta ejecución" value={formatDuration(averageExecutionMs)} detail={`${executionDurationsMs.length} recomendaciones ejecutadas con tiempo válido`} />
              <Metric label="Oportunidades que avanzaron tras ejecución" value={String(advancedAfterExecutionIds.size)} detail={`${advancedAfterExecutionIds.size} oportunidades únicas con cambio de etapa posterior a la ejecución`} />
              <Metric label="Oportunidades ejecutadas actualmente ganadas" value={wonQueryError ? "No disponible" : String(wonAfterExecutionTracked)} detail={`${executedOpportunityIds.length} oportunidades únicas vinculadas a recomendaciones ejecutadas`} />
            </section>

            <section className="mt-7 rounded-xl border border-slate-800 bg-slate-900/60 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="font-semibold">Evolución de recomendaciones</h2>
                  <p className="mt-1 text-sm text-slate-400">{days === 7 ? "Actividad diaria" : "Actividad semanal"} · número de recomendaciones registradas y ejecutadas</p>
                </div>
                <div className="flex gap-4 text-xs text-slate-400">
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-cyan-400" />Registradas</span>
                  <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-400" />Ejecutadas</span>
                </div>
              </div>
              {trend.length ? (
                <div className="mt-6 flex h-48 items-end gap-2 border-b border-slate-700 pb-2">
                  {trend.map(([key, value]) => (
                    <div key={key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2">
                      <div className="flex h-full w-full items-end justify-center gap-1">
                        <div title={`${value.total} registradas`} className="w-1/3 max-w-8 rounded-t bg-cyan-400/80" style={{ height: `${Math.max(4, value.total / maxBucket * 100)}%` }} />
                        <div title={`${value.executed} ejecutadas`} className="w-1/3 max-w-8 rounded-t bg-emerald-400/90" style={{ height: `${value.executed ? Math.max(4, value.executed / maxBucket * 100) : 0}%` }} />
                      </div>
                      <span className="whitespace-nowrap text-[10px] text-slate-500">{bucketLabel(key, days)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-5 rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-500">Todavía no hay recomendaciones en este periodo.</p>
              )}
            </section>

            <section className="mt-7 grid gap-4 lg:grid-cols-2">
              <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="font-semibold">Embudo de recomendaciones</h2>
                <p className="mt-1 text-xs text-slate-500">Cada registro cuenta una vez y conserva su estado actual.</p>
                <FunnelRow label="Registradas" value={total} total={total} color="bg-cyan-400" />
                <FunnelRow label="Ejecutadas" value={executed} total={total} color="bg-emerald-400" />
                <FunnelRow label="Pendientes" value={pending} total={total} color="bg-amber-400" />
                <FunnelRow label="Descartadas" value={dismissed} total={total} color="bg-slate-500" />
              </article>
              <article className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
                <h2 className="font-semibold">Lectura comercial</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {activityError
                    ? "No se pudo consultar el historial de cambios de etapa. El indicador de avance posterior a la ejecución puede estar incompleto."
                    : "El avance cuenta oportunidades únicas con un cambio de etapa registrado después de ejecutar una recomendación. Es una asociación temporal, no una prueba de causalidad."}
                </p>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  El tiempo medio se calcula desde el registro hasta la ejecución y excluye duraciones inválidas. Las oportunidades ganadas reflejan su estado actual y están vinculadas a recomendaciones ejecutadas; no demuestran que NBA haya causado el cierre.
                </p>
                {executedEvents.length > 0 && executionDurationsMs.length < executedEvents.length && <p className="mt-3 text-xs text-amber-300">Hay ejecuciones sin una marca temporal válida; no se incluyen en el tiempo medio.</p>}
                {wonQueryError && <p className="mt-3 text-xs text-amber-300">No se pudo consultar el estado actual de las oportunidades ganadas.</p>}
                {total > 0 && total < 30 && <p className="mt-3 text-sm text-amber-300">Muestra todavía pequeña ({total} recomendaciones). Interpreta los porcentajes como orientativos, no como rendimiento estable.</p>}
                {!total && <p className="mt-3 text-sm text-amber-300">Aún no hay recomendaciones registradas en este periodo.</p>}
              </article>
            </section>

            <section className="mt-8">
              <h2 className="text-xl font-semibold">Registro reciente</h2>
              {rows.length ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
                  <div className="divide-y divide-slate-800">
                    {rows.slice(0, 100).map((event) => (
                      <article key={event.id} className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/50 p-4">
                        <div>
                          <p className="font-medium">{event.title_snapshot}</p>
                          <p className="mt-1 text-xs text-slate-500">{event.kind === "opportunity" ? "Oportunidad" : "Tarea"} · Prioridad registrada {event.score}/100 · <LocalDateTime value={event.recommended_at} /></p>
                        </div>
                        <div className="text-right">
                          <p className={`text-sm font-medium ${event.status === "executed" ? "text-emerald-300" : event.status === "dismissed" ? "text-slate-400" : "text-amber-300"}`}>
                            {event.status === "executed" ? "Ejecutada" : event.status === "dismissed" ? "Descartada" : "Pendiente"}
                          </p>
                          {event.acted_at && <p className="mt-1 text-xs text-slate-500"><LocalDateTime value={event.acted_at} /></p>}
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-slate-700 p-8 text-center text-sm text-slate-500">Aún no hay eventos para mostrar.</div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <article className="rounded-xl border border-slate-800 bg-slate-900 p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-slate-500">{detail}</p>}
    </article>
  );
}

function FunnelRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const width = total ? Math.max(value > 0 ? 2 : 0, Math.round((value / total) * 100)) : 0;
  return (
    <div className="mt-5">
      <div className="mb-2 flex justify-between text-sm">
        <span className="text-slate-300">{label}</span>
        <span className="tabular-nums text-slate-400">{value}{total ? ` · ${Math.round(value / total * 100)}%` : ""}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
