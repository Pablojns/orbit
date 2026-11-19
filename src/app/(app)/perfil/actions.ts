"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ProfileFormState = { status: "idle" | "saved" | "error"; message?: string };

export async function saveProfile(_prev: ProfileFormState, formData: FormData): Promise<ProfileFormState> {
  const displayName = String(formData.get("display_name") ?? "").trim().slice(0, 60);
  const day = Number(formData.get("cycle_start_day"));

  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return { status: "error", message: "Escolha um dia entre 1 e 31." };
  }

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { status: "error", message: "Sua sessão expirou. Entre de novo." };

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: displayName || null, cycle_start_day: day })
    .eq("id", auth.user.id);

  if (error) {
    return {
      status: "error",
      message: "Não foi possível salvar. Confira se o banco foi configurado (README, passo 2).",
    };
  }

  revalidatePath("/", "layout");
  return { status: "saved", message: "Perfil salvo." };
}
