// Interpreta uma frase livre com IA (Groq, plano gratuito). O app nunca deixa a IA
// fazer contas: ela só diz O QUE a pessoa quis registrar. Se a IA falhar ou estourar
// o limite, quem chama volta para as regras locais.
import { type CalendarDate, toISODate } from "./dates";

export type AiIntent =
  | {
      intent: "expense" | "income";
      amountCents: number;
      method: "pix" | "debit" | "credit" | "cash" | "transfer";
      cardName: string | null;
      installments: number;
      categoryName: string | null;
      description: string;
      date: string | null;
    }
  | {
      intent: "event";
      kind: "exam" | "deadline" | "appointment" | "other";
      title: string;
      date: string;
      time: string | null;
    }
  | { intent: "question"; question: string }
  | { intent: "unclear"; ask: string };

const WEEK = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];
export const AI_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

function systemPrompt(
  today: CalendarDate,
  categories: string[],
  cards: string[],
) {
  const iso = toISODate(today);
  const wd =
    WEEK[
      new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay()
    ];
  const days = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(Date.UTC(today.year, today.month - 1, today.day + i));
    const label = i === 0 ? "hoje" : i === 1 ? "amanhã" : WEEK[d.getUTCDay()];
    return `${label} = ${d.toISOString().slice(0, 10)}`;
  }).join("; ");
  return `Você interpreta frases curtas de um app brasileiro de organização (dinheiro + agenda).
Hoje é ${wd}, ${iso} (fuso de São Paulo). Responda SOMENTE com um JSON.
Calendário dos próximos dias (use exatamente estas datas): ${days}.

Decida a intenção:
- "expense": a pessoa gastou ou pagou algo (ex.: "ifood 15", "mercado 45 pix", "paguei a luz 120", "uber 18 nubank").
- "income": a pessoa recebeu dinheiro (ex.: "salário 3200", "recebi 200 do freela").
- "event": um compromisso, prova, entrega, consulta, reunião ou lembrete com data (ex.: "prova quarta 15 hrs", "dentista amanhã 14h").
- "question": a pessoa está perguntando algo (ex.: "quanto posso gastar hoje?", "o que tenho amanhã?").
- "unclear": quando der para entender das duas formas (ex.: "dentista 150 sexta" pode ser gasto ou consulta) ou faltar informação essencial.

Regras importantes:
- Número seguido de h, hs, hrs, horas, ou "às N", é HORA, nunca dinheiro.
- Nome de loja/app de gasto (ifood, uber, 99, mercado, farmácia, posto) com número é gasto.
- "prova", "entrega", "trabalho da facul", "reunião", "consulta" com dia ou hora é evento.
- Dias da semana referem-se à próxima ocorrência a partir de hoje (o próprio dia de hoje conta).
- "estudar para X" é evento com event_kind "other" (título "Estudar para X"), não prova.
- "pagar X dia N" ou "lembrar de X" SEM valor é evento (event_kind "other", título "Pagar X"), não gasto.
- Nunca invente valor, data ou hora que a frase não tem.

Formato do JSON:
{"intent": "...",
 "amount": número em reais ou null,
 "payment": "pix" | "debit" | "credit" | "cash" | "transfer" | null,
 "card": nome exato de um cartão da lista ou null,
 "installments": número de parcelas ou null,
 "category": nome exato de uma categoria da lista ou null,
 "description": texto curto do gasto ou null,
 "date": "AAAA-MM-DD" ou null,
 "time": "HH:MM" ou null,
 "event_kind": "exam" | "deadline" | "appointment" | "other" | null,
 "title": título curto do evento em português, com inicial maiúscula (ex.: "Prova de algoritmo") ou null,
 "ask": pergunta curta para a pessoa quando intent for "unclear", oferecendo as opções (ex.: "É um gasto de R$ 150 ou uma consulta na sexta?") ou null}

Categorias disponíveis: ${categories.join(", ") || "(nenhuma)"}.
Cartões disponíveis: ${cards.join(", ") || "(nenhum)"}.`;
}

type Raw = Record<string, unknown>;
const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const HM = /^\d{2}:\d{2}$/;

export async function interpretWithAI(
  text: string,
  today: CalendarDate,
  categories: string[],
  cards: string[],
): Promise<AiIntent | null> {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: AI_MODEL,
            temperature: 0,
            max_tokens: 800,
            reasoning_effort: "low",
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: systemPrompt(today, categories, cards),
              },
              { role: "user", content: text.slice(0, 200) },
            ],
          }),
          signal: AbortSignal.timeout(7000),
        },
      );
      if (res.status === 429 && attempt === 0) {
        await new Promise((ok) => setTimeout(ok, 1500));
        continue;
      }
      if (!res.ok) return null;
      const data = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const raw = JSON.parse(
        data.choices?.[0]?.message?.content ?? "{}",
      ) as Raw;
      return normalize(raw, today);
    } catch {
      return null;
    }
  }
  return null;
}

function normalize(raw: Raw, today: CalendarDate): AiIntent | null {
  const intent = s(raw.intent);
  if (intent === "unclear")
    return {
      intent,
      ask: s(raw.ask) ?? "Não entendi. É um gasto ou um compromisso?",
    };
  if (intent === "question") return { intent, question: "" };
  if (intent === "expense" || intent === "income") {
    const amount =
      typeof raw.amount === "number"
        ? raw.amount
        : Number(String(raw.amount ?? "").replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0)
      return { intent: "unclear", ask: "Qual foi o valor?" };
    const pay = s(raw.payment);
    const method = (
      ["pix", "debit", "credit", "cash", "transfer"].includes(pay ?? "")
        ? pay
        : "pix"
    ) as "pix" | "debit" | "credit" | "cash" | "transfer";
    const inst = Number(raw.installments);
    const date = s(raw.date);
    return {
      intent,
      amountCents: Math.round(amount * 100),
      method: s(raw.card) ? "credit" : method,
      cardName: s(raw.card),
      installments: Number.isInteger(inst) && inst > 1 ? Math.min(48, inst) : 1,
      categoryName: s(raw.category),
      description: (s(raw.description) ?? "").slice(0, 80),
      date: date && ISO.test(date) && date <= toISODate(today) ? date : null,
    };
  }
  if (intent === "event") {
    const date = s(raw.date);
    const time = s(raw.time);
    const kind = s(raw.event_kind);
    const title = s(raw.title);
    if (!date || !ISO.test(date))
      return { intent: "unclear", ask: "Para quando é?" };
    return {
      intent,
      kind: (["exam", "deadline", "appointment", "other"].includes(kind ?? "")
        ? kind
        : "other") as "exam" | "deadline" | "appointment" | "other",
      title: (title ?? "Compromisso").slice(0, 80),
      date,
      time: time && HM.test(time) ? time : null,
    };
  }
  return null;
}
