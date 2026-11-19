"use server";

import { createClient } from "@/lib/supabase/server";

export type WaitlistState = { status: "idle" | "joined" | "error"; message?: string };

const SOURCE_PATTERN = /^[a-z0-9_-]{1,80}$/i;

export async function joinWaitlist(_prev: WaitlistState, formData: FormData): Promise<WaitlistState> {
  // Campo escondido: robôs preenchem, pessoas não.
  if (String(formData.get("website") ?? "")) return { status: "joined" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const consent = formData.get("consent") === "on";
  const rawSource = String(formData.get("source") ?? "").trim();
  const source = SOURCE_PATTERN.test(rawSource) ? rawSource : null;

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    return { status: "error", message: "Digite um e-mail válido, como nome@gmail.com." };
  }

  let supabase;
  try {
    supabase = await createClient();
  } catch {
    return { status: "error", message: "A lista de espera ainda não está configurada." };
  }

  const { error } = await supabase
    .from("waitlist")
    .insert({ email, marketing_consent: consent, source });

  // 23505 = e-mail já inscrito. Para quem se inscreve, o resultado é o mesmo.
  if (error && error.code !== "23505") {
    return { status: "error", message: "Não foi possível entrar na lista agora. Tente de novo em instantes." };
  }

  return { status: "joined" };
}
