// Caminho rápido (Rodada 14): frases simples e completas de gasto, como "mercado 45 no pix",
// são entendidas na hora pelas regras, sem esperar a IA (~0,7 s a menos na voz).
// Só vale quando não há dúvida: valor, forma de pagamento e UMA categoria certa.
// Qualquer coisa diferente (data, parcelas, entrada, categoria ambígua) segue para a IA.
import { fold, SYNONYMS } from "./search-synonyms";

type Cat = { id: string; name: string; kind: string };
type CardRef = { id: string; name: string };

export type FastExpense = {
  amountCents: number;
  description: string;
  category: Cat;
  method: "pix" | "debit" | "cash" | "credit";
  card: CardRef | null;
};

const PAY: Record<string, FastExpense["method"]> = { pix: "pix", debito: "debit", dinheiro: "cash", credito: "credit" };

export function fastExpense(text: string, cats: Cat[], cards: CardRef[]): FastExpense | null {
  const t = fold(text)
    .replace(/[.,!?;]+(\s|$)/g, " ") // pontuação do Whisper ("Mercado 45, no pix.")
    .replace(/(\d)[.,](\d{1,2})\b/g, "$1,$2")
    .replace(/\s+/g, " ")
    .trim();
  const m =
    /^(?:gastei |paguei )?([a-z][a-z ]{1,28}?) (?:de |r\$ ?)?(\d{1,5}(?:,\d{1,2})?)(?: reais)?(?: (?:no|na|em|via|com|pelo|pela|de))? (pix|debito|dinheiro|credito)(?: (?:no|do|da|na) ([a-z]+))?$/.exec(
      t,
    );
  if (!m) return null;
  const [, rawDesc, value, pay, cardWord] = m;
  const desc = rawDesc.replace(/^(?:no|na|em|de|do|da) /, "").trim();
  if (!desc || /\b(recebi|entrada|salario|ganhei|vendi|guardei|meta|parcel|vezes|todo|toda|dia)\b/.test(desc)) return null;
  const [int, cents = "0"] = value.split(",");
  const amountCents = Number(int) * 100 + Number(cents.padEnd(2, "0"));
  if (!amountCents) return null;

  const method = PAY[pay];
  let card: CardRef | null = null;
  if (method === "credit") {
    card = cardWord
      ? (cards.find((c) => fold(c.name) === cardWord) ?? null)
      : cards.length === 1
        ? cards[0]
        : null;
    if (!card) return null; // cartão não dito ou não achado: a IA/pergunta resolve
  } else if (cardWord) return null;

  const expense = cats.filter((c) => c.kind === "expense");
  let category = expense.find((c) => fold(c.name) === desc) ?? null;
  if (!category) {
    const words = desc.split(" ");
    const groups = Object.values(SYNONYMS).filter((g) => words.some((w) => g.includes(w)) || g.includes(desc));
    const found = expense.filter((c) => groups.some((g) => g.includes(fold(c.name))));
    if (found.length !== 1) return null; // nenhuma ou mais de uma categoria possível
    category = found[0];
  }
  return { amountCents, description: rawDesc.trim(), category, method, card };
}
