import {
  LocalDate,
  LocalDateTime,
} from "@/components/local-date-time";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { InviteMemberForm } from "@/app/settings/members/invite-member-form";
import {
  cancelInvitationAction,
  changeMemberRoleAction,
  removeMemberAction,
} from "@/app/settings/members/actions";

type SearchParams = Promise<{ success?: string; error?: string }>;

const roleLabel: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",
};

export default async function MembersSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const { supabase, user, workspaceId, role } = await getWorkspaceContext();
  if (role !== "owner" && role !== "admin") redirect("/dashboard?error=forbidden");

  const params = await searchParams;
  const { data: memberships, error: membershipsError } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });
  if (membershipsError) throw new Error(`No se pudieron cargar los miembros: ${membershipsError.message}`);

  let usersById = new Map<string, { email: string | null }>();
  let invitations: Array<{ id: string; email: string; role: string; expires_at: string; created_at: string }> = [];
  let adminConfigError = false;

  try {
    const admin = getSupabaseAdminClient();
    const { data: usersData, error: usersError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;
    usersById = new Map(usersData.users.map((item) => [item.id, {
      email: item.email ?? null,
    }] as const));

    const { data: inviteRows, error: inviteError } = await admin
      .from("workspace_invitations")
      .select("id, email, role, expires_at, created_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false });
    if (inviteError) throw inviteError;
    invitations = inviteRows ?? [];
  } catch {
    adminConfigError = true;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <Link href="/dashboard" className="text-xs font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</Link>
            <h1 className="mt-2 text-2xl font-semibold">Gestión de equipo</h1>
            <p className="mt-1 text-sm text-slate-400">Miembros, permisos e invitaciones del espacio de trabajo.</p>
          </div>
          <Link href="/dashboard" className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:border-slate-500">Volver al dashboard</Link>
        </header>

        {params.error && <p role="alert" className="mt-5 rounded-lg border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200">{params.error}</p>}
        {params.success && <p role="status" className="mt-5 rounded-lg border border-emerald-900 bg-emerald-950/30 p-3 text-sm text-emerald-200">{params.success}</p>}
        {adminConfigError && (
          <div className="mt-5 rounded-lg border border-amber-800 bg-amber-950/30 p-4 text-sm text-amber-100">
            Para mostrar correos y generar enlaces de invitación, configura <code>SUPABASE_SECRET_KEY</code> como variable privada del servidor y ejecuta el SQL incluido en el paquete. No añadas esa clave a variables <code>NEXT_PUBLIC_</code> ni la compartas por el chat.
          </div>
        )}

        <section className="mt-8 rounded-xl border border-slate-800 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">Invitar a una persona</h2>
          <p className="mt-1 text-sm text-slate-400">Si el correo ya tiene una cuenta verificada sin workspace, se incorporará directamente. Si no existe, se generará un enlace privado para que puedas enviárselo por correo u otro canal.</p>
          <InviteMemberForm canInviteAdmin={role === "owner"} />
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Miembros actuales</h2>
            <span className="text-xs text-slate-500">{memberships?.length ?? 0} cuentas</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            {(memberships ?? []).map((member) => {
              const account = usersById.get(member.user_id);
              const isSelf = member.user_id === user.id;
              const canEditRole = role === "owner" && !isSelf && member.role !== "owner";
              const canRemove = !isSelf && member.role !== "owner" && (role === "owner" || (role === "admin" && member.role === "member"));
              return (
                <article key={member.user_id} className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900/60 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{account?.email ?? `Usuario ${member.user_id.slice(0, 8)}…`}{isSelf ? " (tú)" : ""}</p>
                    <p className="mt-1 text-xs text-slate-500">
  Alta: <LocalDate value={member.created_at} /> ·{" "}
  {roleLabel[member.role] ?? "Miembro"}
</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {canEditRole && (
                      <form action={changeMemberRoleAction} className="flex items-center gap-2">
                        <input type="hidden" name="user_id" value={member.user_id} />
                        <select name="role" defaultValue={member.role} className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-2 text-xs">
                          <option value="member">Miembro</option>
                          <option value="admin">Administrador</option>
                        </select>
                        <button className="rounded-lg border border-slate-700 px-3 py-2 text-xs hover:border-cyan-600">Guardar</button>
                      </form>
                    )}
                    {!canEditRole && <span className="rounded-full border border-slate-700 px-3 py-1 text-xs text-slate-300">{roleLabel[member.role] ?? "Miembro"}</span>}
                    {canRemove && (
                      <form action={removeMemberAction}>
                        <input type="hidden" name="user_id" value={member.user_id} />
                        <button className="rounded-lg border border-rose-900 px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/40">Retirar</button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
            {!memberships?.length && <p className="bg-slate-900 p-5 text-sm text-slate-400">No hay miembros registrados.</p>}
          </div>
          {role === "admin" && <p className="mt-2 text-xs text-slate-500">Como administrador puedes incorporar y retirar miembros, pero no modificar roles de administrador ni gestionar al propietario.</p>}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Invitaciones pendientes</h2>
            <span className="text-xs text-slate-500">{invitations.length} pendientes</span>
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-800">
            {invitations.map((invitation) => (
              <article key={invitation.id} className="flex flex-col gap-3 border-b border-slate-800 bg-slate-900/60 p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{invitation.email}</p>
                  <p className="mt-1 text-xs text-slate-500">
  {roleLabel[invitation.role] ?? "Miembro"} · Caduca:{" "}
  <LocalDateTime value={invitation.expires_at} />
</p>
                </div>
                {(role === "owner" || invitation.role === "member") && (
                  <form action={cancelInvitationAction}>
                    <input type="hidden" name="invitation_id" value={invitation.id} />
                    <button className="rounded-lg border border-rose-900 px-3 py-2 text-xs text-rose-300 hover:bg-rose-950/40">Cancelar invitación</button>
                  </form>
                )}
              </article>
            ))}
            {!invitations.length && <p className="bg-slate-900 p-5 text-sm text-slate-400">No hay invitaciones pendientes.</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
