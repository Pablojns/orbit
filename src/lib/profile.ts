import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";

export type Profile = {
  id: string;
  displayName: string | null;
  cycleStartDay: number;
};

// Camada de acesso a dados. No modo teste (sem login), sempre lê o perfil do dono.
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, cycle_start_day")
    .eq("id", OWNER_ID)
    .maybeSingle();

  return {
    id: OWNER_ID,
    displayName: data?.display_name ?? null,
    cycleStartDay: data?.cycle_start_day ?? 1,
  };
}
