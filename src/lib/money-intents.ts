// Frases de dinheiro que não são gasto nem entrada comum, entendidas por regras
// (antes da IA): guardar em meta, conta fixa "todo dia N", empréstimo e perguntas.
// Funções puras, testadas em scripts/test-money-intents.ts.
import { parseToCents } from "./money";

export type MoneyIntent =
  | { intent: "goal_deposit"; amountCents: number; goal: string }
  | { intent: "fixed_bill"; amountCents: number; name: string; dueDay: number; subscription: boolean }
  | { intent: "debt"; amountCents: number; person: string; direction: "owed_to_me" | "i_owe"; note: string | null }
  | { intent: "question"; topic: "per_day" | "balance" | "statement" | "other" };

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
const VALUE = "r?\\$? ?(\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d+(?:[.,]\\d{1,2})?)(?: reais| conto)?";
const cents = (v: string) => parseToCents(v);
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

const SUBSCRIPTIONS = [
  "netflix",
  "spotify",
  "disney",
  "prime",
  "amazon prime",
  "hbo",
  "max",
  "youtube",
  "globoplay",
  "deezer",
  "icloud",
  "chatgpt",
  "game pass",
  "apple",
  "paramount",
  "crunchyroll",
];

export function parseMoneyIntent(text: string): MoneyIntent | null {
  const original = text.replace(/\s+/g, " ").trim().replace(/[.!]+$/, "");
  const t = fold(original);
  // Recorta da frase original o trecho achado na versão sem acento (mesmo tamanho).
  const cut = (start: number, len: number) => original.slice(start, start + len).trim();
  let m: RegExpExecArray | null;

  // Perguntas (escritas ou faladas)
  if (/\?$/.test(t) || /^(quanto|qual|quais|como|o que|tenho|ainda)\b/.test(t)) {
    if (/\b(posso gastar|da pra gastar|pode gastar|sobra|livre)\b/.test(t)) return { intent: "question", topic: "per_day" };
    if (/\bsaldo\b|\bquanto (eu )?tenho\b(?! de fatura)/.test(t)) return { intent: "question", topic: "balance" };
    if (/\bfatura|cartao\b/.test(t)) return { intent: "question", topic: "statement" };
    if (/\?$/.test(t)) return { intent: "question", topic: "other" };
  }

  // Guardar em meta: "guardei 150 na meta do celular", "coloquei 200 na reserva"
  m = new RegExp(`^(?:guardei|guardar|depositei|coloquei|separei|juntei) ${VALUE} (?:na|no|pra|para|para a|pro)(?: minha)?(?: meta)?(?: d[oae]s?| de)? (.+)$`).exec(t);
  if (m) {
    const amount = cents(m[1]);
    const goal = cut(t.length - m[2].length, m[2].length);
    if (amount && goal) return { intent: "goal_deposit", amountCents: amount, goal };
  }

  // Empréstimo: "emprestei 50 pro João" (me deve) / "peguei 50 emprestado com a Ana", "devo 30 pra Ana"
  m = new RegExp(`^(?:emprestei|empresto|passei) ${VALUE} (?:pro|pra|para o|para a|para|ao|a|à) (\\S+(?: \\S+)?)(?: (?:para|pra|de) (.+))?$`).exec(t);
  if (m && /^(emprestei|empresto)/.test(t)) {
    const amount = cents(m[1]);
    const person = cap(cut(t.indexOf(m[2], t.indexOf(m[1]) + m[1].length), m[2].length));
    if (amount && person) return { intent: "debt", amountCents: amount, person, direction: "owed_to_me", note: m[3] ? cut(t.lastIndexOf(m[3]), m[3].length) : null };
  }
  m = new RegExp(`^(?:peguei|pedi) ${VALUE} emprestado (?:com|do|da|de)(?: o| a)? (\\S+(?: \\S+)?)$`).exec(t) ??
    new RegExp(`^(?:devo|to devendo|estou devendo) ${VALUE} (?:pro|pra|para o|para a|para|ao|a|à) (\\S+(?: \\S+)?)$`).exec(t);
  if (m) {
    const amount = cents(m[1]);
    const person = cap(cut(t.lastIndexOf(m[2]), m[2].length));
    if (amount && person) return { intent: "debt", amountCents: amount, person, direction: "i_owe", note: null };
  }

  // Conta fixa: "netflix 44,90 todo dia 12", "aluguel 900 todo mês dia 10"
  m = new RegExp(`^(.+?) ${VALUE}(?: (?:no|de|por) mes)? (?:todo (?:mes )?(?:no )?dia|todos os dias|vence (?:todo )?dia|todo mes dia) (\\d{1,2})(?: (assinatura|e assinatura))?$`).exec(t);
  if (m) {
    const amount = cents(m[2]);
    const day = Number(m[3]);
    const name = cap(cut(0, m[1].length));
    if (amount && day >= 1 && day <= 31 && name && !/^(aula|prova|reuniao|academia)\b/.test(m[1])) {
      const subscription = Boolean(m[4]) || SUBSCRIPTIONS.some((w) => fold(m![1]).includes(w));
      return { intent: "fixed_bill", amountCents: amount, name, dueDay: day, subscription };
    }
  }
  return null;
}

// Acha a meta pelo nome falado ("celular" acha "Celular novo"; "reserva" acha "Reserva de emergência").
export function matchByName<T extends { name: string }>(said: string, items: T[]): T | null {
  const q = fold(said).replace(/[^a-z0-9 ]/g, "");
  if (!q) return null;
  const f = (s: string) => fold(s).replace(/[^a-z0-9 ]/g, "");
  const exact = items.find((i) => f(i.name) === q);
  if (exact) return exact;
  const contains = items.filter((i) => f(i.name).includes(q) || q.includes(f(i.name)));
  if (contains.length === 1) return contains[0];
  const words = q.split(" ").filter((w) => w.length >= 4);
  const byWord = items.filter((i) => f(i.name).split(" ").some((w) => words.includes(w)));
  return byWord.length === 1 ? byWord[0] : (contains[0] ?? null);
}
