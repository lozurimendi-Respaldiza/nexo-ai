import { AppNavigation } from "@/components/app-navigation";
import { LocalDate } from "@/components/local-date-time";
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";

type ContactsPageProps = {
  searchParams: Promise<{ q?: string; created?: string; updated?: string; deleted?: string; error?: string }>;
};

const statusLabels: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Cualificado",
  inactive: "Inactivo",
};

export default async function ContactsPage({ searchParams }: ContactsPageProps) {
  const params = await searchParams;
  const search = (params.q ?? "").trim().slice(0, 100);
  const { supabase, workspaceId, role } = await getWorkspaceContext();

  let query = supabase
    .from("contacts")
    .select("id, first_name, last_name, email, phone, company, status, source, created_at", { count: "exact" })
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .range(0, 49);

  const safeSearch = search.replace(/[,%()]/g, " ").replace(/\s+/g, " ").trim();
  if (safeSearch) {
    const pattern = `%${safeSearch}%`;
    query = query.or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},email.ilike.${pattern},phone.ilike.${pattern},company.ilike.${pattern}`
    );
  }

  const { data: contacts, count, error } = await query;

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</Link>
            <h1 className="mt-3 text-2xl font-semibold">Contactos</h1>
            <p className="mt-1 text-sm text-slate-400">Gestiona tu cartera y el historial de relación comercial.</p>
          </div>
          <div className="flex gap-3">
            <Link href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-slate-500">Dashboard</Link>
            <Link href="/contacts/import" className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-300 hover:border-slate-500">Importar CSV</Link>
            <Link href="/contacts/new" className="rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Nuevo contacto</Link>
          </div>
        </header>
	<AppNavigation role={role} />
        {params.created && <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">Contacto creado correctamente.</p>}
        {params.deleted && <p className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">Contacto eliminado.</p>}
        {params.error && <p className="mt-5 rounded-lg border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">No se pudo completar la operación. Comprueba el contacto e inténtalo de nuevo.</p>}

        <form action="/contacts" method="get" className="mt-7 flex flex-col gap-3 sm:flex-row">
          <input
            aria-label="Buscar contactos"
            className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-cyan-400"
            name="q"
            placeholder="Buscar por nombre, empresa, email o teléfono..."
            defaultValue={search}
          />
          <button className="rounded-lg border border-slate-700 px-5 py-3 text-sm font-medium hover:border-slate-500" type="submit">Buscar</button>
          {search && <Link href="/contacts" className="rounded-lg px-3 py-3 text-center text-sm text-slate-400 hover:text-white">Limpiar</Link>}
        </form>

        <div className="mt-5 flex items-center justify-between text-sm text-slate-400">
          <span>{count ?? 0} contactos</span>
          <span>Mostrando hasta 50 resultados</span>
        </div>

        {error ? (
          <div className="mt-5 rounded-xl border border-rose-900 bg-rose-950/20 p-5 text-sm text-rose-300">
            No se pudo cargar la cartera. Revisa la conexión con Supabase y las políticas RLS.
          </div>
        ) : contacts?.length ? (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-800">
            <div className="hidden grid-cols-[1.5fr_1.2fr_1fr_0.8fr] gap-4 bg-slate-900 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-400 md:grid">
              <span>Contacto</span><span>Empresa / origen</span><span>Contacto directo</span><span>Estado</span>
            </div>
            <div className="divide-y divide-slate-800">
              {contacts.map((contact) => (
                <Link key={contact.id} href={`/contacts/${contact.id}`} className="grid gap-2 px-5 py-4 transition hover:bg-slate-900/70 md:grid-cols-[1.5fr_1.2fr_1fr_0.8fr] md:items-center md:gap-4">
                  <div>
                    <p className="font-medium">{contact.first_name} {contact.last_name ?? ""}</p>
                    <p className="mt-1 text-xs text-slate-500">{<LocalDate value={contact.created_at} />}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-300">{contact.company ?? "—"}</p>
                    <p className="mt-1 text-xs text-slate-500">{contact.source ?? "Origen no indicado"}</p>
                  </div>
                  <div className="text-sm text-slate-400">
                    <p>{contact.email ?? "Sin email"}</p>
                    <p className="mt-1">{contact.phone ?? "Sin teléfono"}</p>
                  </div>
                  <div><span className="inline-flex rounded-full border border-slate-700 px-2.5 py-1 text-xs text-slate-300">{statusLabels[contact.status] ?? contact.status}</span></div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-dashed border-slate-700 px-6 py-14 text-center">
            <h2 className="text-lg font-medium">Todavía no hay contactos</h2>
            <p className="mt-2 text-sm text-slate-400">{search ? "No hay resultados para esa búsqueda." : "Añade el primer contacto para empezar a construir tu cartera."}</p>
            {!search && <Link href="/contacts/new" className="mt-5 inline-flex rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300">Crear primer contacto</Link>}
          </div>
        )}
      </div>
    </main>
  );
}
