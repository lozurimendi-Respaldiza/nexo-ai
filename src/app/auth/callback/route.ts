import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Acepta únicamente destinos relativos que, al resolverlos, permanezcan
 * en el mismo origen de la aplicación. Evita redirecciones externas.
 */
function safeNextPath(value: string | null, origin: string) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /[\\u0000-\\u001F\\u007F]/.test(value)
  ) {
    return "/dashboard";
  }

  try {
    const target = new URL(value, origin);

    if (target.origin !== origin || target.pathname.startsWith("//")) {
      return "/dashboard";
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/dashboard";
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = safeNextPath(requestUrl.searchParams.get("next"), requestUrl.origin);

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=No%20se%20recibió%20el%20código%20de%20confirmación", requestUrl.origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(new URL("/login?error=No%20se%20pudo%20validar%20el%20enlace", requestUrl.origin));
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.redirect(new URL("/login?error=No%20se%20pudo%20verificar%20la%20cuenta", requestUrl.origin));
  }

  const metadataName = user.user_metadata?.workspace_name;
  const fallbackName = user.email?.split("@")[0] || "Mi espacio";
  const workspaceName = typeof metadataName === "string" ? metadataName : fallbackName;

  const { error: workspaceError } = await supabase.rpc(
    "create_workspace_for_current_user",
    { workspace_name: workspaceName }
  );

  if (workspaceError) {
    return NextResponse.redirect(new URL("/onboarding?error=No%20se%20pudo%20crear%20el%20espacio%20de%20trabajo", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(next, requestUrl.origin));
}
