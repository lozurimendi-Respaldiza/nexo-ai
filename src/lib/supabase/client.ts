import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/database.types";

let browserClient: SupabaseClient<Database> | undefined;

/**
 * Cliente para Client Components.
 * @supabase/ssr mantiene la sesión del navegador sincronizada mediante cookies.
 */
export function createClient(): SupabaseClient<Database> {
  if (browserClient) return browserClient;

  const { url, publishableKey } = getSupabaseEnv();

  browserClient = createBrowserClient<Database>(url, publishableKey);
  return browserClient;
}
