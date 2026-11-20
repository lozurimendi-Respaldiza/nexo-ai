
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setInitialPasswordAction } from "@/app/auth/set-password/actions";

type SearchParams = Promise<{ error?: string }>;

export default async function SetInitialPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) redirect("/login");

  const params = await searchParams;

  return (
    <main className="nexo-page flex min-h-screen items-center justify-center px-5 py-10">
      <section className="nexo-card w-full max-w-md rounded-2xl p-7 shadow-xl">
        <Link
          href="/"
          className="text-xs font-semibold tracking-[0.25em]"
          style={{ color: "var(--accent)" }}
        >
          NEXO AI
        </Link>

        <h1
          className="mt-4 text-2xl font-semibold"
          style={{ color: "var(--ink)" }}
        >
          Configura tu contraseña
        </h1>

        <p className="nexo-muted mt-2 text-sm leading-6">
          La invitación se ha validado. Crea una contraseña para poder iniciar
          sesión en futuras visitas.
        </p>

        {params.error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border p-3 text-sm"
            style={{
              borderColor: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            {params.error}
          </p>
        )}

        <form action={setInitialPasswordAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="nexo-muted mb-1 block text-xs">
              Nueva contraseña
            </span>
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="nexo-field w-full rounded-lg px-3 py-3 text-sm outline-none"
            />
          </label>

          <label className="block">
            <span className="nexo-muted mb-1 block text-xs">
              Repite la contraseña
            </span>
            <input
              name="password_confirmation"
              type="password"
              autoComplete="new-password"
              minLength={8}
              required
              className="nexo-field w-full rounded-lg px-3 py-3 text-sm outline-none"
            />
          </label>

          <button
            className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground, var(--ink))",
            }}
          >
            Guardar contraseña y entrar
          </button>
        </form>
      </section>
    </main>
  );
}
