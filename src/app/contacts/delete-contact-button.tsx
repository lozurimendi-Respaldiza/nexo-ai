
"use client";

import type { FormEvent } from "react";

export function DeleteContactButton({
  action,
}: {
  action: () => void | Promise<void>;
}) {
  function confirmDelete(event: FormEvent<HTMLFormElement>) {
    if (
      !window.confirm(
        "¿Seguro que quieres eliminar este contacto? Esta acción no se puede deshacer."
      )
    ) {
      event.preventDefault();
    }
  }

  return (
    <form action={action} onSubmit={confirmDelete}>
      <button
        type="submit"
        className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
        style={{
          color: "var(--danger)",
          borderColor: "var(--danger)",
          backgroundColor: "var(--danger-soft)",
        }}
      >
        Eliminar contacto
      </button>
    </form>
  );
}
