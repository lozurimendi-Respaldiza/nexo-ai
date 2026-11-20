import { redirect } from "next/navigation";
import { getUserWorkspaceMembership } from "@/lib/workspace-context";
import { createWorkspaceAction } from "./actions";

type Props = { searchParams: Promise<{ error?: string }> };

export default async function OnboardingPage({ searchParams }: Props) {
  const { membership } = await getUserWorkspaceMembership();

  if (membership?.workspace_id) redirect("/dashboard");

  const params = await searchParams;
  return (
    <main className="nexo-page flex min-h-screen items-center justify-center px-5">
      <section className="nexo-card w-full max-w-md rounded-2xl p-8">
        <p className="text-xs font-semibold tracking-[0.25em]" style={{ color: "var(--accent)" }}>NEXO AI</p>
        <h1 className="mt-5 text-2xl font-semibold" style={{ color: "var(--ink)" }}>Configura tu espacio de trabajo</h1>
        <p className="nexo-muted mt-2 text-sm">Define el nombre de la empresa o cartera que vas a gestionar.</p>
        {params.error && (
  <p
    role="alert"
    className="mt-4 rounded-lg px-3 py-2 text-sm"
    style={{ color: "var(--danger)", backgroundColor: "var(--danger-soft)" }}
  >
    {params.error}
  </p>
)}
        <form action={createWorkspaceAction} className="mt-6 space-y-4">
          <input
  name="workspace_name"
  required
  minLength={2}
  maxLength={120}
  placeholder="Nombre del espacio"
  className="nexo-field w-full rounded-lg px-3 py-3 text-sm outline-none"
/>
          <button
  className="w-full rounded-lg px-4 py-3 text-sm font-semibold"
  style={{
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground, var(--ink))",
  }}
>
  Continuar
</button>
        </form>
      </section>
    </main>
  );
}
