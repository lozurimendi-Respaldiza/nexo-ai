
"use client";

export function ConfirmDeleteButton() {
  return (
    <button
      type="submit"
      className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
      style={{
        borderColor: "var(--danger)",
        backgroundColor: "var(--danger-soft)",
        color: "var(--danger)",
      }}
      onClick={(event) => {
        if (
          !window.confirm(
            "¿Eliminar esta oportunidad? Esta acción no se puede deshacer."
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      Eliminar
    </button>
  );
}
