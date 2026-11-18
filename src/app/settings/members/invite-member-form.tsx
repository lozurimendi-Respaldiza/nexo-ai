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
          <span className="mb-1 block text-xs text-slate-400">Correo electrónico</span>
          <input name="email" type="email" required maxLength={254} placeholder="persona@empresa.com" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Rol inicial</span>
          <select name="role" defaultValue="member" className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-cyan-500">
            <option value="member">Miembro</option>
            {canInviteAdmin && <option value="admin">Administrador</option>}
          </select>
        </label>
        <div className="flex items-end">
          <button type="submit" disabled={pending} className="w-full rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-wait disabled:opacity-60">
            {pending ? "Generando…" : "Generar enlace"}
          </button>
        </div>
      </form>

      {state.message && (
        <p role={state.status === "error" ? "alert" : "status"} className={`mt-4 rounded-lg border p-3 text-sm ${state.status === "error" ? "border-rose-900 bg-rose-950/40 text-rose-200" : "border-emerald-900 bg-emerald-950/30 text-emerald-200"}`}>
          {state.message}
        </p>
      )}

      {state.inviteUrl && (
        <div className="mt-3 rounded-lg border border-slate-700 bg-slate-950 p-3">
          <label className="block text-xs text-slate-400" htmlFor="generated-invite-link">Enlace privado de invitación</label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input id="generated-invite-link" readOnly value={state.inviteUrl} className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-200" />
            <button type="button" onClick={copyInviteLink} className="rounded-lg border border-cyan-700 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-cyan-950/40">
              {copied ? "Copiado" : "Copiar enlace"}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-500">Compártelo únicamente con el correo indicado. El enlace es de un solo uso y caduca en una hora.</p>
        </div>
      )}
    </div>
  );
}
