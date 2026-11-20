import { AppNavigation } from "@/components/app-navigation";
import { LocalDate, LocalDateTime } from "@/components/local-date-time";
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { CopyMessageButton } from "./copy-message-button";
import { registerRecommendationAction, executeRecommendationAction, dismissRecommendationAction } from "./actions";

export const dynamic = "force-dynamic";

type Recommendation = {
  id: string;
  kind: "task" | "opportunity";
  /** Etapa comercial que identifica el ciclo actual de recomendación. */
  stage?: string;
  title: string;
  score: number;
  reason: string;
  action: string;
  message: string;
  href: string;
  contactName?: string;
  value?: number;
  currency?: string;
  dueAt?: string | null;
  label: string;
  scoreFactors: { label: string; points: number }[];
};

const terminalStages = new Set(["won", "lost"]);
const completedTaskStatuses = new Set(["done", "completed", "cancelled", "canceled", "closed"]);

function daysBetween(earlier: string, later: Date) {
  return Math.floor((later.getTime() - new Date(earlier).getTime()) / 86_400_000);
}

function money(value: number, currency = "EUR") {
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value || 0);
  } catch {
    return `${Number(value || 0).toFixed(2)} ${currency}`;
  }
}

export default async function NextBestActionPage() {
  const { supabase, workspaceId, role } = await getWorkspaceContext();
  const now = new Date();
  const [
    { data: opportunities, error: opportunitiesError },
    { data: tasks, error: tasksError },
    { data: activities, error: activitiesError },
    { data: contacts, error: contactsError },
  ] = await Promise.all([
    supabase.from("opportunities")
      .select("id,title,value,currency,stage,probability,next_action_at,updated_at,contact_id")
      .eq("workspace_id", workspaceId)
      .order("updated_at", { ascending: false })
      .limit(250),
    supabase.from("tasks")
      .select("id,title,description,status,priority,due_at,contact_id,opportunity_id")
      .eq("workspace_id", workspaceId)
      .order("due_at", { ascending: true })
      .limit(250),
    supabase.from("activities")
      .select("id,subject,occurred_at,contact_id,opportunity_id")
      .eq("workspace_id", workspaceId)
      .order("occurred_at", { ascending: false })
      .limit(1000),
    supabase.from("contacts")
      .select("id,first_name,last_name,company")
      .eq("workspace_id", workspaceId)
      .limit(500),
  ]);

  const todayKey = now.toISOString().slice(0, 10);
  const { data: todaysEvents, error: eventsError } = await (supabase as any)
    .from("nba_recommendation_events")
    .select("id,recommendation_key,status")
    .eq("workspace_id", workspaceId)
    .eq("recommendation_date", todayKey);

  const hasError = opportunitiesError || tasksError || activitiesError || contactsError || eventsError;
  const eventByKey = new Map<string, { id: string; status: string }>(
    (todaysEvents ?? []).map((event: any): [string, { id: string; status: string }] => [
      event.recommendation_key,
      { id: event.id, status: event.status },
    ])
  );
  const contactMap = new Map<string, string>(
    (contacts ?? []).map((contact): [string, string] => [
      contact.id,
      [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company || "Contacto",
    ])
  );
  const latestByOpportunity = new Map<string, string>();
  const latestByContact = new Map<string, string>();
  for (const activity of activities ?? []) {
    if (activity.opportunity_id && !latestByOpportunity.has(activity.opportunity_id)) {
      latestByOpportunity.set(activity.opportunity_id, activity.occurred_at);
    }
    if (activity.contact_id && !latestByContact.has(activity.contact_id)) {
      latestByContact.set(activity.contact_id, activity.occurred_at);
    }
  }

  const recommendations: Recommendation[] = [];
  const activeOpportunities = (opportunities ?? []).filter((item) => !terminalStages.has(item.stage));
  // Si se alcanza el límite de consulta, no podemos asegurar que el historial
  // de actividades esté completo para todas las oportunidades.
  const activityHistoryMayBeTruncated = (activities ?? []).length >= 1000;

  const expectedValues = activeOpportunities.flatMap((item) => {
    if (item.value == null || item.probability == null) return [];
    const value = Number(item.value);
    const probability = Number(item.probability);
    if (!Number.isFinite(value) || !Number.isFinite(probability)) return [];
    return [Math.max(0, value) * Math.min(100, Math.max(0, probability)) / 100];
  });
  const maxExpectedValue = Math.max(0, ...expectedValues);

  for (const task of tasks ?? []) {
    if (completedTaskStatuses.has((task.status || "").toLowerCase())) continue;
    const due = task.due_at ? new Date(task.due_at) : null;
    const overdue = !!due && due.getTime() < now.getTime();
    const dueSoon = !!due && !overdue && due.getTime() <= now.getTime() + 3 * 86_400_000;
    if (!overdue && !dueSoon) continue;

    const contactName = task.contact_id ? contactMap.get(task.contact_id) : undefined;
    const opportunity = task.opportunity_id ? (opportunities ?? []).find((item) => item.id === task.opportunity_id) : undefined;
    const overdueDays = overdue ? Math.max(1, daysBetween(task.due_at!, now)) : 0;
    const daysUntilDue = dueSoon && due ? Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86_400_000)) : 0;
    const urgencyPoints = overdue
      ? Math.min(85, 55 + overdueDays * 2)
      : Math.max(25, 45 - daysUntilDue * 7);
    const priorityPoints = ["urgent", "urgente"].includes((task.priority || "").toLowerCase())
      ? 15
      : ["high", "alta"].includes((task.priority || "").toLowerCase())
        ? 10
        : ["medium", "normal", "media"].includes((task.priority || "").toLowerCase()) ? 5 : 0;
    const scoreFactors = [
      { label: overdue ? `Retraso (${overdueDays} días)` : `Vence en ${daysUntilDue} días`, points: urgencyPoints },
      { label: `Prioridad ${task.priority || "no definida"}`, points: priorityPoints },
    ];
    const score = Math.min(100, Math.round(scoreFactors.reduce((total, factor) => total + factor.points, 0)));
    recommendations.push({
      id: `task-${task.id}`,
      kind: "task",
      title: task.title,
      score,
     reason: overdue
  ? "La tarea está vencida. Mantenerla pendiente puede retrasar el avance comercial."
  : "La tarea tiene un vencimiento próximo. Conviene reservar tiempo para completarla.",
      action: overdue ? "Resolver la tarea vencida y actualizar su estado." : "Completar o preparar esta tarea antes de su vencimiento.",
      message: task.description || `Seguimiento pendiente${contactName ? ` con ${contactName}` : ""}: ${task.title}.`,
      href: opportunity ? `/opportunities/${opportunity.id}` : task.contact_id ? `/contacts/${task.contact_id}` : "/dashboard",
      contactName,
      dueAt: task.due_at,
      label: overdue ? "Tarea vencida" : "Vence pronto",
      scoreFactors,
    });
  }

  for (const opportunity of activeOpportunities) {
    const contactName = opportunity.contact_id ? contactMap.get(opportunity.contact_id) : undefined;
    const lastActivity = latestByOpportunity.get(opportunity.id)
      ?? (opportunity.contact_id ? latestByContact.get(opportunity.contact_id) : undefined);
    const lastTouchDays = lastActivity ? Math.max(0, daysBetween(lastActivity, now)) : null;
    const nextAt = opportunity.next_action_at ? new Date(opportunity.next_action_at) : null;
    const nextOverdue = !!nextAt && nextAt.getTime() < now.getTime();
    const daysUntilNext = nextAt && !nextOverdue
      ? Math.max(0, Math.ceil((nextAt.getTime() - now.getTime()) / 86_400_000))
      : null;
    const nextSoon = daysUntilNext !== null && daysUntilNext <= 3;

    // Índice explicable: urgencia (máx. 40), inactividad (máx. 25),
    // etapa (máx. 15) y valor esperado relativo (máx. 20).
    // La ausencia de datos no se convierte en puntos positivos.
    let urgencyPoints = 0;
    let urgencyLabel = "Próxima acción programada a más de 3 días";
    if (nextOverdue) {
      const lateDays = Math.max(1, daysBetween(opportunity.next_action_at!, now));
      urgencyPoints = Math.min(40, 30 + lateDays * 2);
      urgencyLabel = `Acción vencida (${lateDays} días)`;
    } else if (nextSoon) {
      const days = daysUntilNext ?? 0;
      urgencyPoints = Math.max(15, 30 - days * 5);
      urgencyLabel = days === 0 ? "Acción prevista hoy" : `Acción prevista en ${days} días`;
    } else if (!opportunity.next_action_at) {
      urgencyPoints = 18;
      urgencyLabel = "Sin próxima acción programada";
    }

    // Si no hay actividad vinculada, no inferimos antigüedad.
    // Si la consulta alcanzó su límite, la ausencia también puede deberse a truncamiento.
    const activityUnknown = lastTouchDays === null && activityHistoryMayBeTruncated;
    const inactivityPoints = lastTouchDays === null
      ? 0
      : Math.min(25, Math.round(lastTouchDays / 42 * 25));
    const inactivityLabel = lastTouchDays !== null
      ? `Última actividad hace ${lastTouchDays} días`
      : activityUnknown
        ? "Historial incompleto (sin puntuación)"
        : "Sin actividad registrada (sin puntuación)";

    const stagePoints: Record<string, number> = {
      new: 5, contacted: 8, qualified: 11, proposal: 13, negotiation: 15,
    };
    const stageValue = stagePoints[opportunity.stage] ?? 5;

    const hasExpectedValueData = opportunity.value != null && opportunity.probability != null
      && Number.isFinite(Number(opportunity.value))
      && Number.isFinite(Number(opportunity.probability));
    const expectedValue = hasExpectedValueData
      ? Math.max(0, Number(opportunity.value))
        * Math.min(100, Math.max(0, Number(opportunity.probability))) / 100
      : null;
    const valuePoints = expectedValue !== null && maxExpectedValue > 0
      ? Math.round(20 * Math.sqrt(expectedValue / maxExpectedValue))
      : 0;
    const valueLabel = hasExpectedValueData
      ? "Valor esperado relativo"
      : "Valor esperado sin datos completos (0 puntos)";

    const scoreFactors = [
      { label: urgencyLabel, points: urgencyPoints },
      { label: inactivityLabel, points: inactivityPoints },
      { label: `Etapa: ${opportunity.stage}`, points: stageValue },
      { label: valueLabel, points: valuePoints },
    ];
    const score = Math.min(100, scoreFactors.reduce((total, factor) => total + factor.points, 0));

    // Solo se muestran oportunidades que necesitan atención: vencimiento próximo/vencido,
    // ausencia de seguimiento o inactividad relevante.
    const needsAttention = nextOverdue || nextSoon || !opportunity.next_action_at
      || lastTouchDays === null || lastTouchDays >= 14;
    if (!needsAttention) continue;

    let label = "Seguimiento recomendado";
    let reason = "La oportunidad requiere una revisión de seguimiento.";
    let action = "Revisar el estado comercial y registrar el siguiente paso.";
    if (nextOverdue) {
      label = "Acción vencida";
      reason = "La próxima acción estaba prevista y sigue pendiente.";
      action = "Contactar al responsable o al cliente y actualizar la próxima acción.";
    } else if (nextSoon) {
      label = "Acción próxima";
      reason = "La próxima acción está prevista y requiere preparación.";
      action = "Preparar el contacto y ejecutar el siguiente paso en la fecha prevista.";
    } else if (lastTouchDays === null) {
      label = "Sin actividad registrada";
      reason = "No hay interacciones registradas para esta oportunidad ni para el contacto asociado.";
      action = "Realizar el primer seguimiento y registrar el resultado en el historial.";
    } else if (!opportunity.next_action_at && lastTouchDays >= 14) {
      label = "Sin próximo paso";
      reason = `La última interacción fue hace ${lastTouchDays} días y no hay una próxima acción programada.`;
      action = "Definir una acción concreta y fijar una fecha de seguimiento.";
    } else if (lastTouchDays >= 14) {
      label = "Seguimiento atrasado";
      reason = `Han pasado ${lastTouchDays} días desde la última interacción registrada.`;
      action = "Reactivar la conversación y confirmar si la oportunidad sigue vigente.";
    }

    const stageLabel: Record<string, string> = {
      new: "nuevo contacto", contacted: "contactado", qualified: "cualificado",
      proposal: "propuesta enviada", negotiation: "en negociación",
    };
    const greeting = contactName ? `Hola ${contactName.split(" ")[0]},` : "Hola,";
    const message = opportunity.stage === "proposal"
      ? `${greeting} quería confirmar si has podido revisar la propuesta de ${opportunity.title}. ¿Te parece que concretemos los siguientes pasos?`
      : opportunity.stage === "negotiation"
        ? `${greeting} quería retomar nuestra conversación sobre ${opportunity.title} y revisar qué puntos quedan pendientes para avanzar. ¿Cuándo te viene bien hablar?`
        : `${greeting} quería hacer seguimiento de ${opportunity.title}, que tenemos en fase de ${stageLabel[opportunity.stage] || opportunity.stage}. ¿Sigue siendo una prioridad para vosotros?`;
    recommendations.push({
      id: `opportunity-${opportunity.id}`,
      kind: "opportunity",
      stage: opportunity.stage,
      title: opportunity.title,
      score,
      reason,
      action,
      message,
      href: `/opportunities/${opportunity.id}`,
      contactName,
      value: Number(opportunity.value || 0),
      currency: opportunity.currency || "EUR",
      dueAt: opportunity.next_action_at,
      label,
      scoreFactors,
    });
  }

  recommendations.sort((a, b) => b.score - a.score || (b.value ?? 0) - (a.value ?? 0));
  const visible = recommendations.slice(0, 15);
  const taskCount = visible.filter((item) => item.kind === "task").length;
  const opportunityCount = visible.length - taskCount;


  return (
    <main
      className="nexo-page px-5 py-8 sm:px-8"
      style={{ backgroundColor: "var(--canvas)", color: "var(--ink)" }}
    >
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
              INTELIGENCIA COMERCIAL
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">
              Next Best Action
            </h1>
            <p className="nexo-muted mt-2 max-w-2xl text-sm">
              Prioriza el siguiente movimiento comercial según vencimientos,
              actividad e información del pipeline.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/opportunities"
              className="nexo-field rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Pipeline
            </Link>
            <Link
              href="/nba-analytics"
              className="rounded-lg border px-4 py-2.5 text-sm transition-colors"
              style={{
                borderColor: "var(--accent)",
                color: "var(--accent)",
                backgroundColor: "var(--accent-soft)",
              }}
            >
              Resultados NBA
            </Link>
            <Link
              href="/dashboard"
              className="nexo-field rounded-lg px-4 py-2.5 text-sm transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <div className="mt-6">
          <AppNavigation role={role} />
        </div>

        {hasError ? (
          <div
            className="mt-7 rounded-xl border p-5 text-sm"
            style={{
              borderColor: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            No se han podido consultar todos los datos necesarios. Revisa las
            políticas RLS de las tablas comerciales.
          </div>
        ) : (
          <>
            <section className="mt-7 grid gap-4 sm:grid-cols-3">
              <Metric label="Acciones prioritarias" value={String(visible.length)} />
              <Metric label="Tareas" value={String(taskCount)} />
              <Metric label="Oportunidades" value={String(opportunityCount)} />
            </section>

            <div className="mt-8 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">
                  Prioridad de actuación
                </h2>
                <p className="nexo-muted mt-1 text-sm">
                  Índice calculado con urgencia, inactividad, etapa y valor
                  esperado. Los factores aparecen desglosados en cada
                  recomendación.
                </p>
              </div>
              <p className="nexo-muted text-xs">
                Actualizado al consultar esta página
              </p>
            </div>

            {visible.length ? (
              <section className="mt-4 space-y-4">
                {visible.map((item, index) => (
                  <article
                    key={item.id}
                    className="nexo-card rounded-xl p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded-full border px-2.5 py-1 text-xs font-medium"
                            style={{
                              borderColor: "var(--accent)",
                              backgroundColor: "var(--accent-soft)",
                              color: "var(--accent)",
                            }}
                          >
                            {item.label}
                          </span>
                          <span className="nexo-muted text-xs">
                            #{index + 1} ·{" "}
                            {item.kind === "task" ? "Tarea" : "Oportunidad"}
                          </span>
                        </div>

                        <h3 className="mt-3 text-lg font-semibold">
                          {item.title}
                        </h3>

                        {item.contactName && (
                          <p className="nexo-muted mt-1 text-sm">
                            Contacto: {item.contactName}
                          </p>
                        )}

                        {item.kind === "opportunity" && (
                          <p className="nexo-muted mt-1 text-sm">
                            Valor: {money(item.value ?? 0, item.currency)}
                          </p>
                        )}
                      </div>

                      <div className="min-w-20 text-right">
                        <p
                          className="text-3xl font-semibold tabular-nums"
                          style={{ color: "var(--accent)" }}
                        >
                          {item.score}
                        </p>
                        <p className="nexo-muted text-xs">prioridad / 100</p>
                        <div className="mt-2 space-y-1 text-left">
                          {item.scoreFactors.map((factor) => (
                            <p
                              key={factor.label}
                              className="nexo-muted whitespace-nowrap text-[10px]"
                            >
                              {factor.label}: +{factor.points}
                            </p>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div
                      className="mt-4 grid gap-4 border-t pt-4 md:grid-cols-2"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <div>
                        <p className="nexo-muted text-xs font-semibold uppercase tracking-wide">
                          Por qué aparece
                        </p>
                        <p className="mt-2 text-sm leading-6">
                          {item.reason}
                        </p>

                        {item.dueAt && (
                          <p
                            className="mt-2 text-xs"
                            style={{ color: "var(--accent)" }}
                          >
                            Fecha prevista:{" "}
                            {/^\d{4}-\d{2}-\d{2}$/.test(item.dueAt) ? (
                              <LocalDate value={item.dueAt} />
                            ) : (
                              <LocalDateTime value={item.dueAt} />
                            )}
                          </p>
                        )}

                        <p className="nexo-muted mt-3 text-xs font-semibold uppercase tracking-wide">
                          Siguiente acción
                        </p>
                        <p className="mt-2 text-sm leading-6">{item.action}</p>
                      </div>

                      <div>
                        <p className="nexo-muted text-xs font-semibold uppercase tracking-wide">
                          Mensaje sugerido · revisar antes de enviar
                        </p>
                        <p
                          className="nexo-field mt-2 rounded-lg p-3 text-sm leading-6"
                        >
                          {item.message}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3">
                          <CopyMessageButton message={item.message} />
                          <Link
                            href={item.href}
                            className="nexo-field rounded-lg px-3 py-2 text-sm transition-colors"
                          >
                            Abrir ficha →
                          </Link>
                        </div>

                        <div
                          className="mt-3 rounded-lg border p-3"
                          style={{
                            borderColor: "var(--line)",
                            backgroundColor: "var(--surface-secondary)",
                          }}
                        >
                          {(() => {
                            const targetId = item.id.replace(
                              /^(opportunity|task)-/,
                              ""
                            );
                            // Cada cambio de etapa abre un nuevo ciclo NBA para la oportunidad.
                            // Las tareas mantienen una única recomendación diaria por tarea.
                            const key =
                              item.kind === "opportunity"
                                ? `opportunity:${targetId}:${item.stage || "new"}`
                                : `task:${targetId}`;
                            const tracked = eventByKey.get(key);

                            if (tracked?.status === "recommended") {
                              return (
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className="mr-auto text-xs"
                                    style={{ color: "var(--warning)" }}
                                  >
                                    Recomendación registrada · pendiente
                                  </span>
                                  <form action={executeRecommendationAction}>
                                    <input
                                      type="hidden"
                                      name="event_id"
                                      value={tracked.id}
                                    />
                                    <button
                                      className="rounded-lg border px-3 py-2 text-xs font-semibold"
                                      style={{
                                        borderColor: "var(--success)",
                                        backgroundColor: "var(--success-soft)",
                                        color: "var(--success)",
                                      }}
                                    >
                                      Marcar ejecutada
                                    </button>
                                  </form>
                                  <form action={dismissRecommendationAction}>
                                    <input
                                      type="hidden"
                                      name="event_id"
                                      value={tracked.id}
                                    />
                                    <button
                                      className="nexo-field rounded-lg px-3 py-2 text-xs"
                                    >
                                      Descartar
                                    </button>
                                  </form>
                                </div>
                              );
                            }

                            if (tracked?.status === "executed") {
                              return (
                                <p
                                  className="text-xs"
                                  style={{ color: "var(--success)" }}
                                >
                                  Acción ejecutada y registrada hoy.
                                </p>
                              );
                            }

                            if (tracked?.status === "dismissed") {
                              return (
                                <p className="nexo-muted text-xs">
                                  Recomendación descartada hoy.
                                </p>
                              );
                            }

                            return (
                              <form
                                action={registerRecommendationAction}
                                className="flex flex-wrap items-center justify-between gap-3"
                              >
                                <span className="nexo-muted text-xs">
                                  Registra esta recomendación para medir su
                                  resultado.
                                </span>
                                <input
                                  type="hidden"
                                  name="kind"
                                  value={item.kind}
                                />
                                <input
                                  type="hidden"
                                  name="target_id"
                                  value={targetId}
                                />
                                <button
                                  className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
                                  style={{
                                    borderColor: "var(--accent)",
                                    backgroundColor: "var(--accent-soft)",
                                    color: "var(--accent)",
                                  }}
                                >
                                  Registrar recomendación
                                </button>
                              </form>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </section>
            ) : (
              <div
                className="mt-4 rounded-xl border border-dashed p-10 text-center"
                style={{ borderColor: "var(--line)" }}
              >
                <h3 className="font-semibold">
                  No hay acciones prioritarias detectadas
                </h3>
                <p className="nexo-muted mt-2 text-sm">
                  Registra tareas, próximas acciones o interacciones para que
                  NEXO AI pueda ordenar el seguimiento.
                </p>
                <Link
                  href="/opportunities"
                  className="mt-5 inline-flex rounded-lg border px-4 py-2.5 text-sm font-semibold"
                  style={{
                    borderColor: "var(--accent)",
                    backgroundColor: "var(--accent-soft)",
                    color: "var(--accent)",
                  }}
                >
                  Revisar pipeline
                </Link>
              </div>
            )}

            <p className="nexo-muted mt-6 text-xs leading-5">
              Registrar una recomendación crea una referencia diaria. Al
              marcarla ejecutada, NEXO AI registra una actividad vinculada a la
              oportunidad o completa la tarea asociada. Las recomendaciones se
              calculan bajo demanda con reglas transparentes. Los datos
              ausentes no reciben puntos por inactividad ni por valor esperado.
              No se envían mensajes ni se modifican registros automáticamente.
              El índice es una regla operativa explicable, no una predicción
              estadística de cierre. El valor esperado usa el importe y la
              probabilidad registrados; la comparación económica es relativa a
              las oportunidades activas de este espacio.
            </p>
          </>
        )}
      </div>
    </main>
  );
}


function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="nexo-card rounded-xl p-5">
      <p className="nexo-muted text-sm">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
    </article>
  );
}
