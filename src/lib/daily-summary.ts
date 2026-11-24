import "server-only";
import webpush from "web-push";
import { addDays, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { addMonths } from "@/lib/schedule";
import { formatCents } from "@/lib/money";
import { OWNER_ID } from "@/lib/owner";
import { type CalendarItem, getAgendaMonth } from "@/lib/routine";
import { createClient } from "@/lib/supabase/server";

function line(it: CalendarItem) {
  const extra = it.time ? ` às ${it.time}` : it.amountCents ? ` (${formatCents(it.amountCents)})` : "";
  return `${it.title}${extra}`;
}

function hourInSaoPaulo(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat("pt-BR", { hour: "numeric", hourCycle: "h23", timeZone: "America/Sao_Paulo" }).format(now),
  );
}

// Resumo do dia por notificação. Chamado pela Vercel (8h) e pelo agendamento de 15 em 15 minutos;
// só manda na hora escolhida no Perfil e uma vez por dia (profiles.last_daily_sent).
// webpush já deve estar configurado por quem chama.
export async function runDailySummary(): Promise<{ sent: number; reason?: string; total?: number }> {
  const supabase = await createClient();
  const today = todayInSaoPaulo();
  const todayISO = toISODate(today);
  const { data: prefs } = await supabase
    .from("profiles")
    .select("notify_daily, daily_hour, last_daily_sent")
    .eq("id", OWNER_ID)
    .maybeSingle();
  if (prefs && !prefs.notify_daily) return { sent: 0, reason: "resumo desligado" };
  const hour = prefs?.daily_hour ?? 8;
  if (hourInSaoPaulo() < hour) return { sent: 0, reason: "ainda não é a hora" };
  if (prefs?.last_daily_sent === todayISO) return { sent: 0, reason: "já enviado hoje" };
  // Marca antes de enviar: se duas execuções se cruzarem, só uma manda.
  const { data: claimed } = await supabase
    .from("profiles")
    .update({ last_daily_sent: todayISO })
    .eq("id", OWNER_ID)
    .or(`last_daily_sent.is.null,last_daily_sent.neq.${todayISO}`)
    .select("id");
  if (prefs && !claimed?.length) return { sent: 0, reason: "já enviado hoje" };
  // Primeira execução depois de ligar esta função: só marca o dia, para não repetir o resumo
  // que a versão anterior já mandou de manhã.
  if (prefs && prefs.last_daily_sent === null) return { sent: 0, reason: "primeira execução" };

  const tomorrow = addDays(today, 1);
  const next = addMonths(today.year, today.month, 1);
  const [a, b] = await Promise.all([
    getAgendaMonth(today.year, today.month, today),
    getAgendaMonth(next.year, next.month, today),
  ]);
  const items = [...a.items, ...b.items].filter((i) => !i.done);
  const hoje = items.filter((i) => i.date === todayISO);
  const amanha = items.filter((i) => i.date === toISODate(tomorrow));

  // Avisos antecipados: "me avise X dias antes" (provas, compromissos…).
  const antes = items.filter((i) => {
    const r = i.event?.remindDays ?? 0;
    return r > 1 && i.date === toISODate(addDays(today, r));
  });

  // Assinaturas: avisa 2 dias antes de cobrar.
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
    return { sent: 0, reason: "nada para avisar" };
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
  return { sent, total };
}
