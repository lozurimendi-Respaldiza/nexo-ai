"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canManageWorkspace, getWorkspaceContext } from "@/lib/workspace-context";

const CONTACT_STATUSES = ["new", "contacted", "qualified", "inactive"] as const;
const ACTIVITY_TYPES = ["call", "email", "meeting", "note", "other"] as const;

function readText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function readContactFields(formData: FormData) {
  const first_name = readText(formData, "first_name");
  const last_name = readText(formData, "last_name") || null;
  const email = readText(formData, "email").toLowerCase() || null;
  const phone = readText(formData, "phone") || null;
  const company = readText(formData, "company") || null;
  const source = readText(formData, "source") || null;
  const status = readText(formData, "status") || "new";
  const notes = readText(formData, "notes") || null;

  if (!first_name || first_name.length > 100) return { error: "first_name" as const };
  if (last_name && last_name.length > 100) return { error: "fields" as const };
  if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    return { error: "email" as const };
  }
  if (!CONTACT_STATUSES.includes(status as (typeof CONTACT_STATUSES)[number])) {
    return { error: "status" as const };
  }

  return {
    values: { first_name, last_name, email, phone, company, source, status, notes },
  };
}

export async function createContactAction(formData: FormData) {
  const parsed = readContactFields(formData);
  if ("error" in parsed) redirect(`/contacts/new?error=${parsed.error}`);

  const { supabase, user, workspaceId } = await getWorkspaceContext();
  const { error } = await supabase.from("contacts").insert({
    ...parsed.values,
    workspace_id: workspaceId,
    created_by: user.id,
  });

  if (error) redirect("/contacts/new?error=save");

  revalidatePath("/contacts");
  revalidatePath("/dashboard");
  redirect("/contacts?created=1");
}

export async function updateContactAction(contactId: string, formData: FormData) {
  const parsed = readContactFields(formData);
  if ("error" in parsed) redirect(`/contacts/${contactId}/edit?error=${parsed.error}`);

  const { supabase, workspaceId } = await getWorkspaceContext();
  const { data, error } = await supabase
    .from("contacts")
    .update(parsed.values)
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .select("id")
    .maybeSingle();

  if (error || !data) redirect(`/contacts/${contactId}/edit?error=save`);

  revalidatePath("/contacts");
  revalidatePath(`/contacts/${contactId}`);
  redirect(`/contacts/${contactId}?updated=1`);
}

export async function deleteContactAction(contactId: string) {
  const { supabase, workspaceId, role } = await getWorkspaceContext();
  if (!canManageWorkspace(role)) redirect(`/contacts/${contactId}?error=forbidden`);

  // La función SQL realiza la comprobación y el borrado en una única transacción.
  // Conserva oportunidades, actividades y tareas históricas desvinculándolas.
  const { data: result, error } = await supabase.rpc(
    "delete_contact_preserving_history",
    {
      p_workspace_id: workspaceId,
      p_contact_id: contactId,
    }
  );

  if (error) redirect(`/contacts/${contactId}?error=delete`);
  if (result === "forbidden") redirect(`/contacts/${contactId}?error=forbidden`);
  if (result === "not_found") redirect("/contacts?error=notfound");
  if (result === "pending_opportunities") {
    redirect(`/contacts/${contactId}?error=pending`);
  }
  if (result !== "deleted") redirect(`/contacts/${contactId}?error=delete`);

  revalidatePath("/contacts");
  revalidatePath("/opportunities");
  revalidatePath("/dashboard");
  redirect("/contacts?deleted=1");
}

export async function createContactActivityAction(contactId: string, formData: FormData) {
  const type = readText(formData, "type") || "note";
  const subject = readText(formData, "subject");
  const body = readText(formData, "body") || null;

  if (!ACTIVITY_TYPES.includes(type as (typeof ACTIVITY_TYPES)[number]) || !subject || subject.length > 160) {
    redirect(`/contacts/${contactId}?activityError=validation`);
  }

  const { supabase, user, workspaceId } = await getWorkspaceContext();

  const { data: contact } = await supabase
    .from("contacts")
    .select("id")
    .eq("id", contactId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!contact) redirect("/contacts?error=notfound");

  const { error } = await supabase.from("activities").insert({
    workspace_id: workspaceId,
    contact_id: contactId,
    created_by: user.id,
    type,
    subject,
    body,
  });

  if (error) redirect(`/contacts/${contactId}?activityError=save`);

  revalidatePath(`/contacts/${contactId}`);
  redirect(`/contacts/${contactId}?activityCreated=1`);
}
