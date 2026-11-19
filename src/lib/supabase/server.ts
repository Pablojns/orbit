import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

// Cliente para Server Components, Route Handlers e Server Actions.
// Crie um novo a cada requisição (nunca reaproveite entre usuários).
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Supabase não configurado: veja o README.");

  const cookieStore = await cookies();

  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chamado de um Server Component: não pode gravar cookie aqui.
          // Tudo bem, o proxy.ts renova a sessão a cada requisição.
        }
      },
    },
  });
}

// Usuário logado (validado no servidor do Supabase) ou null.
export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
