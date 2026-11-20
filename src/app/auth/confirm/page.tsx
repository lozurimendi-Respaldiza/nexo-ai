
import Link from "next/link";
import { confirmInvitationAction } from "@/app/auth/confirm/actions";

type SearchParams = Promise<{
  token_hash?: string;
  type?: string;
  invitation_id?: string;
  error?: string;
}>;

export default async function ConfirmInvitationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;

  const validInvitationId =
    typeof params.invitation_id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      params.invitation_id
    );

  const validLink =
    Boolean(params.token_hash) &&
    params.type === "invite" &&
    validInvitationId;

  return (
    <main className="nexo-page flex min-h-screen items-center justify-center px-5 py-10">
      <section className="nexo-card w-full max-w-md rounded-2xl p-7 shadow-xl">
        <Link
          href="/"
          className="text-xs font-semibold tracking-[0.25em]"
style={{ color: "var(--accent)" }}
        >
          NEXO AI
        </Link>

        <h1
  className="mt-4 text-2xl font-semibold"
  style={{ color: "var(--ink)" }}
>
          Aceptar invitación
        </h1>

        <p className="nexo-muted mt-2 text-sm leading-6">
          Confirma tu acceso al espacio de trabajo. El enlace solo puede
          utilizarse una vez.
        </p>

        {params.error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border p-3 text-sm"
style={{
  borderColor: "var(--danger)",
  backgroundColor: "var(--danger-soft)",
  color: "var(--danger)",
}}
          >
            {params.error}
          </p>
        )}

        {validLink ? (
          <form action={confirmInvitationAction} className="mt-6">
            <input
              type="hidden"
              name="token_hash"
              value={params.token_hash}
            />
            <input
              type="hidden"
              name="type"
              value="invite"
            />
            <input
              type="hidden"
              name="invitation_id"
              value={params.invitation_id}
            />

            <button className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition-colors"
style={{
  backgroundColor: "var(--accent)",
  color: "var(--accent-foreground, var(--ink))",
}}>
              Confirmar y acceder
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg border p-3 text-sm"
style={{
  borderColor: "var(--warning)",
  backgroundColor: "var(--warning-soft)",
  color: "var(--warning)",
}}>
            El enlace no es válido. Solicita al administrador que envíe una nueva invitación.
          </p>
        )}
      </section>
    </main>
  );
}
