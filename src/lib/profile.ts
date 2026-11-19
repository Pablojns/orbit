import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string | null;
  displayName: string | null;
  cycleStartDay: number;
};

// Camada de acesso a dados: toda tela que precisa do usuário passa por aqui.
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data } = await supabase
    .from("profiles")
    .select("display_name, cycle_start_day")
    .eq("id", auth.user.id)
    .maybeSingle();

  return {
    id: auth.user.id,
    email: auth.user.email ?? null,
    displayName: data?.display_name ?? null,
    cycleStartDay: data?.cycle_start_day ?? 1,
  };
}
