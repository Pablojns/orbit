// Lê as variáveis públicas do Supabase. Aceita a chave nova (publishable)
// ou a antiga (anon) — as duas são públicas e seguras no navegador,
// porque a proteção real dos dados é feita pelo Row Level Security.
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;
  return { url, key };
}
