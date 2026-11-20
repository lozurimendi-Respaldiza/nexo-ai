
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

export default async function MembersSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, user, workspaceId, role } = await getWorkspaceContext();

  if (role !== "owner" && role !== "admin") {
    redirect("/dashboard?error=forbidden");
  }

  const params = await searchParams;

  const { data: memberships, error: membershipsError } = await supabase
    .from("workspace_members")
    .select("user_id, role, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (membershipsError) {
    throw new Error(`No se pudieron cargar los miembros: ${membershipsError.message}`);
  }

  let usersById = new Map<string, { email: string | null }>();
  let invitations: Array<{
    id: string;
    email: string;
    role: string;
    expires_at: string;
    created_at: string;
  }> = [];

  let adminConfigError = false;

  try {
    const admin = getSupabaseAdminClient();

    const { data: usersData, error: usersError } =
      await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (usersError) throw usersError;

    usersById = new Map(
      usersData.users.map((item) => [
        item.id,
        {
          email: item.email ?? null,
        },
      ] as const)
    );

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
    <main className="nexo-page min-h-screen px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header
          className="flex flex-wrap items-center justify-between gap-4 border-b pb-6"
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

            <h1
              className="mt-2 text-2xl font-semibold"
              style={{ color: "var(--ink)" }}
            >
              Gestión de equipo
            </h1>

            <p className="nexo-muted mt-1 text-sm">
              Miembros, permisos e invitaciones del espacio de trabajo.
            </p>
          </div>

          <Link
            href="/dashboard"
            className="rounded-lg border px-4 py-2 text-sm"
            style={{
              borderColor: "var(--line)",
              color: "var(--ink)",
              backgroundColor: "var(--surface)",
            }}
          >
            Volver al dashboard
          </Link>
        </header>

        {params.error && (
          <p
            role="alert"
            className="mt-5 rounded-lg p-3 text-sm"
            style={{
              color: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
            }}
          >
            {params.error}
          </p>
        )}

        {params.success && (
          <p
            role="status"
            className="mt-5 rounded-lg p-3 text-sm"
            style={{
              color: "var(--success)",
              backgroundColor: "var(--success-soft)",
            }}
          >
            {params.success}
          </p>
        )}

        {adminConfigError && (
          <div
            className="mt-5 rounded-lg p-4 text-sm"
            style={{
              color: "var(--warning)",
              backgroundColor: "var(--warning-soft)",
              border: "1px solid var(--line)",
            }}
          >
            Para mostrar correos y generar enlaces de invitación, configura{" "}
            <code>SUPABASE_SECRET_KEY</code> como variable privada del servidor
            y ejecuta el SQL incluido en el paquete. No añadas esa clave a
            variables <code>NEXT_PUBLIC_</code> ni la compartas por el chat.
          </div>
        )}

        <section className="nexo-card mt-8 rounded-xl p-5">
          <h2
            className="text-lg font-semibold"
            style={{ color: "var(--ink)" }}
          >
            Invitar a una persona
          </h2>

          <p className="nexo-muted mt-1 text-sm">
            Si el correo ya tiene una cuenta verificada sin workspace, se
            incorporará directamente. Si no existe, se generará un enlace
            privado para que puedas enviárselo por correo u otro canal.
          </p>

          <InviteMemberForm canInviteAdmin={role === "owner"} />
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--ink)" }}
            >
              Miembros actuales
            </h2>

            <span className="nexo-muted text-xs">
              {memberships?.length ?? 0} cuentas
            </span>
          </div>

          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--line)" }}
          >
            {(memberships ?? []).map((member) => {
              const account = usersById.get(member.user_id);
              const isSelf = member.user_id === user.id;

              const canEditRole =
                role === "owner" && !isSelf && member.role !== "owner";

              const canRemove =
                !isSelf &&
                member.role !== "owner" &&
                (role === "owner" ||
                  (role === "admin" && member.role === "member"));

              return (
                <article
                  key={member.user_id}
                  className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                  style={{
                    borderColor: "var(--line)",
                    backgroundColor: "var(--surface)",
                  }}
                >
                  <div className="min-w-0">
                    <p
                      className="truncate font-medium"
                      style={{ color: "var(--ink)" }}
                    >
                      {account?.email ??
                        `Usuario ${member.user_id.slice(0, 8)}…`}
                      {isSelf ? " (tú)" : ""}
                    </p>

                    <p className="nexo-muted mt-1 text-xs">
                      Alta: <LocalDate value={member.created_at} /> ·{" "}
                      {roleLabel[member.role] ?? "Miembro"}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canEditRole && (
                      <form
                        action={changeMemberRoleAction}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="hidden"
                          name="user_id"
                          value={member.user_id}
                        />

                        <select
                          name="role"
                          defaultValue={member.role}
                          className="nexo-field rounded-lg px-2 py-2 text-xs"
                        >
                          <option value="member">Miembro</option>
                          <option value="admin">Administrador</option>
                        </select>

                        <button
                          className="rounded-lg border px-3 py-2 text-xs"
                          style={{
                            borderColor: "var(--line)",
                            color: "var(--ink)",
                            backgroundColor: "var(--surface)",
                          }}
                        >
                          Guardar
                        </button>
                      </form>
                    )}

                    {!canEditRole && (
                      <span
                        className="rounded-full border px-3 py-1 text-xs"
                        style={{
                          borderColor: "var(--line)",
                          color: "var(--muted)",
                        }}
                      >
                        {roleLabel[member.role] ?? "Miembro"}
                      </span>
                    )}

                    {canRemove && (
                      <form action={removeMemberAction}>
                        <input
                          type="hidden"
                          name="user_id"
                          value={member.user_id}
                        />

                        <button
                          className="rounded-lg border px-3 py-2 text-xs"
                          style={{
                            borderColor: "var(--danger)",
                            color: "var(--danger)",
                          }}
                        >
                          Retirar
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}

            {!memberships?.length && (
              <p className="nexo-muted p-5 text-sm">
                No hay miembros registrados.
              </p>
            )}
          </div>

          {role === "admin" && (
            <p className="nexo-muted mt-2 text-xs">
              Como administrador puedes incorporar y retirar miembros, pero no
              modificar roles de administrador ni gestionar al propietario.
            </p>
          )}
        </section>

        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              className="text-lg font-semibold"
              style={{ color: "var(--ink)" }}
            >
              Invitaciones pendientes
            </h2>

            <span className="nexo-muted text-xs">
              {invitations.length} pendientes
            </span>
          </div>

          <div
            className="overflow-hidden rounded-xl border"
            style={{ borderColor: "var(--line)" }}
          >
            {invitations.map((invitation) => (
              <article
                key={invitation.id}
                className="flex flex-col gap-3 border-b p-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  borderColor: "var(--line)",
                  backgroundColor: "var(--surface)",
                }}
              >
                <div>
                  <p
                    className="font-medium"
                    style={{ color: "var(--ink)" }}
                  >
                    {invitation.email}
                  </p>

                  <p className="nexo-muted mt-1 text-xs">
                    {roleLabel[invitation.role] ?? "Miembro"} · Caduca:{" "}
                    <LocalDateTime value={invitation.expires_at} />
                  </p>
                </div>

                {(role === "owner" || invitation.role === "member") && (
                  <form action={cancelInvitationAction}>
                    <input
                      type="hidden"
                      name="invitation_id"
                      value={invitation.id}
                    />

                    <button
                      className="rounded-lg border px-3 py-2 text-xs"
                      style={{
                        borderColor: "var(--danger)",
                        color: "var(--danger)",
                      }}
                    >
                      Cancelar invitación
                    </button>
                  </form>
                )}
              </article>
            ))}

            {!invitations.length && (
              <p className="nexo-muted p-5 text-sm">
                No hay invitaciones pendientes.
              </p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
