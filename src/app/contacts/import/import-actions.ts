"use server";

import { revalidatePath } from "next/cache";
import { getWorkspaceContext } from "@/lib/workspace-context";

const CONTACT_STATUSES = ["new", "contacted", "qualified", "inactive"] as const;
const MAX_ROWS = 500;

type ImportRow = {
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  phone?: unknown;
  company?: unknown;
  source?: unknown;
  status?: unknown;
  notes?: unknown;
};

type CleanContact = {
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string | null;
  status: (typeof CONTACT_STATUSES)[number];
  notes: string | null;
};

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizePhone(value: string): string {
  return value.replace(/[\s().-]/g, "");
}

export async function importContactsAction(input: unknown) {
  if (!Array.isArray(input) || input.length === 0 || input.length > MAX_ROWS) {
    return { ok: false as const, error: `Selecciona entre 1 y ${MAX_ROWS} contactos por importación.` };
  }

  const valid: CleanContact[] = [];
  let invalid = 0;

  for (const candidate of input as unknown[]) {
    if (!candidate || typeof candidate !== "object") {
      invalid += 1;
      continue;
    }
    const item = candidate as ImportRow;
    const first_name = cleanText(item.first_name, 100);
    const last_name = cleanText(item.last_name, 100) || null;
    const emailValue = cleanText(item.email, 254).toLowerCase();
    const phone = cleanText(item.phone, 40) || null;
    const company = cleanText(item.company, 160) || null;
    const source = cleanText(item.source, 100) || null;
    const notes = cleanText(item.notes, 5000) || null;
    const statusValue = cleanText(item.status, 30).toLowerCase();
    const statusAliases: Record<string, (typeof CONTACT_STATUSES)[number]> = {
      nuevo: "new",
      new: "new",
      contactado: "contacted",
      contacted: "contacted",
      cualificado: "qualified",
      qualified: "qualified",
      inactivo: "inactive",
      inactive: "inactive",
    };
    const status = statusAliases[statusValue] ?? "new";

    if (
      !first_name ||
      (emailValue !== "" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue))
    ) {
      invalid += 1;
      continue;
    }

    valid.push({
      first_name,
      last_name,
      email: emailValue || null,
      phone,
      company,
      source,
      status,
      notes,
    });
  }

  if (valid.length === 0) {
    return { ok: true as const, imported: 0, duplicates: 0, invalid, total: input.length };
  }

  const { supabase, user, workspaceId } = await getWorkspaceContext();

  const emailValues = [...new Set(valid.flatMap((row) => row.email ? [row.email] : []))];
  const phoneValues = [...new Set(valid.flatMap((row) => row.phone ? [row.phone] : []))];

  const existingEmails = new Set<string>();
  const existingPhones = new Set<string>();

  for (let index = 0; index < emailValues.length; index += 100) {
    const batch = emailValues.slice(index, index + 100);
    const { data, error } = await supabase
      .from("contacts")
      .select("email")
      .eq("workspace_id", workspaceId)
      .in("email", batch);
    if (error) {
      return { ok: false as const, error: "No se pudieron comprobar los duplicados. No se ha importado ningún contacto." };
    }
    for (const row of data ?? []) {
      if (row.email) existingEmails.add(row.email.toLowerCase());
    }
  }

  for (let index = 0; index < phoneValues.length; index += 100) {
    const batch = phoneValues.slice(index, index + 100);
    const { data, error } = await supabase
      .from("contacts")
      .select("phone")
      .eq("workspace_id", workspaceId)
      .in("phone", batch);
    if (error) {
      return { ok: false as const, error: "No se pudieron comprobar los duplicados. No se ha importado ningún contacto." };
    }
    for (const row of data ?? []) {
      if (row.phone) existingPhones.add(row.phone);
    }
  }

  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();
  const toInsert: CleanContact[] = [];
  let duplicates = 0;

  for (const row of valid) {
    const emailKey = row.email ?? "";
    const phoneKey = row.phone ? normalizePhone(row.phone) : "";
    const duplicate =
      (emailKey !== "" && (existingEmails.has(emailKey) || seenEmails.has(emailKey))) ||
      (phoneKey !== "" && seenPhones.has(phoneKey)) ||
      (row.phone !== null && existingPhones.has(row.phone));

    if (duplicate) {
      duplicates += 1;
      continue;
    }

    if (emailKey) seenEmails.add(emailKey);
    if (phoneKey) seenPhones.add(phoneKey);
    toInsert.push(row);
  }

  if (toInsert.length > 0) {
    const { error } = await supabase.from("contacts").insert(
      toInsert.map((row) => ({
        ...row,
        workspace_id: workspaceId,
        created_by: user.id,
      }))
    );

    if (error) {
      return {
        ok: false as const,
        error: "Supabase no pudo guardar los contactos. No se ha confirmado la importación. Revisa los datos e inténtalo de nuevo.",
      };
    }
  }

  revalidatePath("/contacts");
  revalidatePath("/dashboard");

  return {
    ok: true as const,
    imported: toInsert.length,
    duplicates,
    invalid,
    total: input.length,
  };
}
