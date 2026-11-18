"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";

export async function resetWorkspaceAction(formData: FormData) {
  const confirmation = String(formData.get("confirmation") ?? "");
  const acknowledged = String(formData.get("acknowledged") ?? "");

  if (confirmation !== "RESTABLECER" || acknowledged !== "yes") {
    redirect("/settings/reset?error=confirmation");
  }

  const { supabase, workspaceId, role } = await getWorkspaceContext();

  if (role !== "owner") {
    redirect("/dashboard?error=forbidden");
  }

  const { error } = await supabase.rpc("reset_workspace_data", {
    p_workspace_id: workspaceId,
  });

  if (error) {
    console.error("Error al restablecer el espacio de trabajo:", error.message);
    redirect("/settings/reset?error=operation");
  }

  revalidatePath("/dashboard");
  revalidatePath("/contacts");
  revalidatePath("/opportunities");
  revalidatePath("/activity");
  revalidatePath("/next-best-action");
  revalidatePath("/nba-analytics");
  revalidatePath("/settings/members");

  redirect("/settings/reset?success=1");
}
