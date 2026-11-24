import "server-only";
import { accessFor, type Access, type Subscription } from "@/lib/billing";
import { AUTH_ENABLED, BILLING_ENABLED } from "@/lib/flags";
import { createClient } from "@/lib/supabase/server";
import { uid } from "@/lib/user";

// Situação de acesso da pessoa. Com a cobrança desligada, sempre liberado.
export async function getAccess(): Promise<{ access: Access; sub: (Subscription & { providerSubscriptionId: string | null }) | null }> {
  if (!BILLING_ENABLED || !AUTH_ENABLED) return { access: { kind: "active", until: null }, sub: null };
  const me = await uid();
  const supabase = await createClient();
  let { data } = await supabase
    .from("subscriptions")
    .select("status, trial_ends_at, current_period_end, provider_subscription_id")
    .eq("user_id", me)
    .maybeSingle();
  if (!data) {
    // Primeiro acesso: começa os 7 dias grátis.
    await supabase.from("subscriptions").insert({ user_id: me });
    ({ data } = await supabase
      .from("subscriptions")
      .select("status, trial_ends_at, current_period_end, provider_subscription_id")
      .eq("user_id", me)
      .maybeSingle());
  }
  const sub = data
    ? {
        status: data.status as Subscription["status"],
        trialEndsAt: data.trial_ends_at as string,
        currentPeriodEnd: (data.current_period_end as string | null) ?? null,
        providerSubscriptionId: (data.provider_subscription_id as string | null) ?? null,
      }
    : null;
  return { access: accessFor(sub), sub };
}
