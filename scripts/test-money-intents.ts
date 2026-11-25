// Frases de meta, conta fixa, empréstimo e perguntas. Rodar: npx tsx scripts/test-money-intents.ts
import assert from "node:assert/strict";
import { matchByName, parseMoneyIntent } from "../src/lib/money-intents";
import { installmentEndISO, installmentOf } from "../src/lib/schedule";

assert.deepEqual(parseMoneyIntent("guardei 150 na meta do celular"), { intent: "goal_deposit", amountCents: 15000, goal: "celular" });
assert.deepEqual(parseMoneyIntent("coloquei 200 na reserva"), { intent: "goal_deposit", amountCents: 20000, goal: "reserva" });
assert.deepEqual(parseMoneyIntent("guardei 1.000 na Reserva de emergência"), {
  intent: "goal_deposit",
  amountCents: 100000,
  goal: "Reserva de emergência",
});
assert.deepEqual(parseMoneyIntent("netflix 44,90 todo dia 12"), {
  intent: "fixed_bill",
  amountCents: 4490,
  name: "Netflix",
  dueDay: 12,
  subscription: true,
});
assert.deepEqual(parseMoneyIntent("netflix 44,90 todo dia 12 assinatura"), {
  intent: "fixed_bill",
  amountCents: 4490,
  name: "Netflix",
  dueDay: 12,
  subscription: true,
});
assert.deepEqual(parseMoneyIntent("internet 99,90 todo dia 10"), {
  intent: "fixed_bill",
  amountCents: 9990,
  name: "Internet",
  dueDay: 10,
  subscription: false,
});
// Empréstimos saíram na Rodada 13: estas frases não viram mais "dívida".
for (const f of ["emprestei 50 pro João", "devo 30 pra Ana"]) assert.notEqual((parseMoneyIntent(f) as { intent?: string } | null)?.intent, "debt");
assert.deepEqual(parseMoneyIntent("quanto posso gastar hoje?"), { intent: "question", topic: "per_day" });
assert.deepEqual(parseMoneyIntent("qual meu saldo?"), { intent: "question", topic: "balance" });
assert.deepEqual(parseMoneyIntent("quanto tenho de fatura?"), { intent: "question", topic: "statement" });
assert.deepEqual(parseMoneyIntent("o que tenho amanhã?"), { intent: "question", topic: "other" });
assert.equal(parseMoneyIntent("mercado 45 pix"), null);
assert.equal(parseMoneyIntent("aula de inglês toda terça 19h"), null);
assert.equal(parseMoneyIntent("tênis 480 no inter em 4x"), null);

const goals = [{ name: "Reserva de emergência" }, { name: "Celular novo" }];
assert.equal(matchByName("celular", goals)?.name, "Celular novo");
assert.equal(matchByName("reserva", goals)?.name, "Reserva de emergência");
assert.equal(matchByName("viagem", goals), null);
console.log("test-money-intents: ok");

// Conta parcelada (Rodada 13)
assert.deepEqual(parseMoneyIntent("crediário 150 em 10x todo dia 5"), {
  intent: "fixed_bill",
  amountCents: 15000,
  name: "Crediário",
  dueDay: 5,
  subscription: false,
  installments: 10,
});
assert.equal((parseMoneyIntent("geladeira 200 parcelado em 12 vezes dia 10") as { installments?: number }).installments, 12);
{
  assert.equal(installmentEndISO(5, "2026-11-24", 10), "2027-09-05");
  assert.equal(installmentEndISO(5, "2026-11-03", 10), "2027-08-05");
  assert.deepEqual(installmentOf(5, "2026-11-24", "2027-09-05", { year: 2026, month: 12, day: 5 }), { k: 1, total: 10 });
  assert.deepEqual(installmentOf(5, "2026-11-24", "2027-09-05", { year: 2027, month: 9, day: 5 }), { k: 10, total: 10 });
}
console.log("ok parcelas");
