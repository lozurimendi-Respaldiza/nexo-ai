
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { acceptWorkspaceInvitation } from "@/lib/supabase/accept-workspace-invitation";

export async function confirmInvitationAction(formData: FormData) {
  const tokenHash = String(formData.get("token_hash") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const invitationId = String(formData.get("invitation_id") ?? "").trim();

  const validInvitationId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      invitationId
    );

  if (!tokenHash || type !== "invite" || !validInvitationId) {
    redirect(
      "/login?error=El%20enlace%20de%20invitaci%C3%B3n%20no%20es%20v%C3%A1lido"
    );
  }

  const supabase = await createClient();

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "invite",
  });

  if (verifyError) {
    redirect(
      `/login?error=${encodeURIComponent(
        "El enlace ha caducado o ya se ha utilizado. Solicita una nueva invitación."
      )}`
    );
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    await supabase.auth.signOut();
    redirect("/login?error=No%20se%20pudo%20verificar%20la%20cuenta");
  }

  try {
    await acceptWorkspaceInvitation(invitationId);
  } catch (error) {
    await supabase.auth.signOut();

    const message =
      error instanceof Error
        ? error.message
        : "No se pudo aceptar la invitación.";

    redirect(`/login?error=${encodeURIComponent(message)}`);
  }

  redirect("/auth/set-password");
}
