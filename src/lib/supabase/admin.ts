import "server-only";
import { createClient } from "@supabase/supabase-js";

// Cliente com a chave de serviço (ignora o RLS). Só para o webhook de cobrança e tarefas do servidor.
// Variável: SUPABASE_SERVICE_ROLE_KEY (valor só na Vercel).
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY não configurada");
  return createClient(url, key, { auth: { persistSession: false } });
}
