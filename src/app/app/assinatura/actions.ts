"use server";

import { redirect } from "next/navigation";
import {
  cancelSubscription,
  createCustomer,
  createSubscription,
  listPayments,
} from "@/lib/asaas";
import { PRICE_CENTS } from "@/lib/billing";
import { BILLING_ENABLED } from "@/lib/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { uid } from "@/lib/user";

export type SubState = { status: "idle" | "error"; message?: string };

// Assinar: cria o cliente e a assinatura no Asaas e leva para a fatura (Pix, cartão ou boleto).
export async function subscribe(
  _prev: SubState,
  fd: FormData,
): Promise<SubState> {
  if (!BILLING_ENABLED)
    return { status: "error", message: "A cobrança ainda não está ligada." };
  const cpf = String(fd.get("cpf") ?? "").replace(/\D/g, "");
  const name = String(fd.get("name") ?? "")
    .trim()
    .slice(0, 80);
  if (cpf.length !== 11 && cpf.length !== 14)
    return { status: "error", message: "Digite um CPF ou CNPJ válido." };
  if (!name) return { status: "error", message: "Digite seu nome completo." };
  const me = await uid();
  const supabase = await createClient();
  const { data: user } = await supabase.auth.getUser();
  const email = user.user?.email ?? "";
  let invoice = "";
  try {
    const customer = await createCustomer({
      name,
      email,
      cpfCnpj: cpf,
      externalReference: me,
    });
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
    const sub = await createSubscription({
      customer: customer.id,
      value: PRICE_CENTS / 100,
      nextDueDate: today,
    });
    await createAdminClient()
      .from("subscriptions")
      .upsert({
        user_id: me,
        provider_customer_id: customer.id,
        provider_subscription_id: sub.id,
        updated_at: new Date().toISOString(),
      });
    const payments = await listPayments(sub.id);
    invoice = payments[0]?.invoiceUrl ?? "";
  } catch {
    return {
      status: "error",
      message:
        "Não foi possível falar com o meio de pagamento agora. Tente de novo.",
    };
  }
  if (invoice) redirect(invoice);
  return {
    status: "error",
    message: "Assinatura criada. A fatura chega no seu e-mail.",
  };
}

// Cancelar: para as próximas cobranças; o acesso vale até o fim do mês já pago.
export async function cancel(): Promise<void> {
  if (!BILLING_ENABLED) return;
  const me = await uid();
  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("provider_subscription_id")
    .eq("user_id", me)
    .maybeSingle();
  if (data?.provider_subscription_id)
    await cancelSubscription(data.provider_subscription_id);
  await admin
    .from("subscriptions")
    .update({ status: "canceled", canceled_at: new Date().toISOString() })
    .eq("user_id", me);
  redirect("/app/assinatura");
}
