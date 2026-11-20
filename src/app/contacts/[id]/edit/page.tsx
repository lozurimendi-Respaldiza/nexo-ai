
import Link from "next/link";
import { notFound } from "next/navigation";
import { updateContactAction } from "@/app/contacts/actions";
import { ContactForm } from "@/app/contacts/contact-form";
import { getWorkspaceContext } from "@/lib/workspace-context";

type EditContactPageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function EditContactPage({
  params,
  searchParams,
}: EditContactPageProps) {
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
    <main className="nexo-page px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/contacts/${id}`}
          className="text-sm font-medium"
          style={{ color: "var(--accent)" }}
        >
          ← Volver a la ficha
        </Link>

        <h1 className="mt-5 text-2xl font-semibold">
          Editar contacto
        </h1>

        <p className="nexo-muted mt-2 text-sm">
          Actualiza los datos de {contact.first_name}{" "}
          {contact.last_name ?? ""}.
        </p>

        {error && (
          <p
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              color: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              borderColor: "var(--line)",
            }}
          >
            No se pudo actualizar el contacto. Revisa los datos.
          </p>
        )}

        <section className="nexo-card mt-7 rounded-xl p-5 sm:p-7">
          <ContactForm
            action={updateAction}
            contact={contact}
            submitLabel="Guardar cambios"
          />
        </section>
      </div>
    </main>
  );
}
