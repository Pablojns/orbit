import { BILLING_ENABLED } from "@/lib/flags";
import { statusFromAsaasEvent } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail } from "@/lib/email";
import type { EmailKind } from "@/lib/email-templates";

export const dynamic = "force-dynamic";

// O Asaas avisa aqui quando um pagamento é confirmado, atrasa ou a assinatura é cancelada.
export async function POST(request: Request) {
  if (!BILLING_ENABLED)
    return new Response("Cobrança desligada", { status: 404 });
  const token = process.env.ASAAS_WEBHOOK_TOKEN;
  if (!token || request.headers.get("asaas-access-token") !== token)
    return new Response("Não autorizado", { status: 401 });

  const body = (await request.json()) as {
    event: string;
    payment?: { subscription?: string; dueDate?: string };
    subscription?: { id?: string };
  };
  const status = statusFromAsaasEvent(body.event);
  const subId = body.payment?.subscription ?? body.subscription?.id;
  if (!status || !subId)
    return Response.json({ ok: true, ignored: body.event });

  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "active" && body.payment?.dueDate) {
    const end = new Date(`${body.payment.dueDate}T12:00:00-03:00`);
    end.setMonth(end.getMonth() + 1);
    patch.current_period_end = end.toISOString();
  }
  if (status === "canceled") patch.canceled_at = new Date().toISOString();
  const admin = createAdminClient();
  const { data: rows, error } = await admin
    .from("subscriptions")
    .update(patch)
    .eq("provider_subscription_id", subId)
    .select("user_id");
  if (error) return new Response("Erro ao salvar", { status: 500 });

  // E-mail de cobrança para a pessoa (não bloqueia a resposta ao Asaas se falhar).
  const kind: EmailKind | null =
    status === "active"
      ? "payment_ok"
      : status === "past_due"
        ? "payment_late"
        : status === "canceled"
          ? "canceled"
          : null;
  const userId = rows?.[0]?.user_id as string | undefined;
  if (kind && userId) {
    const { data: u } = await admin.auth.admin.getUserById(userId);
    if (u.user?.email) await sendSystemEmail(u.user.email, kind);
  }
  return Response.json({ ok: true });
}
