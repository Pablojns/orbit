import webpush from "web-push";
import { SITE } from "@/lib/site";
import { runDailySummary } from "@/lib/daily-summary";
import { forEachUser } from "@/lib/cron-users";
import { AUTH_ENABLED, BILLING_ENABLED } from "@/lib/flags";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendSystemEmail } from "@/lib/email";

// Lembrete por e-mail: teste grátis que termina entre 1 e 2 dias (o cron roda uma vez por dia).
async function trialEndingEmails() {
  if (!AUTH_ENABLED || !BILLING_ENABLED) return { emails: 0 };
  const admin = createAdminClient();
  const now = Date.now();
  const { data } = await admin
    .from("subscriptions")
    .select("user_id, trial_ends_at")
    .eq("status", "trial")
    .gte("trial_ends_at", new Date(now + 86_400_000).toISOString())
    .lt("trial_ends_at", new Date(now + 2 * 86_400_000).toISOString());
  let emails = 0;
  for (const row of data ?? []) {
    const { data: u } = await admin.auth.admin.getUserById(
      row.user_id as string,
    );
    const date = new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(row.trial_ends_at as string));
    if (
      u.user?.email &&
      (await sendSystemEmail(u.user.email, "trial_ending", { date })).sent
    )
      emails++;
  }
  return { emails };
}

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const trial = await trialEndingEmails();
  if (!pub || !priv)
    return Response.json({ sent: 0, reason: "sem chaves", ...trial });
  webpush.setVapidDetails(SITE.url, pub, priv);

  const daily = await forEachUser(runDailySummary);
  return Response.json({
    daily: daily.length === 1 ? daily[0] : daily,
    ...trial,
  });
}
