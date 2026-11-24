import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";

export type Profile = {
  id: string;
  displayName: string | null;
  cycleStartDay: number;
  onboarded: boolean;
  tutorialDone: boolean;
  hideStudies: boolean;
  hideHabits: boolean;
};

// Camada de acesso a dados. No modo teste (sem login), sempre lê o perfil do dono.
export async function requireProfile(): Promise<Profile> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("display_name, cycle_start_day, onboarded_at, tutorial_done_at, hide_studies, hide_habits")
    .eq("id", OWNER_ID)
    .maybeSingle();

  return {
    id: OWNER_ID,
    displayName: data?.display_name ?? null,
    cycleStartDay: data?.cycle_start_day ?? 1,
    onboarded: Boolean(data?.onboarded_at),
    tutorialDone: Boolean(data?.tutorial_done_at),
    hideStudies: Boolean(data?.hide_studies),
    hideHabits: Boolean(data?.hide_habits),
  };
}
