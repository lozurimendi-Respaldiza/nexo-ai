"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function go(params: { success?: string; error?: string }): never {
  const query = new URLSearchParams();
  if (params.success) query.set("success", params.success);
  if (params.error) query.set("error", params.error);
  redirect(`/settings/members?${query.toString()}`);
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}
function getConfiguredAppOrigin(): string | null {
  const configuredUrl = process.env.APP_URL?.trim();

  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    const isLocalhost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1";

    if (
      url.protocol !== "https:" &&
      !(url.protocol === "http:" && isLocalhost)
    ) {
      return null;
    }

    if (url.username || url.password) return null;

    return url.origin;
  } catch {
    return null;
  }
}

export type InviteActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  inviteUrl?: string;
};

export async function inviteMemberAction(
  _previousState: InviteActionState,
  formData: FormData
): Promise<InviteActionState> {
  const { supabase, user, workspaceId, role } = await getWorkspaceContext();
  if (role !== "owner" && role !== "admin") {
    return { status: "error", message: "No tienes permisos para gestionar miembros." };
  }

  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const requestedRole = String(formData.get("role") ?? "member");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "error", message: "Introduce una dirección de correo válida." };
  }
  if (requestedRole !== "member" && requestedRole !== "admin") {
    return { status: "error", message: "El rol seleccionado no es válido." };
  }
  if (role === "admin" && requestedRole !== "member") {
    return { status: "error", message: "Los administradores solo pueden incorporar miembros." };
  }

  let admin: ReturnType<typeof getSupabaseAdminClient>;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    return { status: "error", message: "Falta configurar SUPABASE_SECRET_KEY en el servidor. No la compartas por el chat." };
  }

  const { data: actorMembership, error: actorError } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (actorError || !actorMembership || (actorMembership.role !== "owner" && actorMembership.role !== "admin")) {
    return { status: "error", message: "Tu permiso de gestión ha cambiado. Actualiza la página e inténtalo de nuevo." };
  }
  if (actorMembership.role === "admin" && requestedRole !== "member") {
    return { status: "error", message: "Los administradores solo pueden incorporar miembros." };
  }

  const { data: pendingInvites, error: pendingInvitesError } = await admin
    .from("workspace_invitations")
    .select("id, expires_at")
    .eq("workspace_id", workspaceId)
    .eq("email", email)
    .eq("status", "pending");
  if (pendingInvitesError) {
    return { status: "error", message: "No se pudo comprobar si ya existe una invitación pendiente." };
  }

  const now = Date.now();
  for (const pendingInvite of pendingInvites ?? []) {
    if (new Date(pendingInvite.expires_at).getTime() > now) {
      return { status: "error", message: "Ya existe una invitación pendiente para este correo." };
    }
    const { error: expireError } = await admin
      .from("workspace_invitations")
      .update({ status: "expired" })
      .eq("id", pendingInvite.id);
    if (expireError) {
      return { status: "error", message: "No se pudo cerrar una invitación caducada. Inténtalo de nuevo." };
    }
  }

  const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) return { status: "error", message: `No se pudo comprobar la cuenta: ${usersError.message}` };
  const existingUser = usersData.users.find((item) => item.email?.toLowerCase() === email);

  if (existingUser) {
    const { data: memberships, error: membershipsError } = await admin
      .from("workspace_members")
      .select("workspace_id, role")
      .eq("user_id", existingUser.id);
    if (membershipsError) {
      return { status: "error", message: "No se pudo comprobar la pertenencia de esa cuenta a otros espacios." };
    }
    if (memberships?.some((item) => item.workspace_id === workspaceId)) {
      return { status: "error", message: "Esta cuenta ya pertenece a este espacio de trabajo." };
    }
    if (memberships && memberships.length > 0) {
      return { status: "error", message: "Esta cuenta ya pertenece a otro espacio. La selección entre varios espacios todavía no está disponible." };
    }


if (existingUser.email_confirmed_at) {
  const { data: result, error: rpcError } = await supabase.rpc(
    "add_workspace_member",
    {
      p_workspace_id: workspaceId,
      p_user_id: existingUser.id,
      p_role: requestedRole,
    }
  );

  if (rpcError) {
    return {
      status: "error",
      message: "No se pudo incorporar al usuario. Comprueba los permisos y la configuración de Supabase.",
    };
  }

  if (result !== "added") {
    const messages: Record<string, string> = {
      already_member: "Esta cuenta ya pertenece a este espacio de trabajo.",
      already_in_other_workspace: "Esta cuenta ya pertenece a otro espacio de trabajo.",
      actor_not_authorized: "Tu permiso de gestión ha cambiado. Actualiza la página.",
      admin_cannot_add_admin: "Los administradores solo pueden incorporar miembros.",
      target_not_found_or_unconfirmed: "La cuenta no existe o todavía no tiene el correo confirmado.",
      invalid_role: "El rol seleccionado no es válido.",
      cannot_add_self: "No puedes incorporarte a ti mismo.",
      invalid_parameters: "Los datos enviados no son válidos.",
      unauthenticated: "Tu sesión ha caducado. Inicia sesión de nuevo.",
    };

    return {
      status: "error",
      message: messages[result ?? ""] ?? "No se pudo incorporar al usuario.",
    };
  }

  revalidatePath("/settings/members");
  revalidatePath("/dashboard");

  return {
    status: "success",
    message: "La cuenta existente se ha incorporado al espacio. Ya puede iniciar sesión.",
  };
}

    // Una cuenta existente pero todavía no verificada se vuelve a invitar
    // mediante un nuevo token de Auth, asociado a esta invitación pendiente.
  }
  const appOrigin = getConfiguredAppOrigin();

  if (!appOrigin) {
    return {
      status: "error",
      message:
        "Falta configurar APP_URL con la URL pública de la aplicación en el servidor.",
    };
  }
  const { data: invitation, error: invitationError } = await admin
    .from("workspace_invitations")
    .insert({
      workspace_id: workspaceId,
      email,
      role: requestedRole,
      invited_by: user.id,
      expires_at: new Date(now + 60 * 60 * 1000).toISOString(),
      status: "pending",
    })
    .select("id")
    .single();
  if (invitationError || !invitation) {
    return { status: "error", message: "No se pudo preparar la invitación. Comprueba que has ejecutado el SQL de instalación." };
  }

  const redirectTo = `${appOrigin}/auth/confirm`;

  const { data: generatedLink, error: generateError } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      redirectTo,
    },
  });

  const tokenHash = generatedLink?.properties?.hashed_token;
  if (generateError || !tokenHash) {
    await admin.from("workspace_invitations").delete().eq("id", invitation.id);
    return { status: "error", message: `No se pudo generar el enlace: ${generateError?.message ?? "respuesta incompleta de Supabase"}` };
  }

  const inviteUrl = new URL("/auth/confirm", appOrigin);
  inviteUrl.searchParams.set("token_hash", tokenHash);
  inviteUrl.searchParams.set("type", "invite");
  inviteUrl.searchParams.set("invitation_id", invitation.id);

  revalidatePath("/settings/members");
  return {
    status: "success",
    message: "Enlace de invitación generado. Cópialo y envíaselo al destinatario; solo puede utilizarse una vez y caduca en una hora.",
    inviteUrl: inviteUrl.toString(),
  };
}

export async function changeMemberRoleAction(formData: FormData) {
  const { supabase, user, workspaceId, role } = await getWorkspaceContext();
  if (role !== "owner") go({ error: "Solo el propietario puede cambiar roles." });

  const targetUserId = String(formData.get("user_id") ?? "");
  const nextRole = String(formData.get("role") ?? "");
  if (!targetUserId || targetUserId === user.id) go({ error: "No puedes modificar tu propio rol." });
  if (nextRole !== "admin" && nextRole !== "member") go({ error: "El rol seleccionado no es válido." });

  const { data: target, error: targetError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (targetError || !target || target.role === "owner") go({ error: "No se ha encontrado un miembro modificable." });

  const { error } = await supabase
    .from("workspace_members")
    .update({ role: nextRole })
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId);
  if (error) go({ error: `No se pudo cambiar el rol: ${error.message}` });

  revalidatePath("/settings/members");
  go({ success: "Rol actualizado." });
}

export async function removeMemberAction(formData: FormData) {
  const { supabase, user, workspaceId, role } = await getWorkspaceContext();
  if (role !== "owner" && role !== "admin") go({ error: "No tienes permisos para retirar miembros." });

  const targetUserId = String(formData.get("user_id") ?? "");
  if (!targetUserId || targetUserId === user.id) go({ error: "No puedes retirarte a ti mismo desde esta pantalla." });

  const { data: target, error: targetError } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId)
    .maybeSingle();
  if (targetError || !target || target.role === "owner") go({ error: "No se ha encontrado un miembro que puedas retirar." });
  if (role === "admin" && target.role !== "member") go({ error: "Los administradores solo pueden retirar miembros." });

  const { data: deleted, error } = await supabase
    .from("workspace_members")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", targetUserId)
    .select("user_id");
  if (error || !deleted?.length) go({ error: "No se pudo retirar al miembro. Comprueba los permisos de Supabase." });

  revalidatePath("/settings/members");
  go({ success: "Miembro retirado del espacio de trabajo." });
}

export async function cancelInvitationAction(formData: FormData) {
  const { workspaceId, role, user } = await getWorkspaceContext();
  if (role !== "owner" && role !== "admin") go({ error: "No tienes permisos para cancelar invitaciones." });

  const invitationId = String(formData.get("invitation_id") ?? "");
  if (!invitationId) go({ error: "No se ha indicado la invitación." });

  let admin: ReturnType<typeof getSupabaseAdminClient>;
  try {
    admin = getSupabaseAdminClient();
  } catch {
    go({ error: "Falta configurar SUPABASE_SECRET_KEY en el servidor." });
  }

  const { data: actorMembership, error: actorError } = await admin
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (actorError || !actorMembership || (actorMembership.role !== "owner" && actorMembership.role !== "admin")) {
    go({ error: "Tu permiso de gestión ha cambiado. Actualiza la página e inténtalo de nuevo." });
  }

  const { data: invitation, error: readError } = await admin
    .from("workspace_invitations")
    .select("id, role")
    .eq("id", invitationId)
    .eq("workspace_id", workspaceId)
    .eq("status", "pending")
    .maybeSingle();
  if (readError || !invitation) go({ error: "La invitación ya no está pendiente o no existe." });
  if (actorMembership.role === "admin" && invitation.role !== "member") go({ error: "Los administradores solo pueden cancelar invitaciones de miembros." });

  const { error } = await admin
    .from("workspace_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("workspace_id", workspaceId);
  if (error) go({ error: "No se pudo cancelar la invitación." });

  revalidatePath("/settings/members");
  go({ success: "Invitación cancelada." });
}
