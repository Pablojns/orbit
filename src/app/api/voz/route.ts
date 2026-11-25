import { createClient } from "@/lib/supabase/server";
import { uid } from "@/lib/user";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Voz (Rodada 14): o navegador grava a fala (detector de voz) e manda o áudio aqui.
// A transcrição é feita pela Groq (Whisper) no servidor; a chave nunca vai para o navegador.
const MODEL = "whisper-large-v3-turbo";
const MAX_BYTES = 1_500_000; // ~45 s de áudio 16 kHz; comandos têm poucos segundos
const BASE_WORDS = ["Dimeta", "pix", "débito", "crédito", "iFood", "Uber", "99", "Inter", "Estatística"];

export async function POST(request: Request) {
  const t0 = Date.now();
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "sem-chave" }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof Blob) || audio.size < 1000) return Response.json({ error: "sem-audio" }, { status: 400 });
  if (audio.size > MAX_BYTES) return Response.json({ error: "audio-grande" }, { status: 413 });
  const wake = form?.get("modo") === "chamada";
  const sent = String(form?.get("palavras") ?? "").trim(); // o pop-up já manda as palavras da pessoa

  // Palavras do app e da pessoa ajudam o Whisper a acertar nomes (categorias, cartões, matérias).
  let words = BASE_WORDS;
  const tPrompt = Date.now();
  if (!wake && sent) {
    words = [...new Set([...BASE_WORDS, ...sent.split("|").map((w) => w.trim().slice(0, 40)).filter(Boolean)])].slice(0, 60);
    await uid();
  } else if (!wake) {
    try {
      const supabase = await createClient();
      const user = await uid();
      const [c, k, m] = await Promise.all([
        supabase.from("categories").select("name").eq("user_id", user).eq("is_archived", false),
        supabase.from("credit_cards").select("name").eq("user_id", user).eq("is_archived", false),
        supabase.from("subjects").select("name").eq("user_id", user),
      ]);
      const mine = [...(c.data ?? []), ...(k.data ?? []), ...(m.data ?? [])].map((r) => String(r.name));
      words = [...new Set([...BASE_WORDS, ...mine])].slice(0, 60);
    } catch {
      /* segue só com as palavras do app */
    }
  } else {
    await uid(); // garante que é alguém do app
  }
  const promptMs = Date.now() - tPrompt;

  const body = new FormData();
  body.set("file", audio, "fala.wav");
  body.set("model", MODEL);
  body.set("language", "pt");
  body.set("temperature", "0");
  body.set("response_format", "json");
  body.set("prompt", wake ? "Dimeta." : `${words.join(", ")}.`);

  const tGroq = Date.now();
  try {
    const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body,
      signal: AbortSignal.timeout(10_000),
    });
    if (res.status === 429) return Response.json({ error: "ocupado" }, { status: 429 });
    if (!res.ok) return Response.json({ error: "falhou", status: res.status }, { status: 502 });
    const data = (await res.json()) as { text?: string };
    return Response.json({
      text: (data.text ?? "").trim(),
      ms: { palavras: promptMs, whisper: Date.now() - tGroq, total: Date.now() - t0 },
    });
  } catch {
    return Response.json({ error: "falhou" }, { status: 502 });
  }
}

// "Acorda" a função antes da primeira fala (o pop-up chama ao abrir).
export async function GET() {
  return new Response(null, { status: 204 });
}
