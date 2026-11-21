// Frases de meta, conta fixa, empréstimo e perguntas. Rodar: npx tsx scripts/test-money-intents.ts
import assert from "node:assert/strict";
import { matchByName, parseMoneyIntent } from "../src/lib/money-intents";

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
assert.deepEqual(parseMoneyIntent("emprestei 50 pro João"), {
  intent: "debt",
  amountCents: 5000,
  person: "João",
  direction: "owed_to_me",
  note: null,
});
assert.deepEqual(parseMoneyIntent("devo 30 pra Ana"), { intent: "debt", amountCents: 3000, person: "Ana", direction: "i_owe", note: null });
assert.deepEqual(parseMoneyIntent("peguei 100 emprestado com o Pedro"), {
  intent: "debt",
  amountCents: 10000,
  person: "Pedro",
  direction: "i_owe",
  note: null,
});
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
