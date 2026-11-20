
import { AppNavigation } from "@/components/app-navigation";
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

  const [
    { count: contactsCount },
    { count: opportunitiesCount },
    { count: tasksCount },
  ] = await Promise.all([
    supabase.from("contacts").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("opportunities").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("tasks").select("*", { count: "exact", head: true }).eq("workspace_id", workspaceId),
  ]);

  const cards = [
    {
      href: "/contacts",
      title: "Cartera de contactos",
      description: "Alta, búsqueda, seguimiento e historial comercial.",
      action: "Abrir contactos",
    },
    {
      href: "/opportunities",
      title: "Pipeline de oportunidades",
      description: "Consulta etapas, valor y previsión ponderada.",
      action: "Abrir pipeline",
    },
    {
      href: "/next-best-action",
      title: "Next Best Action",
      description: "Descubre qué tarea u oportunidad conviene atender primero y por qué.",
      action: "Ver prioridades",
      accent: true,
    },
    {
      href: "/activity",
      title: "Historial de actividad",
      description: "Consulta llamadas, emails, reuniones, notas y cambios de etapa, incluidos los registros históricos.",
      action: "Abrir historial",
    },
    ...(role !== "member"
      ? [{
          href: "/settings/members",
          title: "Gestión de equipo",
          description: "Invita usuarios, administra roles y controla el acceso al espacio de trabajo.",
          action: "Gestionar miembros",
        }]
      : []),
    ...(role === "owner"
      ? [{
          href: "/settings/reset",
          title: "Restablecer espacio de trabajo",
          description: "Elimina los datos comerciales del espacio y permite empezar de cero. Conserva usuarios, roles y espacio de trabajo.",
          action: "Configurar restablecimiento",
          danger: true,
        }]
      : []),
    {
      href: "/nba-analytics",
      title: "Resultados NBA",
      description: "Mide recomendaciones registradas, ejecución y oportunidades vinculadas ganadas.",
      action: "Consultar resultados",
    },
  ];

  return (
    <main
      className="min-h-screen px-5 py-8 sm:px-8"
      style={{ backgroundColor: "var(--canvas)", color: "var(--ink)" }}
    >
      <div className="mx-auto max-w-6xl">
        <header
          className="flex flex-wrap items-center justify-between gap-4 border-b pb-6"
          style={{ borderColor: "var(--line)" }}
        >
          <div>
            <Link
              href="/"
              className="text-xs font-semibold tracking-[0.25em]"
              style={{ color: "var(--accent)" }}
            >
              NEXO AI
            </Link>
            <h1 className="mt-2 text-2xl font-semibold">
              {workspace?.name ?? "Mi espacio de trabajo"}
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
              {user.email}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              Rol: {role === "owner" ? "Propietario" : role === "admin" ? "Administrador" : "Miembro"}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/contacts"
              className="rounded-lg px-4 py-2 text-sm font-semibold"
              style={{ backgroundColor: "var(--accent)", color: "#ffffff" }}
            >
              Gestionar contactos
            </Link>
            <form action={signOutAction}>
              <button
                className="rounded-lg border px-4 py-2 text-sm"
                style={{
                  borderColor: "var(--line)",
                  color: "var(--ink)",
                  backgroundColor: "var(--surface)",
                }}
              >
                Cerrar sesión
              </button>
            </form>
          </div>
        </header>

        <AppNavigation role={role} />

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Resumen</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--muted)" }}>
            Actividad de tu espacio de trabajo.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              ["Contactos", contactsCount ?? 0],
              ["Oportunidades", opportunitiesCount ?? 0],
              ["Tareas", tasksCount ?? 0],
            ].map(([label, value]) => (
              <article
                key={label}
                className="rounded-xl border p-5"
                style={{
                  borderColor: "var(--line)",
                  backgroundColor: "var(--surface)",
                }}
              >
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  {label}
                </p>
                <p className="mt-3 text-3xl font-semibold tabular-nums">
                  {value}
                </p>
              </article>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {cards.map((card) => (
              <Link
                key={card.href}
                href={card.href}
                className="rounded-xl border p-5 transition hover:opacity-85"
                style={{
                  borderColor: card.danger
                    ? "var(--danger)"
                    : card.accent
                      ? "var(--accent)"
                      : "var(--line)",
                  backgroundColor: card.accent || card.danger
                    ? "var(--accent-soft)"
                    : "var(--surface)",
                }}
              >
                <h3 className="font-semibold">{card.title}</h3>
                <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
                  {card.description}
                </p>
                <p
                  className="mt-4 text-sm font-medium"
                  style={{
                    color: card.danger ? "var(--danger)" : "var(--accent)",
                  }}
                >
                  {card.action} →
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
