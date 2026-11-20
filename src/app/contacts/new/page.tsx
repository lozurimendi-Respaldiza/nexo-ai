
import Link from "next/link";
import { createContactAction } from "@/app/contacts/actions";
import { ContactForm } from "@/app/contacts/contact-form";
import { getWorkspaceContext } from "@/lib/workspace-context";

type NewContactPageProps = {
  searchParams: Promise<{ error?: string }>;
};

const errors: Record<string, string> = {
  first_name: "El nombre es obligatorio y no puede superar 100 caracteres.",
  fields: "Revisa los campos introducidos.",
  email: "Introduce una dirección de email válida.",
  status: "El estado seleccionado no es válido.",
  save: "No se pudo guardar el contacto. Comprueba los datos e inténtalo de nuevo.",
};

export default async function NewContactPage({
  searchParams,
}: NewContactPageProps) {
  await getWorkspaceContext();
  const { error } = await searchParams;

  return (
    <main className="nexo-page px-5 py-8 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/contacts"
          className="text-sm font-medium transition-colors"
          style={{ color: "var(--accent)" }}
        >
          ← Volver a contactos
        </Link>

        <h1 className="mt-5 text-2xl font-semibold">
          Nuevo contacto
        </h1>

        <p className="nexo-muted mt-2 text-sm">
          Registra una persona o empresa en la cartera de tu espacio de trabajo.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-lg border px-4 py-3 text-sm"
            style={{
              borderColor: "var(--danger)",
              backgroundColor: "var(--danger-soft)",
              color: "var(--danger)",
            }}
          >
            {errors[error] ?? "No se pudo guardar el contacto."}
          </p>
        )}

        <section className="nexo-card mt-7 rounded-xl p-5 sm:p-7">
          <ContactForm
            action={createContactAction}
            submitLabel="Guardar contacto"
          />
        </section>
      </div>
    </main>
  );
}
