import Link from "next/link";
import { signInAction, signUpAction } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; message?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-12 text-slate-100">
      <div className="mx-auto grid w-full max-w-5xl gap-10 md:grid-cols-2">
        <section className="flex flex-col justify-center">
          <Link href="/" className="text-sm font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</Link>
          <h1 className="mt-8 text-4xl font-semibold tracking-tight">Gestiona oportunidades con criterio.</h1>
          <p className="mt-4 max-w-md text-slate-400">
            Accede a tu espacio de trabajo y organiza contactos, oportunidades y próximas acciones.
          </p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
          <h2 className="text-xl font-semibold">Acceso a NEXO AI</h2>
          {params.error && <p role="alert" className="mt-4 rounded-lg border border-red-900 bg-red-950/50 p-3 text-sm text-red-200">{params.error}</p>}
          {params.message && <p role="status" className="mt-4 rounded-lg border border-emerald-900 bg-emerald-950/40 p-3 text-sm text-emerald-200">{params.message}</p>}

          <form action={signInAction} className="mt-6 space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Iniciar sesión</h3>
            <label className="block text-sm text-slate-400" htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" required autoComplete="email"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />
            <label className="block text-sm text-slate-400" htmlFor="login-password">Contraseña</label>
            <input id="login-password" name="password" type="password" required autoComplete="current-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />
            <button className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400">Entrar</button>
          </form>

          <div className="my-7 border-t border-slate-800" />

          <form action={signUpAction} className="space-y-3">
            <h3 className="text-sm font-medium text-slate-300">Crear cuenta</h3>
            <label className="block text-sm text-slate-400" htmlFor="workspace-name">Nombre de empresa o espacio</label>
            <input id="workspace-name" name="workspace_name" type="text" minLength={2} maxLength={120} required
              placeholder="Mi empresa"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />
            <label className="block text-sm text-slate-400" htmlFor="signup-email">Email</label>
            <input id="signup-email" name="email" type="email" required autoComplete="email"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />
            <label className="block text-sm text-slate-400" htmlFor="signup-password">Contraseña (mínimo 8 caracteres)</label>
            <input id="signup-password" name="password" type="password" minLength={8} required autoComplete="new-password"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm outline-none focus:border-cyan-500" />
            <button className="w-full rounded-lg border border-slate-600 px-4 py-2.5 text-sm font-semibold hover:border-cyan-400 hover:text-cyan-300">Crear cuenta</button>
          </form>
          <p className="mt-6 text-xs leading-5 text-slate-500">Al registrarte, Supabase puede solicitar confirmación por correo según la configuración de Auth del proyecto.</p>
        </section>
      </div>
    </main>
  );
}
