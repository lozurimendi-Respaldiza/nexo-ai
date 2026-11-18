"use client";

export function ConfirmDeleteButton() {
  return (
    <button
      type="submit"
      className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
      onClick={(event) => {
        if (!window.confirm("¿Eliminar esta oportunidad? Esta acción no se puede deshacer.")) {
          event.preventDefault();
        }
      }}
    >
      Eliminar
    </button>
  );
}
