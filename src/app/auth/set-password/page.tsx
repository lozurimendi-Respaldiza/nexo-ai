import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setInitialPasswordAction } from "@/app/auth/set-password/actions";

type SearchParams = Promise<{ error?: string }>;

export default async function SetInitialPasswordPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect("/login");

  const params = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-xl">
        <Link href="/" className="text-xs font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</Link>
        <h1 className="mt-4 text-2xl font-semibold">Configura tu contraseña</h1>
        <p className="mt-2 text-sm leading-6 text-slate-400">La invitación se ha validado. Crea una contraseña para poder iniciar sesión en futuras visitas.</p>
        {params.error && <p role="alert" className="mt-4 rounded-lg border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{params.error}</p>}
        <form action={setInitialPasswordAction} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Nueva contraseña</span>
            <input name="password" type="password" autoComplete="new-password" minLength={8} required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-cyan-500" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-slate-400">Repite la contraseña</span>
            <input name="password_confirmation" type="password" autoComplete="new-password" minLength={8} required className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-cyan-500" />
          </label>
          <button className="w-full rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Guardar contraseña y entrar</button>
        </form>
      </section>
    </main>
  );
}
