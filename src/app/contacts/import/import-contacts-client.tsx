"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importContactsAction } from "./import-actions";

type Field = "first_name" | "last_name" | "email" | "phone" | "company" | "source" | "status" | "notes";
type ParsedCsv = { headers: string[]; rows: string[][] };
type ImportResult = { ok: true; imported: number; duplicates: number; invalid: number; total: number } | { ok: false; error: string };

const FIELD_LABELS: Record<Field, string> = {
  first_name: "Nombre (obligatorio)",
  last_name: "Apellidos",
  email: "Email",
  phone: "Teléfono",
  company: "Empresa",
  source: "Origen",
  status: "Estado",
  notes: "Notas",
};

const FIELDS = Object.keys(FIELD_LABELS) as Field[];

function detectDelimiter(line: string) {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = -1;
  for (const delimiter of candidates) {
    let count = 0;
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      if (line[i] === '"') {
        if (quoted && line[i + 1] === '"') i += 1;
        else quoted = !quoted;
      } else if (!quoted && line[i] === delimiter) count += 1;
    }
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^\uFEFF/, "");
  const firstLine = clean.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = detectDelimiter(firstLine);
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];
    if (char === '"') {
      if (quoted && clean[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (!quoted && char === delimiter) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (char === "\n" || char === "\r")) {
      if (char === "\r" && clean[i + 1] === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  if (quoted) throw new Error("El CSV contiene un campo entrecomillado sin cerrar.");
  if (rows.length < 2) throw new Error("El archivo debe contener una fila de encabezados y al menos un contacto.");

  const headers = rows[0].map((value, index) => value.trim() || `Columna ${index + 1}`);
  if (rows.slice(1).some((values) => values.length > headers.length)) {
    throw new Error("Hay filas con más columnas que los encabezados. Revisa el formato del CSV.");
  }
  const dataRows = rows.slice(1).map((values) => headers.map((_, index) => (values[index] ?? "").trim()));
  return { headers, rows: dataRows };
}

function guessField(header: string): Field | "" {
  const value = header.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  if (["nombre", "firstname", "first_name", "name"].includes(value)) return "first_name";
  if (["apellidos", "apellido", "lastname", "last_name", "surname"].includes(value)) return "last_name";
  if (["email", "correo", "correoelectronico", "mail"].includes(value)) return "email";
  if (["telefono", "movil", "celular", "phone", "mobile"].includes(value)) return "phone";
  if (["empresa", "company", "organizacion"].includes(value)) return "company";
  if (["origen", "source", "procedencia"].includes(value)) return "source";
  if (["estado", "status"].includes(value)) return "status";
  if (["notas", "notes", "observaciones"].includes(value)) return "notes";
  return "";
}

const inputClass = "mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400";

export function ImportContactsClient() {
  const router = useRouter();
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();

  const mappedRows = useMemo(() => {
    if (!parsed) return [];
    return parsed.rows.map((values) => {
      const record: Record<string, string> = {};
      for (const field of FIELDS) {
        const header = mapping[field];
        if (!header) continue;
        const index = parsed.headers.indexOf(header);
        if (index >= 0) record[field] = values[index] ?? "";
      }
      return record;
    });
  }, [parsed, mapping]);

  const validPreviewCount = mappedRows.filter((row) => (row.first_name ?? "").trim() !== "").length;

  async function handleFile(file?: File) {
    setError("");
    setResult(null);
    setParsed(null);
    setMapping({});
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Selecciona un archivo con extensión .csv.");
      return;
    }
    if (file.size > 500 * 1024) {
      setError("El archivo supera el límite de 500 KB.");
      return;
    }
    try {
      const content = await file.text();
      const csv = parseCsv(content);
      if (csv.rows.length > 500) {
        setError("El archivo contiene más de 500 filas. Divide la cartera en varios CSV.");
        return;
      }
      setParsed(csv);
      const next: Partial<Record<Field, string>> = {};
      for (const header of csv.headers) {
        const field = guessField(header);
        if (field && !next[field]) next[field] = header;
      }
      setMapping(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "No se pudo leer el archivo CSV.");
    }
  }

  function submitImport() {
    if (!parsed || !mapping.first_name) {
      setError("Asigna una columna al campo Nombre antes de continuar.");
      return;
    }
    if (validPreviewCount === 0) {
      setError("No hay filas con nombre válido para importar.");
      return;
    }
    setError("");
    setResult(null);
    startTransition(async () => {
      try {
        const response = await importContactsAction(mappedRows);
        setResult(response);
        if (response.ok) router.refresh();
      } catch {
        setResult({ ok: false, error: "Se produjo un error inesperado durante la importación. Comprueba la conexión e inténtalo de nuevo." });
      }
    });
  }

  return (
    <section className="mt-7 space-y-6">
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <h2 className="font-semibold">1. Selecciona el archivo</h2>
        <p className="mt-1 text-sm text-slate-400">CSV de hasta 2 MB y 500 filas por importación. Se admiten separadores coma, punto y coma o tabulador.</p>
        <input
          className="mt-4 block w-full text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-4 file:py-2.5 file:font-semibold file:text-slate-950 hover:file:bg-cyan-300"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => handleFile(event.target.files?.[0])}
          disabled={isPending}
        />
      </div>

      {parsed && (
        <>
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h2 className="font-semibold">2. Relaciona las columnas</h2>
            <p className="mt-1 text-sm text-slate-400">Hemos detectado automáticamente algunos encabezados. Revisa el mapeo antes de importar.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <label key={field} className="block text-sm text-slate-300">
                  {FIELD_LABELS[field]}
                  <select
                    className={inputClass}
                    value={mapping[field] ?? ""}
                    onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value || undefined }))}
                  >
                    <option value="">No importar</option>
                    {parsed.headers.map((header) => <option key={header} value={header}>{header}</option>)}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">3. Vista previa</h2>
              <span className="text-sm text-slate-400">{parsed.rows.length} filas · {validPreviewCount} con nombre</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr><th className="px-3 py-2">Nombre</th><th className="px-3 py-2">Email</th><th className="px-3 py-2">Teléfono</th><th className="px-3 py-2">Empresa</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {mappedRows.slice(0, 5).map((row, index) => (
                    <tr key={index}>
                      <td className="px-3 py-3">{row.first_name || <span className="text-rose-300">Falta nombre</span>}</td>
                      <td className="px-3 py-3 text-slate-400">{row.email || "—"}</td>
                      <td className="px-3 py-3 text-slate-400">{row.phone || "—"}</td>
                      <td className="px-3 py-3 text-slate-400">{row.company || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {parsed.rows.length > 5 && <p className="mt-2 text-xs text-slate-500">Se muestran las primeras 5 filas.</p>}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submitImport}
              disabled={isPending || !mapping.first_name || validPreviewCount === 0}
              className="rounded-lg bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? "Importando..." : `Importar ${validPreviewCount} contactos válidos`}
            </button>
            <a href="/contacts" className="rounded-lg border border-slate-700 px-5 py-3 text-sm text-slate-300 hover:border-slate-500">Cancelar</a>
          </div>
        </>
      )}

      {error && <p role="alert" className="rounded-lg border border-rose-900 bg-rose-950/30 px-4 py-3 text-sm text-rose-300">{error}</p>}

      {result && (
        <div role="status" className={`rounded-xl border p-5 ${result.ok ? "border-emerald-900 bg-emerald-950/20" : "border-rose-900 bg-rose-950/20"}`}>
          {result.ok ? (
            <>
              <h2 className="font-semibold text-emerald-300">Importación procesada</h2>
              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ResultMetric label="Importados" value={result.imported} />
                <ResultMetric label="Duplicados" value={result.duplicates} />
                <ResultMetric label="Inválidos" value={result.invalid} />
                <ResultMetric label="Filas totales" value={result.total} />
              </div>
              <a href="/contacts" className="mt-4 inline-flex rounded-lg bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950">Ir a contactos</a>
            </>
          ) : <p className="text-sm text-rose-300">{result.error}</p>}
        </div>
      )}

      <p className="text-xs leading-5 text-slate-500">
        La importación se limita al espacio de trabajo de tu sesión. Los duplicados se detectan por email o teléfono coincidente; no se fusionan ni sobrescriben contactos existentes. Las filas sin nombre o con email no válido se omiten.
      </p>
    </section>
  );
}

function ResultMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
