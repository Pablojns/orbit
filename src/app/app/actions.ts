"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { parseToCents } from "@/lib/money";

export type MovementFormState = { status: "idle" | "saved" | "error"; message?: string };

const PAYMENT_METHODS = new Set(["cash", "debit", "pix", "transfer", "other"]);
const UUID = /^[0-9a-f-]{36}$/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function addMovement(_prev: MovementFormState, formData: FormData): Promise<MovementFormState> {
  const type = String(formData.get("type"));
  const amount = parseToCents(String(formData.get("amount") ?? ""));
  const categoryId = String(formData.get("category_id") ?? "");
  const occurredOn = String(formData.get("occurred_on") ?? "");
  const paymentMethod = String(formData.get("payment_method") ?? "");
  const description = String(formData.get("description") ?? "")
    .trim()
    .slice(0, 120);

  if (type !== "expense" && type !== "income") return { status: "error", message: "Escolha gasto ou entrada." };
  if (!amount || amount <= 0 || amount > 100_000_000_00) {
    return { status: "error", message: "Digite um valor, como 25,90." };
  }
  if (!ISO_DATE.test(occurredOn)) return { status: "error", message: "Escolha a data." };

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    user_id: OWNER_ID,
    type,
    amount_cents: amount,
    occurred_on: occurredOn,
    category_id: UUID.test(categoryId) ? categoryId : null,
    payment_method: type === "expense" && PAYMENT_METHODS.has(paymentMethod) ? paymentMethod : null,
    description: description || null,
  });

  if (error) return { status: "error", message: "Não foi possível salvar agora. Tente de novo." };

  revalidatePath("/app", "layout");
  return { status: "saved", message: type === "expense" ? "Gasto salvo." : "Entrada salva." };
}

export async function deleteMovement(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return;
  const supabase = await createClient();
  await supabase.from("transactions").delete().eq("id", id).eq("user_id", OWNER_ID);
  revalidatePath("/app", "layout");
}
