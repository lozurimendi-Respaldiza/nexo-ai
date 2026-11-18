"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function signInAction(formData: FormData) {
  const email = getText(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) redirect("/login?error=Completa%20todos%20los%20campos");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) redirect(`/login?error=${encodeURIComponent("No se pudo iniciar sesión. Comprueba tus credenciales.")}`);
  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const name = getText(formData, "workspace_name");
  const email = getText(formData, "email").toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (name.length < 2 || name.length > 120) {
    redirect(`/login?error=${encodeURIComponent("El nombre del espacio debe tener entre 2 y 120 caracteres")}`);
  }
  if (!email || password.length < 8) {
    redirect(`/login?error=${encodeURIComponent("Introduce un email válido y una contraseña de al menos 8 caracteres")}`);
  }

  const supabase = await createClient();
  const headerStore = await headers();
  const host = headerStore.get("x-forwarded-host") ?? headerStore.get("host");
  const protocol = headerStore.get("x-forwarded-proto") ?? "https";
  const origin = host ? `${protocol}://${host}` : "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      // Solo se usa como nombre inicial. Nunca para autorización ni roles.
      data: { workspace_name: name },
    },
  });

  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);

  if (data.session) {
    const { error: workspaceError } = await supabase.rpc(
      "create_workspace_for_current_user",
      { workspace_name: name }
    );
    if (workspaceError) {
      redirect(`/login?error=${encodeURIComponent("La cuenta se creó, pero no se pudo preparar el espacio de trabajo. Inicia sesión y vuelve a intentarlo.")}`);
    }
    redirect("/dashboard");
  }

  redirect("/login?message=Revisa%20tu%20correo%20para%20confirmar%20la%20cuenta");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
