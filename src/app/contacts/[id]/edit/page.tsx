import Link from "next/link";
import { notFound } from "next/navigation";
import { updateContactAction } from "@/app/contacts/actions";
import { ContactForm } from "@/app/contacts/contact-form";
import { getWorkspaceContext } from "@/lib/workspace-context";

type EditContactPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditContactPage({ params, searchParams }: EditContactPageProps) {
  const { id } = await params;
  const { error } = await searchParams;
  const { supabase, workspaceId } = await getWorkspaceContext();

  const { data: contact, error: contactError } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (contactError || !contact) notFound();

  const updateAction = updateContactAction.bind(null, id);

  return (
    <main className="min-h-screen bg-slate-950 px-5 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href={`/contacts/${id}`} className="text-sm text-cyan-300 hover:text-cyan-200">← Volver a la ficha</Link>
        <h1 className="mt-5 text-2xl font-semibold">Editar contacto</h1>
        <p className="mt-2 text-sm text-slate-400">Actualiza los datos de {contact.first_name} {contact.last_name ?? ""}.</p>
        {error && <p className="mt-5 rounded-lg border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">No se pudo actualizar el contacto. Revisa los datos.</p>}
        <section className="mt-7 rounded-xl border border-slate-800 bg-slate-900/60 p-5 sm:p-7">
          <ContactForm action={updateAction} contact={contact} submitLabel="Guardar cambios" />
        </section>
      </div>
    </main>
  );
}
