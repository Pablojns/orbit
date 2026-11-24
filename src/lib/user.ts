import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { AUTH_ENABLED } from "@/lib/flags";
import { OWNER_ID } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";

// Quem está usando o app nesta requisição.
// AUTH_ENABLED desligado (hoje): sempre o dono do modo teste.
// AUTH_ENABLED ligado: a pessoa que entrou; sem sessão, vai para /login.
export const uid = cache(async (): Promise<string> => {
  if (!AUTH_ENABLED) return OWNER_ID;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user.id;
});
