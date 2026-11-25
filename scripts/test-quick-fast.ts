import assert from "node:assert/strict";
import { fastExpense } from "../src/lib/quick-fast";

const cats = [
  { id: "a", name: "Alimentação", kind: "expense" },
  { id: "m", name: "Mercado", kind: "expense" },
  { id: "t", name: "Transporte", kind: "expense" },
  { id: "s", name: "Saúde", kind: "expense" },
  { id: "o", name: "Outros", kind: "expense" },
  { id: "x", name: "Salário", kind: "income" },
];
const cards = [{ id: "i", name: "Inter" }];

const r = (t: string) => fastExpense(t, cats, cards);
assert.equal(r("Mercado 45, no pix.")?.category.name, "Mercado");
assert.equal(r("mercado 45 no pix")?.amountCents, 4500);
assert.equal(r("Uber, 18, no débito.")?.category.name, "Transporte");
assert.equal(r("Uber, 18, no débito.")?.method, "debit");
assert.equal(r("gasolina 120 no crédito")?.card?.name, "Inter");
assert.equal(r("gasolina 120 no crédito do inter")?.card?.name, "Inter");
assert.equal(r("farmácia 37,90 pix")?.amountCents, 3790);
assert.equal(r("farmácia 37,90 pix")?.category.name, "Saúde");
assert.equal(r("ifood 32 pix"), null, "ifood: Alimentação ou Mercado, deixa a IA decidir");
assert.equal(r("mercado 45"), null, "sem pagamento: pergunta");
assert.equal(r("mercado 45 pix ontem"), null, "com data: IA/regras de data");
assert.equal(r("salário 2900 pix"), null, "entrada não");
assert.equal(r("tênis 600 crédito 3x"), null, "parcelado não");
assert.equal(r("cinema 30 pix"), null, "sem categoria certa");
assert.equal(r("uber 20 no crédito do nubank"), null, "cartão desconhecido");
assert.equal(r("gastei 30 no mercado pix"), null, "ordem diferente: IA");
console.log("test-quick-fast: ok");
