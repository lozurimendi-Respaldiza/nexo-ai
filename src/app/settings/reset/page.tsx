
import Link from "next/link";
import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { ResetWorkspaceForm } from "./reset-workspace-form";

type ResetPageProps = {
  searchParams: Promise<{
    success?: string;
    error?: string;
  }>;
};

export default async function ResetWorkspacePage({
  searchParams,
}: ResetPageProps) {
  const { role, supabase, workspaceId } = await getWorkspaceContext();

  if (role !== "owner") {
    redirect("/dashboard");
  }

  const [{ data: workspace }, params] = await Promise.all([
    supabase
      .from("workspaces")
      .select("name")
      .eq("id", workspaceId)
      .single(),
    searchParams,
  ]);

  return (
    <main className="nexo-page min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          ← Volver al dashboard
        </Link>

        <header
          className="mt-8 border-b pb-6"
          style={{ borderColor: "var(--line)" }}
        >
          <p
            className="text-xs font-semibold tracking-[0.25em]"
            style={{ color: "var(--danger)" }}
          >
            CONFIGURACIÓN DEL PROPIETARIO
          </p>

          <h1
            className="mt-3 text-2xl font-semibold"
            style={{ color: "var(--ink)" }}
          >
            Restablecer espacio de trabajo
          </h1>

          <p className="nexo-muted mt-2 text-sm">
            Espacio: {workspace?.name ?? "Mi espacio de trabajo"}
          </p>
        </header>

        {params.success === "1" && (
          <div
            className="mt-6 rounded-xl p-4 text-sm"
            style={{
              color: "var(--success)",
              backgroundColor: "var(--success-soft)",
              border: "1px solid var(--line)",
            }}
          >
            El espacio de trabajo se ha restablecido correctamente. Puedes
            comenzar a introducir nuevos datos.
          </div>
        )}

        {params.error === "confirmation" && (
          <div
            className="mt-6 rounded-xl p-4 text-sm"
            style={{
              color: "var(--warning)",
              backgroundColor: "var(--warning-soft)",
              border: "1px solid var(--line)",
            }}
          >
            No se ha podido confirmar la operación. Debes escribir RESTABLECER
            y marcar la casilla de aceptación.
          </div>
        )}

        {params.error === "operation" && (
          <div
            className="mt-6 rounded-xl p-4 text-sm"
            style={{
              color: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              border: "1px solid var(--line)",
            }}
          >
            No se ha podido completar el restablecimiento. No vuelvas a
            intentarlo hasta revisar el error del servidor.
          </div>
        )}

        <section
          className="mt-8 rounded-xl p-6"
          style={{
            border: "1px solid var(--danger)",
            backgroundColor: "var(--danger-soft)",
          }}
        >
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--danger)" }}
          >
            Datos que se eliminarán
          </h2>

          <ul className="nexo-muted mt-4 list-disc space-y-2 pl-5 text-sm">
            <li>Contactos y sus datos comerciales.</li>
            <li>Oportunidades y registros del pipeline.</li>
            <li>Tareas y asignaciones.</li>
            <li>Actividades e historial comercial.</li>
            <li>Recomendaciones y eventos de Next Best Action.</li>
            <li>Invitaciones pendientes al espacio de trabajo.</li>
          </ul>
        </section>

        <section className="nexo-card mt-5 rounded-xl p-6">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--success)" }}
          >
            Elementos que se conservarán
          </h2>

          <ul className="nexo-muted mt-4 list-disc space-y-2 pl-5 text-sm">
            <li>Tu cuenta de usuario y acceso a NEXO AI.</li>
            <li>El espacio de trabajo y su nombre.</li>
            <li>Los miembros actuales y sus roles.</li>
            <li>La configuración, estructura y permisos de la aplicación.</li>
          </ul>
        </section>

        <section className="nexo-card mt-8 rounded-xl p-6">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--ink)" }}
          >
            Confirmación de seguridad
          </h2>

          <p className="nexo-muted mt-2 text-sm">
            Esta operación es irreversible desde la aplicación. Comprueba el
            alcance antes de continuar.
          </p>

          <ResetWorkspaceForm />
        </section>
      </div>
    </main>
  );
}
