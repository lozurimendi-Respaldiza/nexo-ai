import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type WorkspaceRole = "owner" | "admin" | "member";

export function canManageWorkspace(role: WorkspaceRole | string) {
  return role === "owner" || role === "admin";
}

/**
 * Obtiene el usuario autenticado y su espacio de trabajo principal.
 * La selección es determinista: se utiliza la primera membresía creada.
 * RLS sigue siendo la barrera de aislamiento entre espacios.
 */
export async function getUserWorkspaceMembership() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) redirect("/login");

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .order("workspace_id", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`No se pudo consultar el espacio de trabajo: ${membershipError.message}`);
  }

  return { supabase, user, membership };
}

/**
 * Contexto obligatorio para las áreas privadas.
 * Los roles desconocidos se degradan a member (denegación por defecto).
 */
export async function getWorkspaceContext() {
  const context = await getUserWorkspaceMembership();

  if (!context.membership?.workspace_id) redirect("/onboarding");

  const rawRole = context.membership.role;
  const role: WorkspaceRole =
    rawRole === "owner" || rawRole === "admin" ? rawRole : "member";

  return {
    supabase: context.supabase,
    user: context.user,
    workspaceId: context.membership.workspace_id,
    role,
    canManageWorkspace: canManageWorkspace(role),
  };
}
