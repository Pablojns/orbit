import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { AUTH_ENABLED } from "@/lib/flags";
import { OWNER_ID } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";
import { runAsUser } from "@/lib/run-as";

// Quem está usando o app nesta requisição.
// AUTH_ENABLED desligado (hoje): sempre o dono do modo teste.
// AUTH_ENABLED ligado: a pessoa que entrou; sem sessão, vai para /login.
const sessionUid = cache(async (): Promise<string> => {
  if (!AUTH_ENABLED) return OWNER_ID;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return data.user.id;
});

// Dentro de uma tarefa agendada (runAs), é a pessoa da vez; senão, quem está na sessão.
export async function uid(): Promise<string> {
  return runAsUser() ?? sessionUid();
}
