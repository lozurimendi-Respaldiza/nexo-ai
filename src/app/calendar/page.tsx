import { AppNavigation } from "@/components/app-navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";
import CalendarClient from "./calendar-client";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    error?: string;
    saved?: string;
    deleted?: string;
  }>;
};

export default async function CalendarPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;

  const {
    supabase,
    user,
    workspaceId,
    role,
  } = await getWorkspaceContext();

  const db = supabase as any;

  const [
    eventsResult,
    contactsResult,
    opportunitiesResult,
  ] = await Promise.all([
    db
      .from("calendar_events")
      .select(
        "id,title,description,starts_at,ends_at,contact_id,opportunity_id,created_by"
      )
      .eq("workspace_id", workspaceId)
      .order("starts_at", { ascending: true })
      .limit(1000),

    db
      .from("contacts")
      .select("id,first_name,last_name,company")
      .eq("workspace_id", workspaceId)
      .order("first_name", { ascending: true })
      .limit(500),

    db
      .from("opportunities")
      .select("id,title,next_action_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);


  return (
    <main className="nexo-page mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <AppNavigation role={role} />

      <header className="mb-6">
        <p
          className="text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          Organización comercial
        </p>

        <h1
          className="mt-1 text-3xl font-bold"
          style={{ color: "var(--ink)" }}
        >
          Calendario
        </h1>

        <p
          className="mt-2 text-sm"
          style={{ color: "var(--muted)" }}
        >
          Organiza tus reuniones, citas y próximas actividades comerciales.
        </p>
      </header>

      {eventsResult.error && (
        <div
          className="mb-5 rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--danger)",
            backgroundColor: "var(--danger-soft)",
            color: "var(--danger)",
          }}
        >
          No se han podido cargar los eventos del calendario. Comprueba la conexión e inténtalo de nuevo.
        </div>
      )}

      <CalendarClient
        events={eventsResult.data ?? []}
        contacts={contactsResult.data ?? []}
        opportunities={opportunitiesResult.data ?? []}
        currentUserId={user.id}
        error={params.error}
        saved={params.saved === "1"}
        deleted={params.deleted === "1"}
      />
    </main>
  );
}