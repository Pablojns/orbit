import webpush from "web-push";
import { OWNER_ID } from "@/lib/owner";
import { createClient } from "@/lib/supabase/server";
import { runDailySummary } from "@/lib/daily-summary";

export const dynamic = "force-dynamic";

// Roda a cada 15 minutos (agendado no banco). Avisa 3 horas antes de cada
// compromisso que tem hora marcada, uma única vez por compromisso.
const HOURS_BEFORE = 3;

export async function GET(request: Request) {
  const secret = process.env.REMINDER_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return Response.json({ sent: 0, reason: "sem chaves" });
  webpush.setVapidDetails("https://dimeta.vercel.app", pub, priv);

  // O resumo do dia também passa por aqui, para respeitar a hora escolhida no Perfil.
  const daily = await runDailySummary();
  const supabase = await createClient();
  const { data: prefs } = await supabase
    .from("profiles")
    .select("notify_hour")
    .eq("id", OWNER_ID)
    .maybeSingle();
  if (prefs && !prefs.notify_hour)
    return Response.json({
      sent: 0,
      reason: "aviso de 3 horas desligado",
      daily,
    });
  const now = new Date();
  const limit = new Date(now.getTime() + HOURS_BEFORE * 3_600_000);
  const { data: events } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .eq("user_id", OWNER_ID)
    .eq("all_day", false)
    .is("done_at", null)
    .gt("starts_at", now.toISOString())
    .lte("starts_at", limit.toISOString());
  if (!events?.length)
    return Response.json({ sent: 0, reason: "nada nas próximas horas" });

  const { data: logged } = await supabase
    .from("reminder_log")
    .select("event_id")
    .eq("kind", "3h")
    .in(
      "event_id",
      events.map((e) => e.id),
    );
  const done = new Set((logged ?? []).map((l) => l.event_id));
  const due = events.filter((e) => !done.has(e.id));
  if (!due.length) return Response.json({ sent: 0, reason: "já avisado" });

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .eq("user_id", OWNER_ID);

  let sent = 0;
  for (const ev of due) {
    const time = new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Sao_Paulo",
    }).format(new Date(ev.starts_at));
    const mins = Math.round(
      (new Date(ev.starts_at).getTime() - now.getTime()) / 60_000,
    );
    const falta =
      mins >= 90 ? `em ${Math.round(mins / 60)} horas` : `em ${mins} minutos`;
    const payload = JSON.stringify({
      title: `${ev.title} ${falta}`,
      body: `Hoje às ${time}.`,
      url: "/app/agenda",
      tag: `dimeta-3h-${ev.id}`,
    });
    // Registra antes de enviar: se duas execuções se cruzarem, só uma avisa.
    const { error } = await supabase
      .from("reminder_log")
      .insert({ event_id: ev.id, kind: "3h" });
    if (error) continue;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          {
            TTL: 60 * 60,
          },
        );
        sent++;
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410)
          await supabase
            .from("push_subscriptions")
            .delete()
            .eq("endpoint", s.endpoint);
      }
    }
  }
  return Response.json({ sent, due: due.length });
}
