
import { AppNavigation } from "@/components/app-navigation";
import { LocalDate } from "@/components/local-date-time";
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";

type ContactsPageProps = {
  searchParams: Promise<{
    q?: string;
    created?: string;
    updated?: string;
    deleted?: string;
    error?: string;
  }>;
};

const statusLabels: Record<string, string> = {
  new: "Nuevo",
  contacted: "Contactado",
  qualified: "Cualificado",
  inactive: "Inactivo",
};

const surfaceStyle = {
  backgroundColor: "var(--surface)",
  borderColor: "var(--line)",
  color: "var(--ink)",
};

const mutedStyle = { color: "var(--muted)" };

export default async function ContactsPage({
  searchParams,
}: ContactsPageProps) {
  const params = await searchParams;
  const search = (params.q ?? "").trim().slice(0, 100);
  const { supabase, workspaceId, role } = await getWorkspaceContext();

  let query = supabase
    .from("contacts")
    .select(
      "id, first_name, last_name, email, phone, company, status, source, created_at",
      { count: "exact" }
    )
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
    <main className="nexo-page px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header
          className="flex flex-wrap items-start justify-between gap-4 border-b pb-6"
          style={{ borderColor: "var(--line)" }}
        >
          <div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold tracking-[0.25em]"
              style={{ color: "var(--accent)" }}
            >
              NEXO AI
            </Link>
            <h1 className="mt-3 text-2xl font-semibold">Contactos</h1>
            <p className="nexo-muted mt-1 text-sm">
              Gestiona tu cartera y el historial de relación comercial.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="rounded-lg border px-4 py-2.5 text-sm transition-colors"
              style={surfaceStyle}
            >
              Dashboard
            </Link>
            <Link
              href="/contacts/import"
              className="rounded-lg border px-4 py-2.5 text-sm transition-colors"
              style={surfaceStyle}
            >
              Importar CSV
            </Link>
            <Link
              href="/contacts/new"
              className="rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: "var(--accent-soft)",
                borderColor: "var(--line)",
                color: "var(--ink)",
              }}
            >
              Nuevo contacto
            </Link>
          </div>
        </header>

        <AppNavigation role={role} />

        {params.created && (
          <p
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: "var(--success)",
              backgroundColor: "var(--success-soft)",
              borderColor: "var(--line)",
            }}
          >
            Contacto creado correctamente.
          </p>
        )}

        {params.deleted && (
          <p
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: "var(--success)",
              backgroundColor: "var(--success-soft)",
              borderColor: "var(--line)",
            }}
          >
            Contacto eliminado.
          </p>
        )}

        {params.error && (
          <p
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              borderColor: "var(--line)",
            }}
          >
            No se pudo completar la operación. Comprueba el contacto e inténtalo de nuevo.
          </p>
        )}

        <form
          action="/contacts"
          method="get"
          className="mt-7 flex flex-col gap-3 sm:flex-row"
        >
          <input
            aria-label="Buscar contactos"
            className="nexo-field min-w-0 flex-1 rounded-lg px-4 py-3 text-sm"
            name="q"
            placeholder="Buscar por nombre, empresa, email o teléfono..."
            defaultValue={search}
          />
          <button
            className="rounded-lg border px-5 py-3 text-sm font-medium transition-colors"
            style={surfaceStyle}
            type="submit"
          >
            Buscar
          </button>
          {search && (
            <Link
              href="/contacts"
              className="rounded-lg px-3 py-3 text-center text-sm transition-colors"
              style={mutedStyle}
            >
              Limpiar
            </Link>
          )}
        </form>

        <div
          className="mt-5 flex items-center justify-between text-sm"
          style={mutedStyle}
        >
          <span>{count ?? 0} contactos</span>
          <span>Mostrando hasta 50 resultados</span>
        </div>

        {error ? (
          <div
            className="mt-5 rounded-xl border p-5 text-sm"
            style={{
              color: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              borderColor: "var(--line)",
            }}
          >
            No se pudo cargar la cartera. Revisa la conexión con Supabase y las políticas RLS.
          </div>
        ) : contacts?.length ? (
          <div
            className="nexo-card mt-4 overflow-hidden rounded-xl"
          >
            <div
              className="hidden grid-cols-[1.5fr_1.2fr_1fr_0.8fr] gap-4 px-5 py-3 text-xs font-semibold uppercase tracking-wide md:grid"
              style={{
                backgroundColor: "var(--surface-secondary)",
                color: "var(--muted)",
              }}
            >
              <span>Contacto</span>
              <span>Empresa / origen</span>
              <span>Contacto directo</span>
              <span>Estado</span>
            </div>

            <div className="divide-y" style={{ borderColor: "var(--line)" }}>
              {contacts.map((contact) => (
                <Link
                  key={contact.id}
                  href={`/contacts/${contact.id}`}
                  className="grid gap-2 px-5 py-4 transition-colors md:grid-cols-[1.5fr_1.2fr_1fr_0.8fr] md:items-center md:gap-4"
                  style={{ borderColor: "var(--line)" }}
                >
                  <div>
                    <p className="font-medium">
                      {contact.first_name} {contact.last_name ?? ""}
                    </p>
                    <p className="nexo-muted mt-1 text-xs">
                      <LocalDate value={contact.created_at} />
                    </p>
                  </div>

                  <div>
                    <p className="text-sm">
                      {contact.company ?? "—"}
                    </p>
                    <p className="nexo-muted mt-1 text-xs">
                      {contact.source ?? "Origen no indicado"}
                    </p>
                  </div>

                  <div className="text-sm">
                    <p>{contact.email ?? "Sin email"}</p>
                    <p className="nexo-muted mt-1">
                      {contact.phone ?? "Sin teléfono"}
                    </p>
                  </div>

                  <div>
                    <span
                      className="inline-flex rounded-full border px-2.5 py-1 text-xs"
                      style={{
                        backgroundColor: "var(--surface-secondary)",
                        borderColor: "var(--line)",
                        color: "var(--ink)",
                      }}
                    >
                      {statusLabels[contact.status] ?? contact.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <div
            className="mt-5 rounded-xl border border-dashed px-6 py-14 text-center"
            style={{
              borderColor: "var(--line)",
              backgroundColor: "var(--surface)",
            }}
          >
            <h2 className="text-lg font-medium">
              Todavía no hay contactos
            </h2>
            <p className="nexo-muted mt-2 text-sm">
              {search
                ? "No hay resultados para esa búsqueda."
                : "Añade el primer contacto para empezar a construir tu cartera."}
            </p>
            {!search && (
              <Link
                href="/contacts/new"
                className="mt-5 inline-flex rounded-lg border px-4 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: "var(--accent-soft)",
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                }}
              >
                Crear primer contacto
              </Link>
            )}
          </div>
        )}
      </div>
    </main>
  );
}