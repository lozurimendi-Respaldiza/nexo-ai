
import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { ImportContactsClient } from "./import-contacts-client";

export default async function ImportContactsPage() {
  await getWorkspaceContext();

  return (
    <main className="nexo-page px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header
          className="border-b pb-6"
          style={{ borderColor: "var(--line)" }}
        >
          <Link
            href="/contacts"
            className="text-xs font-semibold tracking-[0.25em]"
            style={{ color: "var(--accent)" }}
          >
            NEXO AI
          </Link>

          <h1 className="mt-3 text-2xl font-semibold">
            Importar contactos
          </h1>

          <p className="nexo-muted mt-1 text-sm">
            Carga una cartera desde un archivo CSV, revisa las columnas y confirma la importación.
          </p>
        </header>

        <ImportContactsClient />
      </div>
    </main>
  );
}
