"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { canManageWorkspace, getWorkspaceContext } from "@/lib/workspace-context";

const STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] as const;

async function getContext() {
  const context = await getWorkspaceContext();
  return {
    db: context.supabase as any,
    user: context.user,
    workspaceId: context.workspaceId,
    role: context.role,
  };
}

function readText(formData: FormData, key: string, max = 180) {
  const value = String(formData.get(key) ?? "").trim();
  return value.slice(0, max);
}

export async function createOpportunityAction(formData: FormData) {
  const { db, user, workspaceId } = await getContext();
  const title = readText(formData, "title", 160);
  const contactId = readText(formData, "contact_id", 64) || null;
  const valueRaw = readText(formData, "value", 30);
  const probabilityRaw = readText(formData, "probability", 3);
  const stage = readText(formData, "stage", 20);
  const expectedClose = readText(formData, "expected_close_date", 10) || null;
  const nextAction = readText(formData, "next_action_at", 30) || null;
  const value = Number(valueRaw || 0);
  const probability = Number(probabilityRaw || 10);

  if (title.length < 2 || !Number.isFinite(value) || value < 0 ||
      !Number.isInteger(probability) || probability < 0 || probability > 100 ||
      !STAGES.includes(stage as (typeof STAGES)[number])) {
    redirect("/opportunities/new?error=invalid");
  }

  const { data, error } = await db.from("opportunities").insert({
    workspace_id: workspaceId,
    created_by: user.id,
    owner_id: user.id,
    contact_id: contactId,
    title,
    value,
    currency: "EUR",
    probability,
    stage,
    expected_close_date: expectedClose,
    next_action_at: nextAction,
  }).select("id").single();

  if (error || !data?.id) redirect("/opportunities/new?error=save");
  revalidatePath("/opportunities");
  redirect(`/opportunities/${data.id}`);
}

export async function updateOpportunityAction(formData: FormData) {
  const { db, user, workspaceId } = await getContext();
  const id = readText(formData, "id", 64);
  const title = readText(formData, "title", 160);
  const contactId = readText(formData, "contact_id", 64) || null;
  const value = Number(readText(formData, "value", 30));
  const probability = Number(readText(formData, "probability", 3));
  const stage = readText(formData, "stage", 20);
  const expectedClose = readText(formData, "expected_close_date", 10) || null;
  const nextAction = readText(formData, "next_action_at", 30) || null;

  if (!id || title.length < 2 || !Number.isFinite(value) || value < 0 ||
      !Number.isInteger(probability) || probability < 0 || probability > 100 ||
      !STAGES.includes(stage as (typeof STAGES)[number])) {
    redirect(`/opportunities/${id}?error=invalid`);
  }

  const { data: previous, error: previousError } = await db.from("opportunities")
    .select("stage,title,contact_id")
    .eq("id", id).eq("workspace_id", workspaceId).maybeSingle();

  if (previousError || !previous) redirect(`/opportunities/${id}?error=notfound`);

  const { error } = await db.from("opportunities").update({
    title, contact_id: contactId, value, probability, stage,
    expected_close_date: expectedClose, next_action_at: nextAction,
  }).eq("id", id).eq("workspace_id", workspaceId);

  if (error) redirect(`/opportunities/${id}?error=save`);

  if (previous.stage !== stage) {
    const { error: historyError } = await db.from("activities").insert({
      workspace_id: workspaceId,
      opportunity_id: id,
      contact_id: contactId,
      created_by: user.id,
      type: "status_change",
      subject: `Etapa comercial: ${previous.stage} → ${stage}`,
      body: `La oportunidad «${title}» cambió de etapa de ${previous.stage} a ${stage}.`,
    });
    if (historyError) redirect(`/opportunities/${id}?error=history`);
  }
  revalidatePath("/opportunities");
  revalidatePath(`/opportunities/${id}`);
  redirect("/opportunities?saved=1");
}

export async function deleteOpportunityAction(formData: FormData) {
  const { db, workspaceId, role } = await getContext();
  const id = readText(formData, "id", 64);
  if (!id) redirect("/opportunities");
  if (!canManageWorkspace(role)) redirect(`/opportunities/${id}?error=forbidden`);

  const { data, error } = await db.from("opportunities")
    .delete().eq("id", id).eq("workspace_id", workspaceId)
    .select("id").maybeSingle();

  if (error || !data) redirect(`/opportunities/${id}?error=delete`);
  revalidatePath("/opportunities");
  redirect("/opportunities");
}
