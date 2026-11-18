import "server-only";

import { createClient } from "@/lib/supabase/server";

/**
 * Acepta una invitación mediante una única transacción PostgreSQL.
 * La identidad, el correo confirmado y los permisos se validan en la base de datos.
 */
export async function acceptWorkspaceInvitation(invitationId: string) {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(invitationId)) {
    throw new Error("El identificador de invitación no es válido.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("accept_workspace_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    throw new Error("No se pudo aceptar la invitación. Solicita una nueva o contacta con el propietario del espacio.");
  }

  switch (data) {
    case "accepted":
    case "already_accepted":
      return;
    case "unauthenticated":
      throw new Error("La sesión no es válida. Inicia sesión y vuelve a utilizar el enlace.");
    case "email_unconfirmed":
      throw new Error("Confirma el correo electrónico antes de aceptar la invitación.");
    case "not_found":
      throw new Error("La invitación no existe o no está disponible.");
    case "email_mismatch":
      throw new Error("El correo de la cuenta no coincide con el destinatario de la invitación.");
    case "expired":
      throw new Error("La invitación ha caducado. Solicita que te envíen otra.");
    case "not_pending":
      throw new Error("Esta invitación ya fue utilizada o cancelada.");
    case "inviter_unauthorized":
      throw new Error("La persona que envió esta invitación ya no tiene permisos para incorporar este rol.");
    case "already_in_other_workspace":
      throw new Error("Esta cuenta ya pertenece a otro espacio de trabajo y todavía no admite varios espacios.");
    default:
      throw new Error("No se pudo completar la aceptación de la invitación.");
  }
}
