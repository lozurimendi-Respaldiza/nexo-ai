
"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importContactsAction } from "./import-actions";

type Field =
  | "first_name"
  | "last_name"
  | "email"
  | "phone"
  | "company"
  | "source"
  | "status"
  | "notes";

type ParsedCsv = { headers: string[]; rows: string[][] };

type ImportResult =
  | {
      ok: true;
      imported: number;
      duplicates: number;
      invalid: number;
      total: number;
    }
  | { ok: false; error: string };

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
      } else if (!quoted && line[i] === delimiter) {
        count += 1;
      }
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

  if (quoted) {
    throw new Error("El CSV contiene un campo entrecomillado sin cerrar.");
  }

  if (rows.length < 2) {
    throw new Error(
      "El archivo debe contener una fila de encabezados y al menos un contacto."
    );
  }

  const headers = rows[0].map(
    (value, index) => value.trim() || `Columna ${index + 1}`
  );

  if (rows.slice(1).some((values) => values.length > headers.length)) {
    throw new Error(
      "Hay filas con más columnas que los encabezados. Revisa el formato del CSV."
    );
  }

  const dataRows = rows.slice(1).map((values) =>
    headers.map((_, index) => (values[index] ?? "").trim())
  );

  return { headers, rows: dataRows };
}

function guessField(header: string): Field | "" {
  const value = header
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");

  if (["nombre", "firstname", "first_name", "name"].includes(value)) {
    return "first_name";
  }
  if (
    ["apellidos", "apellido", "lastname", "last_name", "surname"].includes(
      value
    )
  ) {
    return "last_name";
  }
  if (["email", "correo", "correoelectronico", "mail"].includes(value)) {
    return "email";
  }
  if (["telefono", "movil", "celular", "phone", "mobile"].includes(value)) {
    return "phone";
  }
  if (["empresa", "company", "organizacion"].includes(value)) {
    return "company";
  }
  if (["origen", "source", "procedencia"].includes(value)) {
    return "source";
  }
  if (["estado", "status"].includes(value)) return "status";
  if (["notas", "notes", "observaciones"].includes(value)) return "notes";

  return "";
}

const inputClass =
  "nexo-field mt-1 w-full rounded-lg px-3 py-2.5 text-sm transition focus:outline-none focus:ring-2";

const panelClass = "nexo-card rounded-xl p-5";

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

  const validPreviewCount = mappedRows.filter(
    (row) => (row.first_name ?? "").trim() !== ""
  ).length;

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
        setError(
          "El archivo contiene más de 500 filas. Divide la cartera en varios CSV."
        );
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
      setError(
        cause instanceof Error
          ? cause.message
          : "No se pudo leer el archivo CSV."
      );
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
        setResult({
          ok: false,
          error:
            "Se produjo un error inesperado durante la importación. Comprueba la conexión e inténtalo de nuevo.",
        });
      }
    });
  }

  return (
    <section className="mt-7 space-y-6">
      <div className={panelClass}>
        <h2 className="font-semibold">1. Selecciona el archivo</h2>
        <p className="nexo-muted mt-1 text-sm">
          CSV de hasta 2 MB y 500 filas por importación. Se admiten separadores
          coma, punto y coma o tabulador.
        </p>

        <input
          className="nexo-field mt-4 block w-full rounded-lg px-3 py-2 text-sm file:mr-4 file:rounded-lg file:border-0 file:px-4 file:py-2.5 file:font-semibold file:cursor-pointer"
          style={
            {
              "--tw-file-bg": "var(--accent)",
            } as React.CSSProperties
          }
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => handleFile(event.target.files?.[0])}
          disabled={isPending}
        />
      </div>

      {parsed && (
        <>
          <div className={panelClass}>
            <h2 className="font-semibold">2. Relaciona las columnas</h2>
            <p className="nexo-muted mt-1 text-sm">
              Hemos detectado automáticamente algunos encabezados. Revisa el
              mapeo antes de importar.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {FIELDS.map((field) => (
                <label
                  key={field}
                  className="block text-sm font-medium"
                >
                  {FIELD_LABELS[field]}
                  <select
                    className={inputClass}
                    value={mapping[field] ?? ""}
                    onChange={(event) =>
                      setMapping((current) => ({
                        ...current,
                        [field]: event.target.value || undefined,
                      }))
                    }
                  >
                    <option value="">No importar</option>
                    {parsed.headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">3. Vista previa</h2>
              <span className="nexo-muted text-sm">
                {parsed.rows.length} filas · {validPreviewCount} con nombre
              </span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead
                  className="text-xs uppercase"
                  style={{
                    color: "var(--muted)",
                    backgroundColor: "var(--surface-secondary)",
                  }}
                >
                  <tr>
                    <th className="px-3 py-2">Nombre</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Teléfono</th>
                    <th className="px-3 py-2">Empresa</th>
                  </tr>
                </thead>

                <tbody>
                  {mappedRows.slice(0, 5).map((row, index) => (
                    <tr
                      key={index}
                      className="border-t"
                      style={{ borderColor: "var(--line)" }}
                    >
                      <td className="px-3 py-3">
                        {row.first_name || (
                          <span style={{ color: "var(--danger)" }}>
                            Falta nombre
                          </span>
                        )}
                      </td>
                      <td className="nexo-muted px-3 py-3">
                        {row.email || "—"}
                      </td>
                      <td className="nexo-muted px-3 py-3">
                        {row.phone || "—"}
                      </td>
                      <td className="nexo-muted px-3 py-3">
                        {row.company || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {parsed.rows.length > 5 && (
                <p className="nexo-muted mt-2 text-xs">
                  Se muestran las primeras 5 filas.
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={submitImport}
              disabled={
                isPending || !mapping.first_name || validPreviewCount === 0
              }
              className="rounded-lg px-5 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                backgroundColor: "var(--accent)",
                color: "var(--accent-foreground, var(--ink))",
              }}
            >
              {isPending
                ? "Importando..."
                : `Importar ${validPreviewCount} contactos válidos`}
            </button>

            <a
              href="/contacts"
              className="nexo-field rounded-lg px-5 py-3 text-sm transition-colors"
            >
              Cancelar
            </a>
          </div>
        </>
      )}

      {error && (
        <p
          role="alert"
          className="rounded-lg border px-4 py-3 text-sm"
          style={{
            borderColor: "var(--danger)",
            backgroundColor: "var(--danger-soft)",
            color: "var(--danger)",
          }}
        >
          {error}
        </p>
      )}

      {result && (
        <div
          role="status"
          className="rounded-xl border p-5"
          style={{
            borderColor: result.ok ? "var(--success)" : "var(--danger)",
            backgroundColor: result.ok
              ? "var(--success-soft)"
              : "var(--danger-soft)",
            color: result.ok ? "var(--success)" : "var(--danger)",
          }}
        >
          {result.ok ? (
            <>
              <h2 className="font-semibold">Importación procesada</h2>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <ResultMetric label="Importados" value={result.imported} />
                <ResultMetric label="Duplicados" value={result.duplicates} />
                <ResultMetric label="Inválidos" value={result.invalid} />
                <ResultMetric label="Filas totales" value={result.total} />
              </div>

              <a
                href="/contacts"
                className="mt-4 inline-flex rounded-lg px-4 py-2.5 text-sm font-semibold"
                style={{
                  backgroundColor: "var(--accent)",
                  color: "var(--accent-foreground, var(--ink))",
                }}
              >
                Ir a contactos
              </a>
            </>
          ) : (
            <p className="text-sm">{result.error}</p>
          )}
        </div>
      )}

      <p className="nexo-muted text-xs leading-5">
        La importación se limita al espacio de trabajo de tu sesión. Los
        duplicados se detectan por email o teléfono coincidente; no se fusionan
        ni sobrescriben contactos existentes. Las filas sin nombre o con email
        no válido se omiten.
      </p>
    </section>
  );
}

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className="rounded-lg border p-3"
      style={{
        borderColor: "var(--line)",
        backgroundColor: "var(--surface)",
        color: "var(--ink)",
      }}
    >
      <p className="nexo-muted text-xs">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
