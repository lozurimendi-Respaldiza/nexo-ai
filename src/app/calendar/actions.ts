
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";

async function getContext() {
  const context = await getWorkspaceContext();

  return {
    db: context.supabase as any,
    user: context.user,
    workspaceId: context.workspaceId,
  };
}

function readText(formData: FormData, key: string, max = 500) {
  return String(formData.get(key) ?? "").trim().slice(0, max);
}

function parseDate(value: string): string | null {
  if (!value || value.length > 40) return null;

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return null;

  return date.toISOString();
}

function validRange(start: string | null, end: string | null) {
  if (!start || !end) return false;

  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();

  return (
    Number.isFinite(startTime) &&
    Number.isFinite(endTime) &&
    endTime > startTime &&
    endTime - startTime <= 24 * 60 * 60 * 1000
  );
}

async function validateLinks(
  db: any,
  workspaceId: string,
  contactId: string | null,
  opportunityId: string | null
) {
  if (contactId) {
    const { data, error } = await db
      .from("contacts")
      .select("id")
      .eq("id", contactId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !data) return false;
  }

  if (opportunityId) {
    const { data, error } = await db
      .from("opportunities")
      .select("id")
      .eq("id", opportunityId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();

    if (error || !data) return false;
  }

  return true;
}

export async function createCalendarEventAction(formData: FormData) {
  const { db, user, workspaceId } = await getContext();

  const title = readText(formData, "title", 160);
  const description = readText(formData, "description", 2000) || null;
  const startsAt = parseDate(readText(formData, "starts_at", 40));
  const endsAt = parseDate(readText(formData, "ends_at", 40));
  const contactId = readText(formData, "contact_id", 64) || null;
  const opportunityId = readText(formData, "opportunity_id", 64) || null;

  if (
    title.length < 2 ||
    !validRange(startsAt, endsAt) ||
    !(await validateLinks(db, workspaceId, contactId, opportunityId))
  ) {
    redirect("/calendar?error=invalid");
  }

  const { data, error } = await db
    .from("calendar_events")
    .insert({
      workspace_id: workspaceId,
      created_by: user.id,
      title,
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      contact_id: contactId,
      opportunity_id: opportunityId,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirect("/calendar?error=save");
  }

  revalidatePath("/calendar");
  redirect("/calendar?saved=1");
}

export async function updateCalendarEventAction(formData: FormData) {
  const { db, user, workspaceId } = await getContext();

  const id = readText(formData, "id", 64);
  const title = readText(formData, "title", 160);
  const description = readText(formData, "description", 2000) || null;
  const startsAt = parseDate(readText(formData, "starts_at", 40));
  const endsAt = parseDate(readText(formData, "ends_at", 40));
  const contactId = readText(formData, "contact_id", 64) || null;
  const opportunityId = readText(formData, "opportunity_id", 64) || null;

  if (
    !id ||
    title.length < 2 ||
    !validRange(startsAt, endsAt) ||
    !(await validateLinks(db, workspaceId, contactId, opportunityId))
  ) {
    redirect("/calendar?error=invalid");
  }

  const { data, error } = await db
    .from("calendar_events")
    .update({
      title,
      description,
      starts_at: startsAt,
      ends_at: endsAt,
      contact_id: contactId,
      opportunity_id: opportunityId,
    })
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/calendar?error=forbidden");
  }

  revalidatePath("/calendar");
  redirect("/calendar?saved=1");
}

export async function deleteCalendarEventAction(formData: FormData) {
  const { db, user, workspaceId } = await getContext();

  const id = readText(formData, "id", 64);

  if (!id) redirect("/calendar?error=invalid");

  const { data, error } = await db
    .from("calendar_events")
    .delete()
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .eq("created_by", user.id)
    .select("id")
    .maybeSingle();

  if (error || !data) {
    redirect("/calendar?error=forbidden");
  }

  revalidatePath("/calendar");
  redirect("/calendar?deleted=1");
}
