import "server-only";

// Integração com o Asaas (Pix, cartão e boleto, assinatura mensal).
// Só é usada com BILLING_ENABLED. Variáveis (valores só na Vercel):
// ASAAS_API_KEY, ASAAS_ENV ("sandbox" ou "production"), ASAAS_WEBHOOK_TOKEN.
const BASE =
  process.env.ASAAS_ENV === "production" ? "https://api.asaas.com/v3" : "https://api-sandbox.asaas.com/v3";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const key = process.env.ASAAS_API_KEY;
  if (!key) throw new Error("ASAAS_API_KEY não configurada");
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "content-type": "application/json", access_token: key, "user-agent": "dimeta", ...(init.headers ?? {}) },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Asaas ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export async function createCustomer(input: { name: string; email: string; cpfCnpj: string; externalReference: string }) {
  return call<{ id: string }>("/customers", { method: "POST", body: JSON.stringify(input) });
}

// billingType UNDEFINED: a pessoa escolhe Pix, cartão ou boleto na fatura.
export async function createSubscription(input: { customer: string; value: number; nextDueDate: string }) {
  return call<{ id: string }>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({ ...input, billingType: "UNDEFINED", cycle: "MONTHLY", description: "Dimeta — assinatura mensal" }),
  });
}

export type AsaasPayment = {
  id: string;
  status: string;
  value: number;
  dueDate: string;
  paymentDate: string | null;
  invoiceUrl: string;
  transactionReceiptUrl: string | null;
};

export async function listPayments(subscriptionId: string) {
  const r = await call<{ data: AsaasPayment[] }>(`/subscriptions/${subscriptionId}/payments`);
  return r.data;
}

export async function cancelSubscription(subscriptionId: string) {
  return call<{ deleted: boolean }>(`/subscriptions/${subscriptionId}`, { method: "DELETE" });
}
