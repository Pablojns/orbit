// Assinatura (Rodada 9): 7 dias grátis e depois R$ 29,90 por mês, sem plano grátis.
// Só vale com BILLING_ENABLED ligado.
export const PRICE_CENTS = 2990;
export const TRIAL_DAYS = 7;

export type Subscription = {
  status: "trial" | "active" | "past_due" | "canceled";
  trialEndsAt: string; // ISO
  currentPeriodEnd: string | null; // ISO
};

export type Access =
  | { kind: "trial"; daysLeft: number }
  | { kind: "active"; until: string | null }
  | { kind: "grace"; until: string } // pagamento atrasado: 3 dias de tolerância
  | { kind: "blocked"; reason: "trial_over" | "unpaid" | "canceled" };

const DAY = 86_400_000;
const GRACE_DAYS = 3;

export function accessFor(sub: Subscription | null, now: Date = new Date()): Access {
  if (!sub) return { kind: "trial", daysLeft: TRIAL_DAYS };
  const t = now.getTime();
  if (sub.status === "active") {
    if (!sub.currentPeriodEnd || new Date(sub.currentPeriodEnd).getTime() + GRACE_DAYS * DAY > t)
      return { kind: "active", until: sub.currentPeriodEnd };
    return { kind: "blocked", reason: "unpaid" };
  }
  if (sub.status === "past_due") {
    const end = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).getTime() + GRACE_DAYS * DAY : 0;
    return end > t ? { kind: "grace", until: new Date(end).toISOString() } : { kind: "blocked", reason: "unpaid" };
  }
  if (sub.status === "canceled") {
    // Cancelou: usa até o fim do que já pagou.
    if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd).getTime() > t)
      return { kind: "active", until: sub.currentPeriodEnd };
    return { kind: "blocked", reason: "canceled" };
  }
  const left = Math.ceil((new Date(sub.trialEndsAt).getTime() - t) / DAY);
  return left > 0 ? { kind: "trial", daysLeft: left } : { kind: "blocked", reason: "trial_over" };
}

// Situação da assinatura a partir dos eventos do Asaas (webhook).
export function statusFromAsaasEvent(event: string): Subscription["status"] | null {
  switch (event) {
    case "PAYMENT_CONFIRMED":
    case "PAYMENT_RECEIVED":
      return "active";
    case "PAYMENT_OVERDUE":
      return "past_due";
    case "SUBSCRIPTION_DELETED":
    case "SUBSCRIPTION_INACTIVATED":
      return "canceled";
    default:
      return null;
  }
}
