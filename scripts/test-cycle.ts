// Testes de "Faltam X dias para o salário". Rodar: npx tsx scripts/test-cycle.ts
import assert from "node:assert/strict";
import { currentCycle, cycleAt, daysToPayday, paydayText } from "../src/lib/cycle";

const d = (y: number, m: number, day: number) => ({ year: y, month: m, day });

// Salário dia 5: ciclo de 5/nov a 4/dez.
assert.equal(daysToPayday(currentCycle(d(2026, 11, 21), 5)), 14); // 21/nov -> 5/dez
assert.equal(daysToPayday(currentCycle(d(2026, 12, 4), 5)), 1); // véspera do salário
assert.equal(paydayText(currentCycle(d(2026, 12, 4), 5)), "Falta 1 dia para o salário");
assert.equal(daysToPayday(currentCycle(d(2026, 12, 5), 5)), 31); // dia do salário: ciclo novo, 5/dez -> 5/jan
assert.equal(daysToPayday(currentCycle(d(2026, 11, 5), 5)), 30); // primeiro dia do ciclo
// Salário dia 31: em fevereiro o ciclo começa no último dia do mês.
assert.equal(daysToPayday(currentCycle(d(2027, 2, 20), 31)), 8); // 20/fev -> 28/fev
// Virada de ano.
assert.equal(daysToPayday(currentCycle(d(2026, 12, 30), 10)), 11); // 30/dez -> 10/jan
assert.equal(paydayText(currentCycle(d(2026, 11, 21), 5)), "Faltam 14 dias para o salário");
// Ciclo passado não tem dias restantes.
assert.equal(cycleAt(d(2026, 11, 21), 5, -1).daysLeft, 0);

console.log("test-cycle: ok");
