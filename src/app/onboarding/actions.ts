"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createWorkspaceAction(formData: FormData) {
  const name = String(formData.get("workspace_name") ?? "").trim();
  if (name.length < 2 || name.length > 120) {
    redirect("/onboarding?error=El%20nombre%20debe%20tener%20entre%202%20y%20120%20caracteres");
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.rpc("create_workspace_for_current_user", { workspace_name: name });
  if (error) redirect(`/onboarding?error=${encodeURIComponent("No se pudo crear el espacio. Comprueba los datos e inténtalo de nuevo.")}`);

  redirect("/dashboard");
}
