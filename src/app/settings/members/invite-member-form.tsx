
"use client";

import { useActionState, useState } from "react";
import { inviteMemberAction, type InviteActionState } from "@/app/settings/members/actions";

const initialState: InviteActionState = { status: "idle" };

export function InviteMemberForm({ canInviteAdmin }: { canInviteAdmin: boolean }) {
  const [state, formAction, pending] = useActionState(inviteMemberAction, initialState);
  const [copied, setCopied] = useState(false);

  async function copyInviteLink() {
    if (!state.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(state.inviteUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <form action={formAction} className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <label className="block">
          <span className="nexo-muted mb-1 block text-xs">Correo electrónico</span>
          <input
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="persona@empresa.com"
            className="nexo-field w-full rounded-lg px-3 py-2 text-sm outline-none"
          />
        </label>

        <label className="block">
          <span className="nexo-muted mb-1 block text-xs">Rol inicial</span>
          <select
            name="role"
            defaultValue="member"
            className="nexo-field w-full rounded-lg px-3 py-2 text-sm outline-none"
          >
            <option value="member">Miembro</option>
            {canInviteAdmin && <option value="admin">Administrador</option>}
          </select>
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg px-4 py-2 text-sm font-semibold disabled:cursor-wait disabled:opacity-60"
            style={{
              backgroundColor: "var(--accent)",
              color: "var(--accent-foreground, var(--ink))",
            }}
          >
            {pending ? "Generando…" : "Generar enlace"}
          </button>
        </div>
      </form>

      {state.message && (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className="mt-4 rounded-lg p-3 text-sm"
          style={
            state.status === "error"
              ? { color: "var(--danger)", backgroundColor: "var(--danger-soft)" }
              : { color: "var(--success)", backgroundColor: "var(--success-soft)" }
          }
        >
          {state.message}
        </p>
      )}

      {state.inviteUrl && (
        <div className="nexo-card mt-3 rounded-lg p-3">
          <label
            className="nexo-muted block text-xs"
            htmlFor="generated-invite-link"
          >
            Enlace privado de invitación
          </label>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="generated-invite-link"
              readOnly
              value={state.inviteUrl}
              className="nexo-field min-w-0 flex-1 rounded-lg px-3 py-2 text-xs"
            />

            <button
              type="button"
              onClick={copyInviteLink}
              className="rounded-lg border px-4 py-2 text-xs font-semibold"
              style={{
                borderColor: "var(--accent)",
                color: "var(--accent)",
                backgroundColor: "var(--surface)",
              }}
            >
              {copied ? "Copiado" : "Copiar enlace"}
            </button>
          </div>

          <p className="nexo-muted mt-2 text-xs">
            Compártelo únicamente con el correo indicado. El enlace es de un
            solo uso y caduca en una hora.
          </p>
        </div>
      )}
    </div>
  );
}
