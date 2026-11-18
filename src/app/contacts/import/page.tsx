import Link from "next/link";
import { getWorkspaceContext } from "@/lib/workspace-context";
import { ImportContactsClient } from "./import-contacts-client";

export default async function ImportContactsPage() {
  await getWorkspaceContext();

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-slate-800 pb-6">
          <Link href="/contacts" className="text-xs font-semibold tracking-[0.25em] text-cyan-300">NEXO AI</Link>
          <h1 className="mt-3 text-2xl font-semibold">Importar contactos</h1>
          <p className="mt-1 text-sm text-slate-400">
            Carga una cartera desde un archivo CSV, revisa las columnas y confirma la importación.
          </p>
        </header>
        <ImportContactsClient />
      </div>
    </main>
  );
}
