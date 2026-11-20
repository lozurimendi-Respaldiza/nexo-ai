
"use client";

import { useState } from "react";
import { resetWorkspaceAction } from "./actions";

export function ResetWorkspaceForm() {
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);

  const canSubmit = confirmation === "RESTABLECER" && acknowledged;

  return (
    <form action={resetWorkspaceAction} className="mt-6 space-y-5">
      <div>
        <label
          htmlFor="confirmation"
          className="block text-sm font-medium"
          style={{ color: "var(--ink)" }}
        >
          Escribe RESTABLECER para confirmar
        </label>

        <input
          id="confirmation"
          name="confirmation"
          type="text"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          autoComplete="off"
          className="nexo-field mt-2 w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:border-[var(--danger)]"
          placeholder="RESTABLECER"
          required
        />
      </div>

      <label
        className="flex items-start gap-3 text-sm"
        style={{ color: "var(--muted)" }}
      >
        <input
          type="checkbox"
          name="acknowledged"
          value="yes"
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[var(--danger)]"
          required
        />

        <span>
          Confirmo que entiendo que se eliminarán los contactos, oportunidades,
          tareas, actividades, recomendaciones NBA e invitaciones pendientes de
          este espacio de trabajo. Los usuarios, miembros, roles y el propio
          espacio se conservarán.
        </span>
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        className="rounded-lg px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          backgroundColor: "var(--danger)",
          color: "#ffffff",
        }}
      >
        Restablecer espacio de trabajo
      </button>
    </form>
  );
}
