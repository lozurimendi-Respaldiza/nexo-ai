"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";

function read(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function daysBetween(earlier: string, later: Date) {
  return Math.floor((later.getTime() - new Date(earlier).getTime()) / 86_400_000);
}

const terminalStages = new Set(["won", "lost"]);
const completedTaskStatuses = new Set(["done", "completed", "cancelled", "canceled", "closed"]);

async function buildTrustedRecommendation(
  supabase: any,
  workspaceId: string,
  kind: "task" | "opportunity",
  targetId: string,
) {
  const now = new Date();

  if (kind === "task") {
    const { data: task, error } = await supabase
      .from("tasks")
      .select("id,title,description,status,priority,due_at,contact_id,opportunity_id")
      .eq("id", targetId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !task || completedTaskStatuses.has(String(task.status || "").toLowerCase()) || !task.due_at) {
      return null;
    }

    const due = new Date(task.due_at);
    if (Number.isNaN(due.getTime())) return null;
    const overdue = due.getTime() < now.getTime();
    const dueSoon = !overdue && due.getTime() <= now.getTime() + 3 * 86_400_000;
    if (!overdue && !dueSoon) return null;

    const overdueDays = overdue ? Math.max(1, daysBetween(task.due_at, now)) : 0;
    const daysUntilDue = dueSoon ? Math.max(0, Math.ceil((due.getTime() - now.getTime()) / 86_400_000)) : 0;
    const urgencyPoints = overdue
      ? Math.min(85, 55 + overdueDays * 2)
      : Math.max(25, 45 - daysUntilDue * 7);
    const priority = String(task.priority || "").toLowerCase();
    const priorityPoints = ["urgent", "urgente"].includes(priority)
      ? 15
      : ["high", "alta"].includes(priority)
        ? 10
        : ["medium", "normal", "media"].includes(priority) ? 5 : 0;

    const factors = [
      { label: overdue ? `Retraso (${overdueDays} días)` : `Vence en ${daysUntilDue} días`, points: urgencyPoints },
      { label: `Prioridad ${task.priority || "no definida"}`, points: priorityPoints },
    ];
    const score = Math.min(100, Math.round(factors.reduce((sum: number, factor: { points: number }) => sum + factor.points, 0)));

    let contactName: string | undefined;
    if (task.contact_id) {
      const { data: contact } = await supabase.from("contacts")
        .select("first_name,last_name,company")
        .eq("id", task.contact_id).eq("workspace_id", workspaceId).maybeSingle();
      if (contact) {
        contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company || "Contacto";
      }
    }

    let opportunityId: string | null = null;
    if (task.opportunity_id) {
      const { data: opportunity } = await supabase.from("opportunities")
        .select("id").eq("id", task.opportunity_id).eq("workspace_id", workspaceId).maybeSingle();
      opportunityId = opportunity?.id ?? null;
    }

    return {
      recommendation_key: `task:${task.id}`,
      opportunity_id: null,
      task_id: task.id,
      kind: "task",
      title_snapshot: String(task.title).slice(0, 180),
      score,
      factors,
      action_snapshot: overdue
        ? "Resolver la tarea vencida y actualizar su estado."
        : "Completar o preparar esta tarea antes de su vencimiento.",
      message_snapshot: task.description || `Seguimiento pendiente${contactName ? ` con ${contactName}` : ""}: ${task.title}.`,
    };
  }

  const { data: opportunity, error: opportunityError } = await supabase
    .from("opportunities")
    .select("id,title,value,currency,stage,probability,next_action_at,updated_at,contact_id")
    .eq("id", targetId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (opportunityError || !opportunity || terminalStages.has(opportunity.stage)) return null;

  // Match the visible NBA calculation: expected value is relative to active
  // opportunities in this workspace, not to values supplied by the browser.
  const { data: activeOpportunities, error: activeError } = await supabase
    .from("opportunities")
    .select("id,value,probability,stage")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(250);
  if (activeError) return null;

  const active = (activeOpportunities ?? []).filter((item: any) => !terminalStages.has(item.stage));
  const expectedValues = active.flatMap((item: any) => {
    if (item.value == null || item.probability == null) return [];
    const value = Number(item.value);
    const probability = Number(item.probability);
    if (!Number.isFinite(value) || !Number.isFinite(probability)) return [];
    return [Math.max(0, value) * Math.min(100, Math.max(0, probability)) / 100];
  });
  const maxExpectedValue = Math.max(0, ...expectedValues);

  const { data: activities, error: activityError } = await supabase
    .from("activities")
    .select("id,occurred_at,contact_id,opportunity_id")
    .eq("workspace_id", workspaceId)
    .order("occurred_at", { ascending: false })
    .limit(1000);
  if (activityError) return null;

  let lastActivity: string | undefined;
  for (const activity of activities ?? []) {
    if (activity.opportunity_id === opportunity.id) {
      lastActivity = activity.occurred_at;
      break;
    }
  }
  if (!lastActivity && opportunity.contact_id) {
    lastActivity = (activities ?? []).find((item: any) => item.contact_id === opportunity.contact_id)?.occurred_at;
  }

  let contactName: string | undefined;
  if (opportunity.contact_id) {
    const { data: contact } = await supabase.from("contacts")
      .select("first_name,last_name,company")
      .eq("id", opportunity.contact_id).eq("workspace_id", workspaceId).maybeSingle();
    if (contact) {
      contactName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || contact.company || "Contacto";
    }
  }

  const lastTouchDays = lastActivity ? Math.max(0, daysBetween(lastActivity, now)) : null;
  const nextAt = opportunity.next_action_at ? new Date(opportunity.next_action_at) : null;
  const nextOverdue = !!nextAt && nextAt.getTime() < now.getTime();
  const daysUntilNext = nextAt && !nextOverdue
    ? Math.max(0, Math.ceil((nextAt.getTime() - now.getTime()) / 86_400_000))
    : null;
  const nextSoon = daysUntilNext !== null && daysUntilNext <= 3;

  let urgencyPoints = 0;
  let urgencyLabel = "Próxima acción programada a más de 3 días";
  if (nextOverdue) {
    const lateDays = Math.max(1, daysBetween(opportunity.next_action_at, now));
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

  const activityUnknown = lastTouchDays === null && (activities ?? []).length >= 1000;
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

  const factors = [
    { label: urgencyLabel, points: urgencyPoints },
    { label: inactivityLabel, points: inactivityPoints },
    { label: `Etapa: ${opportunity.stage}`, points: stageValue },
    { label: valueLabel, points: valuePoints },
  ];
  const score = Math.min(100, factors.reduce((sum, factor) => sum + factor.points, 0));

  const needsAttention = nextOverdue || nextSoon || !opportunity.next_action_at
    || lastTouchDays === null || lastTouchDays >= 14;
  if (!needsAttention) return null;

  let action = "Revisar el estado comercial y registrar el siguiente paso.";
  if (nextOverdue) {
    action = "Contactar al responsable o al cliente y actualizar la próxima acción.";
  } else if (nextSoon) {
    action = "Preparar el contacto y ejecutar el siguiente paso en la fecha prevista.";
  } else if (lastTouchDays === null) {
    action = "Realizar el primer seguimiento y registrar el resultado en el historial.";
  } else if (!opportunity.next_action_at && lastTouchDays >= 14) {
    action = "Definir una acción concreta y fijar una fecha de seguimiento.";
  } else if (lastTouchDays >= 14) {
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

  return {
    recommendation_key: `opportunity:${opportunity.id}:${opportunity.stage || "new"}`,
    opportunity_id: opportunity.id,
    task_id: null,
    kind: "opportunity",
    title_snapshot: String(opportunity.title).slice(0, 180),
    score,
    factors,
    action_snapshot: action,
    message_snapshot: message,
  };
}

export async function registerRecommendationAction(formData: FormData) {
  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const kind = read(formData, "kind", 20);
  const targetId = read(formData, "target_id", 64);

  if (!["opportunity", "task"].includes(kind) || !isUuid(targetId)) {
    redirect("/next-best-action?trackingError=validation");
  }

  const trusted = await buildTrustedRecommendation(
    supabase as any,
    workspaceId,
    kind as "task" | "opportunity",
    targetId,
  );
  if (!trusted) redirect("/next-best-action?trackingError=noteligible");

  const { error } = await (supabase as any).from("nba_recommendation_events")
    .upsert({
      workspace_id: workspaceId,
      ...trusted,
      recommended_by: user.id,
    }, {
      onConflict: "workspace_id,recommendation_key,recommendation_date",
      ignoreDuplicates: true,
    });

  if (error) redirect("/next-best-action?trackingError=save");
  revalidatePath("/next-best-action");
  revalidatePath("/nba-analytics");
}

export async function executeRecommendationAction(formData: FormData) {
  const { supabase } = await getWorkspaceContext();
  const eventId = read(formData, "event_id", 64);
  if (!isUuid(eventId)) redirect("/next-best-action?trackingError=validation");

  const { error } = await (supabase as any).rpc("transition_nba_recommendation_event", {
    p_event_id: eventId,
    p_new_status: "executed",
  });

  if (error) redirect("/next-best-action?trackingError=transition");
  revalidatePath("/next-best-action");
  revalidatePath("/nba-analytics");
  revalidatePath("/activity");
  revalidatePath("/tasks");
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
}

export async function dismissRecommendationAction(formData: FormData) {
  const { supabase } = await getWorkspaceContext();
  const eventId = read(formData, "event_id", 64);
  if (!isUuid(eventId)) redirect("/next-best-action?trackingError=validation");

  const { error } = await (supabase as any).rpc("transition_nba_recommendation_event", {
    p_event_id: eventId,
    p_new_status: "dismissed",
  });

  if (error) redirect("/next-best-action?trackingError=transition");
  revalidatePath("/next-best-action");
  revalidatePath("/nba-analytics");
}
