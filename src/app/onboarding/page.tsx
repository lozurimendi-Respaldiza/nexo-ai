import { redirect } from "next/navigation";
import { getUserWorkspaceMembership } from "@/lib/workspace-context";
import { createWorkspaceAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const { membership } = await getUserWorkspaceMembership();

  if (membership?.workspace_id) redirect("/dashboard");

  const params = await searchParams;
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-8">
        <p className="text-xs font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</p>
        <h1 className="mt-5 text-2xl font-semibold">Configura tu espacio de trabajo</h1>
        <p className="mt-2 text-sm text-slate-400">Define el nombre de la empresa o cartera que vas a gestionar.</p>
        {params.error && <p role="alert" className="mt-4 text-sm text-red-300">{params.error}</p>}
        <form action={createWorkspaceAction} className="mt-6 space-y-4">
          <input name="workspace_name" required minLength={2} maxLength={120} placeholder="Nombre del espacio"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-3 text-sm outline-none focus:border-cyan-500" />
          <button className="w-full rounded-lg bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950">Continuar</button>
        </form>
      </section>
    </main>
  );
}
