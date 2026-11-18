import type { Tables } from "@/lib/supabase/database.types";

type ContactValues = Partial<Tables<"contacts">>;

type ContactFormProps = {
  action: (formData: FormData) => void | Promise<void>;
  contact?: ContactValues;
  submitLabel: string;
};

const inputClass =
  "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/15";
const labelClass = "block text-sm font-medium text-slate-300";

export function ContactForm({ action, contact, submitLabel }: ContactFormProps) {
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className={labelClass}>
          Nombre *
          <input className={inputClass} name="first_name" required maxLength={100} defaultValue={contact?.first_name ?? ""} />
        </label>
        <label className={labelClass}>
          Apellidos
          <input className={inputClass} name="last_name" maxLength={100} defaultValue={contact?.last_name ?? ""} />
        </label>
        <label className={labelClass}>
          Email
          <input className={inputClass} name="email" type="email" maxLength={254} defaultValue={contact?.email ?? ""} />
        </label>
        <label className={labelClass}>
          Teléfono
          <input className={inputClass} name="phone" type="tel" maxLength={40} defaultValue={contact?.phone ?? ""} />
        </label>
        <label className={labelClass}>
          Empresa
          <input className={inputClass} name="company" maxLength={160} defaultValue={contact?.company ?? ""} />
        </label>
        <label className={labelClass}>
          Origen
          <input className={inputClass} name="source" maxLength={100} placeholder="LinkedIn, referido, web..." defaultValue={contact?.source ?? ""} />
        </label>
        <label className={labelClass}>
          Estado
          <select className={inputClass} name="status" defaultValue={contact?.status ?? "new"}>
            <option value="new">Nuevo</option>
            <option value="contacted">Contactado</option>
            <option value="qualified">Cualificado</option>
            <option value="inactive">Inactivo</option>
          </select>
        </label>
      </div>
      <label className={labelClass}>
        Notas
        <textarea className={inputClass} name="notes" rows={5} maxLength={5000} defaultValue={contact?.notes ?? ""} />
      </label>
      <div className="flex flex-wrap gap-3">
        <button className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300" type="submit">
          {submitLabel}
        </button>
        <a className="rounded-lg border border-slate-700 px-5 py-2.5 text-sm text-slate-300 hover:border-slate-500" href="/contacts">
          Cancelar
        </a>
      </div>
    </form>
  );
}
