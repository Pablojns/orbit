// Testes das regras de fatura e ocorrências. Rodar: npx tsx scripts/test-schedule.ts
import assert from "node:assert/strict";
import { installmentPlan, monthlyOccurrences, splitInstallments, statementDueDate, statementMonthFor } from "../src/lib/schedule";
import { currentCycle } from "../src/lib/cycle";
import { toISODate } from "../src/lib/dates";

const d = (y: number, m: number, day: number) => ({ year: y, month: m, day });

// Cartão fecha dia 3, vence dia 10.
assert.equal(statementMonthFor(d(2026, 11, 2), 3, 10), "2026-11-01"); // antes do fechamento: fatura de nov
assert.equal(statementMonthFor(d(2026, 11, 3), 3, 10), "2026-12-01"); // no fechamento: próxima
assert.equal(statementMonthFor(d(2026, 11, 5), 3, 10), "2026-12-01");
// Cartão fecha dia 28, vence dia 5 (vence no mês seguinte ao fechamento).
assert.equal(statementMonthFor(d(2026, 11, 20), 28, 5), "2026-12-01");
assert.equal(statementMonthFor(d(2026, 11, 28), 28, 5), "2027-01-01");
// Fechamento 30 em fevereiro (vira 28).
assert.equal(statementMonthFor(d(2027, 2, 27), 30, 7), "2027-03-01");
assert.equal(statementMonthFor(d(2027, 2, 28), 30, 7), "2027-04-01");
// Virada de ano.
assert.equal(statementMonthFor(d(2026, 12, 15), 10, 17), "2027-01-01");

assert.deepEqual(splitInstallments(10000, 3), [3334, 3333, 3333]);
assert.equal(splitInstallments(60000, 6).reduce((a, b) => a + b, 0), 60000);

// Critério do plano: R$ 600 em 6x, cartão fecha 3 e vence 10, compra no dia 5.
const plan = installmentPlan(d(2026, 11, 5), 60000, 6, 3, 10);
assert.deepEqual(
  plan.map((p) => p.statementMonth),
  ["2026-12-01", "2027-01-01", "2027-02-01", "2027-03-01", "2027-04-01", "2027-05-01"],
);
assert.ok(plan.every((p) => p.amountCents === 10000));
assert.deepEqual(statementDueDate("2026-12-01", 10), d(2026, 12, 10));
assert.deepEqual(statementDueDate("2027-02-01", 31), d(2027, 2, 28));

// Ocorrências dentro do ciclo 30/out a 29/nov.
const cycle = currentCycle(d(2026, 11, 19), 30);
assert.equal(toISODate(cycle.start), "2026-10-30");
assert.deepEqual(monthlyOccurrences(10, cycle.start, cycle.end).map(toISODate), ["2026-11-10"]);
assert.deepEqual(monthlyOccurrences(30, cycle.start, cycle.end).map(toISODate), ["2026-10-30"]);
assert.deepEqual(monthlyOccurrences(5, cycle.start, cycle.end, null, "2026-11-01").map(toISODate), []);
assert.deepEqual(monthlyOccurrences(5, cycle.start, cycle.end, "2026-11-01", null).map(toISODate), ["2026-11-05"]);

console.log("todas as regras de fatura, parcelas e ocorrências passaram");
