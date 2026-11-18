
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
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-5 py-10 text-slate-100">
      <section className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-7 shadow-xl">
        <Link
          href="/"
          className="text-xs font-semibold tracking-[0.25em] text-cyan-300"
        >
          NEXO AI
        </Link>

        <h1 className="mt-4 text-2xl font-semibold">
          Aceptar invitación
        </h1>

        <p className="mt-2 text-sm leading-6 text-slate-400">
          Confirma tu acceso al espacio de trabajo. El enlace solo puede
          utilizarse una vez.
        </p>

        {params.error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border border-rose-900 bg-rose-950/40 p-3 text-sm text-rose-200"
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

            <button className="w-full rounded-lg bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
              Confirmar y acceder
            </button>
          </form>
        ) : (
          <p className="mt-6 rounded-lg border border-amber-800 bg-amber-950/30 p-3 text-sm text-amber-100">
            El enlace no es válido. Solicita al administrador que envíe una nueva invitación.
          </p>
        )}
      </section>
    </main>
  );
}
