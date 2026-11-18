"use client";

import type { FormEvent } from "react";

export function DeleteContactButton({ action }: { action: () => void | Promise<void> }) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (!window.confirm("¿Seguro que quieres eliminar este contacto? Esta acción no se puede deshacer.")) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmDelete}>
      <button
        type="submit"
        className="rounded-lg border border-rose-900/70 px-4 py-2 text-sm text-rose-300 transition hover:border-rose-600 hover:bg-rose-950/40"
      >
        Eliminar contacto
      </button>
    </form>
  );
}
