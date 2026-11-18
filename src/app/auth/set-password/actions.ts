"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function setInitialPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmation = String(formData.get("password_confirmation") ?? "");

  if (password.length < 8) {
    redirect("/auth/set-password?error=La%20contrase%C3%B1a%20debe%20tener%20al%20menos%208%20caracteres");
  }
  if (password !== confirmation) {
    redirect("/auth/set-password?error=Las%20contrase%C3%B1as%20no%20coinciden");
  }

  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) redirect("/login?error=Inicia%20sesión%20para%20configurar%20tu%20contraseña");

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/auth/set-password?error=${encodeURIComponent("No se pudo guardar la contraseña. Inténtalo de nuevo.")}`);
  }

  redirect("/dashboard");
}
