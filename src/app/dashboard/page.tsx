import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { signOutAction } from "@/app/login/actions";

export default async function DashboardPage() {
  const { supabase, user, workspaceId, role } = await getWorkspaceContext();
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();

  const [{ count: contactsCount }, { count: opportunitiesCount }, { count: tasksCount }] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("opportunities").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link href="/" className="text-xs font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</Link>
            <h1 className="mt-2 text-2xl font-semibold">{workspace?.name ?? "Mi espacio de trabajo"}</h1>
            <p className="mt-1 text-sm text-slate-400">{user.email}</p>
            <p className="mt-1 text-xs text-slate-500">Rol: {role === "owner" ? "Propietario" : role === "admin" ? "Administrador" : "Miembro"}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link href="/contacts" className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Gestionar contactos</Link>
            <form action={signOutAction}><button className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500">Cerrar sesión</button></form>
          </div>
        </header>
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <p className="mt-1 text-sm text-slate-400">Actividad de tu espacio de trabajo.</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Contactos", contactsCount ?? 0],
              ["Oportunidades", opportunitiesCount ?? 0],
              ["Tareas", tasksCount ?? 0],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-sm text-slate-400">{label}</p>
                <p className="mt-3 text-3xl font-semibold tabular-nums">{value}</p>
              </article>
            ))}
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link href="/contacts" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-700">
              <h3 className="font-semibold">Cartera de contactos</h3>
              <p className="mt-2 text-sm text-slate-400">Alta, búsqueda, seguimiento e historial comercial.</p>
              <p className="mt-4 text-sm font-medium text-cyan-300">Abrir contactos →</p>
            </Link>
            <Link href="/opportunities" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-700">
              <h3 className="font-semibold">Pipeline de oportunidades</h3>
              <p className="mt-2 text-sm text-slate-400">Consulta etapas, valor y previsión ponderada.</p>
              <p className="mt-4 text-sm font-medium text-cyan-300">Abrir pipeline →</p>
            </Link>
            <Link href="/next-best-action" className="rounded-xl border border-cyan-900/70 bg-cyan-950/20 p-5 transition hover:border-cyan-600">
              <h3 className="font-semibold">Next Best Action</h3>
              <p className="mt-2 text-sm text-slate-400">Descubre qué tarea o oportunidad conviene atender primero y por qué.</p>
              <p className="mt-4 text-sm font-medium text-cyan-300">Ver prioridades →</p>
            </Link>
            <Link href="/activity" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-700">
              <h3 className="font-semibold">Historial de actividad</h3>
              <p className="mt-2 text-sm text-slate-400">Consulta llamadas, emails, reuniones, notas y cambios de etapa, incluidos los registros históricos.</p>
              <p className="mt-4 text-sm font-medium text-cyan-300">Abrir historial →</p>
            </Link>
            {role !== "member" && <Link href="/settings/members" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-700">
              <h3 className="font-semibold">Gestión de equipo</h3>
              <p className="mt-2 text-sm text-slate-400">Invita usuarios, administra roles y controla el acceso al espacio de trabajo.</p>
              <p className="mt-4 text-sm font-medium text-cyan-300">Gestionar miembros →</p>
            </Link>}
            <Link href="/nba-analytics" className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 transition hover:border-cyan-700">
              <h3 className="font-semibold">Resultados NBA</h3>
              <p className="mt-2 text-sm text-slate-400">Mide recomendaciones registradas, ejecución y oportunidades vinculadas ganadas.</p>
              <p className="mt-4 text-sm font-medium text-cyan-300">Consultar resultados →</p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
