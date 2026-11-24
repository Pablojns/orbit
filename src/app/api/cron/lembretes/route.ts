import webpush from "web-push";
import { runDailySummary } from "@/lib/daily-summary";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Não autorizado", { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return Response.json({ sent: 0, reason: "sem chaves" });
  webpush.setVapidDetails("https://dimeta.vercel.app", pub, priv);

  return Response.json(await runDailySummary());
}
