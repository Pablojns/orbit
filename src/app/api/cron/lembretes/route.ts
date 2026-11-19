import webpush from "web-push";
import { addDays, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { addMonths } from "@/lib/schedule";
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
  const next = addMonths(today.year, today.month, 1);
  const [a, b] = await Promise.all([
    getAgendaMonth(today.year, today.month, today),
    getAgendaMonth(next.year, next.month, today),
  ]);
  const items = [...a.items, ...b.items].filter((i) => !i.done);
  const todayISO = toISODate(today);
  const hoje = items.filter((i) => i.date === todayISO);
  const amanha = items.filter((i) => i.date === toISODate(tomorrow));

  // Avisos antecipados: "me avise X dias antes" (provas, compromissos…).
  const antes = items.filter((i) => {
    const r = i.event?.remindDays ?? 0;
    return r > 1 && i.date === toISODate(addDays(today, r));
  });

  // Assinaturas: avisa 2 dias antes de cobrar.
  const supabase = await createClient();
  const { data: subsBills } = await supabase
    .from("bills")
    .select("name")
    .eq("user_id", OWNER_ID)
    .eq("is_active", true)
    .eq("is_subscription", true);
  const subNames = new Set((subsBills ?? []).map((x) => x.name));
  const in2 = toISODate(addDays(today, 2));
  const assinaturas = items.filter((i) => i.kind === "fixed_bill" && subNames.has(i.title) && i.date === in2);

  if (!hoje.length && !amanha.length && !antes.length && !assinaturas.length) {
    return Response.json({ sent: 0, reason: "nada para avisar" });
  }

  const parts: string[] = [];
  if (hoje.length) parts.push(`Hoje: ${hoje.map(line).join(", ")}.`);
  if (amanha.length) parts.push(`Amanhã: ${amanha.map(line).join(", ")}.`);
  for (const i of antes) parts.push(`${i.title} em ${i.event!.remindDays} dias.`);
  if (assinaturas.length) parts.push(`Assinatura cobra em 2 dias: ${assinaturas.map(line).join(", ")}.`);
  const total = hoje.length + amanha.length + antes.length + assinaturas.length;
  const payload = JSON.stringify({
    title: hoje.length
      ? `${hoje.length} ${hoje.length === 1 ? "coisa" : "coisas"} para hoje`
      : "Amanhã tem compromisso",
    body: parts.join(" "),
    url: "/app/agenda",
    tag: `orbit-${toISODate(today)}`,
    total,
  });

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
