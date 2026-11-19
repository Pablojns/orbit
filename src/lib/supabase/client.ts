import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./env";

// Cliente para usar em componentes "use client".
export function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase não configurado: veja o README.");
  return createBrowserClient(env.url, env.key);
}
