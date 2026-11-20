
import Link from "next/link";
import { signInAction, signUpAction } from "./actions";
import { ThemeSelector } from "@/components/theme-selector";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main
      className="min-h-screen px-5 py-12"
      style={{ backgroundColor: "var(--canvas)", color: "var(--ink)" }}
    >
      <div className="mx-auto flex w-full max-w-5xl justify-end">
        <ThemeSelector />
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-10 pt-8 md:grid-cols-2">
        <section className="flex flex-col justify-center">
          <Link
            href="/"
            className="text-sm font-semibold tracking-[0.25em]"
            style={{ color: "var(--accent)" }}
          >
            NEXO AI
          </Link>

          <h1 className="mt-8 text-4xl font-semibold tracking-tight">
            Gestiona oportunidades con criterio.
          </h1>

          <p className="mt-4 max-w-md" style={{ color: "var(--muted)" }}>
            Accede a tu espacio de trabajo y organiza contactos,
            oportunidades y próximas acciones.
          </p>
        </section>

        <section
          className="rounded-2xl border p-6 shadow-xl sm:p-8"
          style={{
            backgroundColor: "var(--surface)",
            borderColor: "var(--line)",
          }}
        >
          <h2 className="text-xl font-semibold">Acceso a NEXO AI</h2>

          {params.error && (
            <p
              role="alert"
              className="mt-4 rounded-lg border p-3 text-sm"
              style={{
                color: "var(--danger)",
                backgroundColor: "var(--danger-soft)",
                borderColor: "var(--danger)",
              }}
            >
              {params.error}
            </p>
          )}

          {params.message && (
            <p
              role="status"
              className="mt-4 rounded-lg border p-3 text-sm"
              style={{
                color: "var(--success)",
                backgroundColor: "var(--success-soft)",
                borderColor: "var(--success)",
              }}
            >
              {params.message}
            </p>
          )}

          <form action={signInAction} className="mt-6 space-y-3">
            <h3 className="text-sm font-medium">Iniciar sesión</h3>

            <label className="block text-sm" htmlFor="login-email" style={{ color: "var(--muted)" }}>
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />

            <label className="block text-sm" htmlFor="login-password" style={{ color: "var(--muted)" }}>
              Contraseña
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />

            <button
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold"
              style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
            >
              Entrar
            </button>
          </form>

          <div className="my-7 border-t" style={{ borderColor: "var(--line)" }} />

          <form action={signUpAction} className="space-y-3">
            <h3 className="text-sm font-medium">Crear cuenta</h3>

            <label className="block text-sm" htmlFor="workspace-name" style={{ color: "var(--muted)" }}>
              Nombre de empresa o espacio
            </label>
            <input
              id="workspace-name"
              name="workspace_name"
              type="text"
              minLength={2}
              maxLength={120}
              required
              placeholder="Mi empresa"
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />

            <label className="block text-sm" htmlFor="signup-email" style={{ color: "var(--muted)" }}>
              Email
            </label>
            <input
              id="signup-email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />

            <label className="block text-sm" htmlFor="signup-password" style={{ color: "var(--muted)" }}>
              Contraseña (mínimo 8 caracteres)
            </label>
            <input
              id="signup-password"
              name="password"
              type="password"
              minLength={8}
              required
              autoComplete="new-password"
              className="w-full rounded-lg border px-3 py-2.5 text-sm"
            />

            <button
              className="w-full rounded-lg border px-4 py-2.5 text-sm font-semibold"
              style={{ borderColor: "var(--line)", color: "var(--ink)" }}
            >
              Crear cuenta
            </button>
          </form>

          <p className="mt-6 text-xs leading-5" style={{ color: "var(--muted)" }}>
            Al registrarte, Supabase puede solicitar confirmación por correo
            según la configuración de Auth del proyecto.
          </p>
        </section>
      </div>
    </main>
  );
}
