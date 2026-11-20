import { AppNavigation } from "@/components/app-navigation";
import { LocalDateTime } from "@/components/local-date-time";
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";

export const dynamic = "force-dynamic";

const stages = [
  ["new", "Nuevo"], ["contacted", "Contactado"], ["qualified", "Cualificado"],
  ["proposal", "Propuesta"], ["negotiation", "Negociación"], ["won", "Ganado"], ["lost", "Perdido"],
] as const;

const money = (amount: number, currency = "EUR") =>
  new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount || 0);

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const params = await searchParams;
  const { supabase, workspaceId, role } = await getWorkspaceContext();
  const db = supabase as any;

  const { data: opportunities, error } = await db.from("opportunities")
    .select("id,title,value,currency,stage,probability,expected_close_date,next_action_at,created_at,contact_id")
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(200);

  const { data: contacts } = await db.from("contacts")
    .select("id,first_name,last_name,company")
    .eq("workspace_id", workspaceId);

  const contactMap = new Map<string, string>(
    (contacts ?? []).map((c: any): [string, string] => [
      String(c.id),
      [c.first_name, c.last_name].filter(Boolean).join(" ") || String(c.company || "Contacto"),
    ])
  );
  const rows = opportunities ?? [];
  const active = rows.filter((o: any) => !["won", "lost"].includes(o.stage));
  const total = active.reduce((sum: number, o: any) => sum + Number(o.value || 0), 0);
  const weighted = active.reduce((sum: number, o: any) => sum + Number(o.value || 0) * Number(o.probability || 0) / 100, 0);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <Link href="/dashboard" className="text-xs font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</Link>
          <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-cyan-300">GESTIÓN COMERCIAL</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Pipeline comercial</h1>
          <p className="mt-2 text-sm text-slate-400">Controla oportunidades, etapas y previsión de ingresos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link href="/next-best-action" className="rounded-lg border border-cyan-800 bg-cyan-950/40 px-4 py-2.5 text-sm font-medium text-cyan-300 transition hover:border-cyan-500 hover:bg-cyan-950/70">Next Best Action</Link>
          <Link href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:border-slate-500">Dashboard</Link>
          <Link href="/opportunities/new" className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">+ Nueva oportunidad</Link>
        </div>
      </header>
<AppNavigation role={role} />
      {params.saved && <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">Cambios guardados correctamente. La oportunidad ya está actualizada en el pipeline.</p>}

      <section className="mt-7 grid gap-4 sm:grid-cols-3">
        <Metric label="Oportunidades activas" value={String(active.length)} />
        <Metric label="Valor del pipeline" value={money(total)} />
        <Metric label="Previsión ponderada" value={money(weighted)} />
      </section>

      {error && <p className="mt-5 rounded-lg border border-rose-900 bg-rose-950/30 p-3 text-sm text-rose-300">No se pudieron cargar las oportunidades.</p>}

      <section className="mt-8 grid gap-4 xl:grid-cols-3">
        {stages.map(([stage, label]) => {
          const items = rows.filter((o: any) => o.stage === stage);
          const subtotal = items.reduce((sum: number, o: any) => sum + Number(o.value || 0), 0);
          return <div key={stage} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
            <div className="mb-4 flex items-center justify-between gap-2"><h2 className="font-semibold text-slate-100">{label}</h2><span className="rounded-full border border-slate-700 bg-slate-950 px-2.5 py-1 text-xs text-slate-300">{items.length}</span></div>
            <p className="mb-3 text-xs text-slate-400">{money(subtotal)}</p>
            <div className="space-y-3">
              {items.map((o: any) => <Link key={o.id} href={`/opportunities/${o.id}`} className="block rounded-lg border border-slate-800 bg-slate-950/80 p-3 transition hover:border-cyan-700 hover:bg-slate-950">
                <p className="font-medium text-slate-100">{o.title}</p>
                <p className="mt-1 text-xs text-slate-500">{contactMap.get(o.contact_id) ?? "Sin contacto vinculado"}</p>
                <div className="mt-3 flex items-center justify-between text-sm"><span className="font-semibold text-slate-200">{money(Number(o.value), o.currency || "EUR")}</span><span className="text-xs text-slate-400">{o.probability}%</span></div>
                {o.next_action_at && <p className="mt-2 text-xs text-slate-500">Próxima acción: {<LocalDateTime value={o.next_action_at} />}</p>}
              </Link>)}
              {items.length === 0 && <p className="rounded-lg border border-dashed border-slate-700 p-4 text-center text-xs text-slate-500">Sin oportunidades</p>}
            </div>
          </div>;
        })}
      </section>
      <p className="mt-6 text-xs text-slate-500">Se muestran hasta 200 oportunidades. Los datos se consultan desde el espacio de trabajo autenticado.</p>
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="rounded-xl border border-slate-800 bg-slate-900 p-5"><p className="text-sm text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold tabular-nums text-white">{value}</p></article>;
}
