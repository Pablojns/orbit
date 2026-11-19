import webpush from "web-push";
import { addDays, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { OWNER_ID } from "@/lib/owner";
import { type CalendarItem, getAgendaMonth } from "@/lib/routine";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function line(it: CalendarItem) {
  const extra = it.time ? ` às ${it.time}` : it.amountCents ? ` (${formatCents(it.amountCents)})` : "";
  return `${it.title}${extra}`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return Response.json({ sent: 0, reason: "sem chaves" });
  webpush.setVapidDetails("https://orbit.gaia.page", pub, priv);

  const today = todayInSaoPaulo();
  const tomorrow = addDays(today, 1);
  const [a, b] = await Promise.all([
    getAgendaMonth(today.year, today.month, today),
    tomorrow.month !== today.month ? getAgendaMonth(tomorrow.year, tomorrow.month, today) : null,
  ]);
  const items = [...a.items, ...(b?.items ?? [])].filter((i) => !i.done);
  const hoje = items.filter((i) => i.date === toISODate(today));
  const amanha = items.filter((i) => i.date === toISODate(tomorrow));
  if (!hoje.length && !amanha.length) return Response.json({ sent: 0, reason: "nada para avisar" });

  const parts: string[] = [];
  if (hoje.length) parts.push(`Hoje: ${hoje.map(line).join(", ")}.`);
  if (amanha.length) parts.push(`Amanhã: ${amanha.map(line).join(", ")}.`);
  const total = hoje.length + amanha.length;
  const payload = JSON.stringify({
    title: hoje.length
      ? `${hoje.length} ${hoje.length === 1 ? "coisa" : "coisas"} para hoje`
      : "Amanhã tem compromisso",
    body: parts.join(" "),
    url: "/app/agenda",
    tag: `orbit-${toISODate(today)}`,
    total,
  });

  const supabase = await createClient();
  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", OWNER_ID);

  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
        TTL: 60 * 60 * 6,
      });
      sent++;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 404 || code === 410) await supabase.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
    }
  }
  return Response.json({ sent, total });
}
