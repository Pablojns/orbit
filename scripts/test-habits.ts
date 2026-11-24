import assert from "node:assert/strict";
import { habitStreak } from "../src/lib/habit-math";
const today = { year: 2026, month: 11, day: 24 };
assert.equal(habitStreak(new Set(), today), 0);
assert.equal(habitStreak(new Set(["2026-11-24"]), today), 1);
// hoje não marcado: conta a partir de ontem
assert.equal(habitStreak(new Set(["2026-11-23", "2026-11-22"]), today), 2);
assert.equal(habitStreak(new Set(["2026-11-24", "2026-11-23", "2026-11-21"]), today), 2);
// buraco anteontem: só ontem conta
assert.equal(habitStreak(new Set(["2026-11-23", "2026-11-21"]), today), 1);
// virada de mês
assert.equal(habitStreak(new Set(["2026-12-01", "2026-11-30", "2026-11-29"]), { year: 2026, month: 12, day: 1 }), 3);
console.log("test-habits (sequência): ok");

import { weeklyStreak } from "../src/lib/habit-math";
// hoje: terça 24/11/2026; semana atual começa segunda 23/11
const wk = new Set(["2026-11-17", "2026-11-19", "2026-11-21", "2026-11-10", "2026-11-12", "2026-11-14"]);
assert.equal(weeklyStreak(wk, today, 3), 2); // semanas de 9/11 e 16/11 bateram 3; atual ainda não
assert.equal(weeklyStreak(new Set([...wk, "2026-11-23", "2026-11-24", "2026-11-22"]), today, 3), 2); // 22 é da semana anterior
assert.equal(weeklyStreak(new Set([...wk, "2026-11-23", "2026-11-24"]), today, 2), 3); // atual já bateu 2
assert.equal(weeklyStreak(new Set(["2026-11-17"]), today, 3), 0);
console.log("test-habits (sequência semanal): ok");
