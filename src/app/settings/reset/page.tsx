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

export default async function ResetWorkspacePage({ searchParams }: ResetPageProps) {
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
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
        >
          ← Volver al dashboard
        </Link>

        <header className="mt-8 border-b border-slate-800 pb-6">
          <p className="text-xs font-semibold tracking-[0.25em] text-rose-300">
            CONFIGURACIÓN DEL PROPIETARIO
          </p>
          <h1 className="mt-3 text-2xl font-semibold">
            Restablecer espacio de trabajo
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            Espacio: {workspace?.name ?? "Mi espacio de trabajo"}
          </p>
        </header>

        {params.success === "1" && (
          <div className="mt-6 rounded-xl border border-emerald-800 bg-emerald-950/30 p-4 text-sm text-emerald-300">
            El espacio de trabajo se ha restablecido correctamente. Puedes
            comenzar a introducir nuevos datos.
          </div>
        )}

        {params.error === "confirmation" && (
          <div className="mt-6 rounded-xl border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-300">
            No se ha podido confirmar la operación. Debes escribir RESTABLECER
            y marcar la casilla de aceptación.
          </div>
        )}

        {params.error === "operation" && (
          <div className="mt-6 rounded-xl border border-rose-800 bg-rose-950/30 p-4 text-sm text-rose-300">
            No se ha podido completar el restablecimiento. No vuelvas a
            intentarlo hasta revisar el error del servidor.
          </div>
        )}

        <section className="mt-8 rounded-xl border border-rose-900/70 bg-rose-950/20 p-6">
          <h2 className="text-lg font-semibold text-rose-200">
            Datos que se eliminarán
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>Contactos y sus datos comerciales.</li>
            <li>Oportunidades y registros del pipeline.</li>
            <li>Tareas y asignaciones.</li>
            <li>Actividades e historial comercial.</li>
            <li>Recomendaciones y eventos de Next Best Action.</li>
            <li>Invitaciones pendientes al espacio de trabajo.</li>
          </ul>
        </section>

        <section className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <h2 className="text-lg font-semibold text-emerald-300">
            Elementos que se conservarán
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-300">
            <li>Tu cuenta de usuario y acceso a NEXO AI.</li>
            <li>El espacio de trabajo y su nombre.</li>
            <li>Los miembros actuales y sus roles.</li>
            <li>La configuración, estructura y permisos de la aplicación.</li>
          </ul>
        </section>

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">
            Confirmación de seguridad
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Esta operación es irreversible desde la aplicación. Comprueba el
            alcance antes de continuar.
          </p>
          <ResetWorkspaceForm />
        </section>
      </div>
    </main>
  );
}
