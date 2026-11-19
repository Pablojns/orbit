import { parseQuickText } from "../src/lib/quick-parse";
const cats = [
  { id: "c-merc", name: "Mercado", kind: "expense" },
  { id: "c-trans", name: "Transporte", kind: "expense" },
  { id: "c-ali", name: "Alimentação", kind: "expense" },
  { id: "c-sal", name: "Salário", kind: "income" },
  { id: "c-comp", name: "Compras", kind: "expense" },
];
const cards = [{ id: "k-nu", name: "Nubank" }, { id: "k-inter", name: "Inter" }];
const cases: [string, Partial<Record<string, unknown>>][] = [
  ["mercado 45 pix", { amountCents: 4500, method: "pix", categoryId: "c-merc", type: "expense" }],
  ["uber 18,50 nubank", { amountCents: 1850, method: "credit", cardId: "k-nu", categoryId: "c-trans" }],
  ["tênis 600 inter 3x", { amountCents: 60000, installments: 3, cardId: "k-inter", categoryId: "c-comp" }],
  ["salário 3200 entrada", { type: "income", amountCents: 320000, categoryId: "c-sal" }],
  ["ifood 42 ontem débito", { amountCents: 4200, method: "debit", categoryId: "c-ali" }],
  ["aluguel 1.200,50 pix", { amountCents: 120050 }],
];
let fail = 0;
for (const [text, exp] of cases) {
  const r = parseQuickText(text, cats, cards) as Record<string, unknown>;
  for (const [k, v] of Object.entries(exp)) if (r[k] !== v) { fail++; console.log("FALHOU", text, k, r[k], "!=", v); }
}
const e = parseQuickText("mercado pix", cats, cards);
if (!("error" in e)) { fail++; console.log("FALHOU sem valor"); }
console.log(fail ? `${fail} falhas` : "todas as frases passaram");
process.exit(fail ? 1 : 0);
