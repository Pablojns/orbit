// Testes de faltas e horário de aulas. Rodar: npx tsx scripts/test-studies.ts
import assert from "node:assert/strict";
import { absenceStatus, classOccurrences, type ClassSlot } from "../src/lib/studies-math";

assert.equal(absenceStatus(3, null).kind, "no-limit");
assert.equal(absenceStatus(2, 10).kind, "ok");
assert.equal(absenceStatus(8, 10).kind, "near"); // faltam 2
assert.equal(absenceStatus(15, 20).kind, "near"); // 75% usado
assert.equal(absenceStatus(10, 10).kind, "at-limit");
assert.equal(absenceStatus(11, 10).kind, "over");
assert.equal(absenceStatus(0, 0).kind, "at-limit");

const d = (y: number, m: number, day: number) => ({ year: y, month: m, day });
const slot = (weekday: number, startsAt = "19:00"): ClassSlot => ({
  id: `s${weekday}${startsAt}`,
  subjectId: "x",
  subjectName: "Inglês",
  weekday,
  startsAt,
  endsAt: null,
  room: null,
});

// Novembro de 2026: terças são 3, 10, 17, 24.
const tuesdays = classOccurrences([slot(2)], null, d(2026, 11, 1), d(2026, 11, 30)).map((o) => o.date);
assert.deepEqual(tuesdays, ["2026-11-03", "2026-11-10", "2026-11-17", "2026-11-24"]);
// Semestre termina dia 15: só 3 e 10.
const term = { startsOn: "2026-08-01", endsOn: "2026-11-15" };
assert.deepEqual(
  classOccurrences([slot(2)], term, d(2026, 11, 1), d(2026, 11, 30)).map((o) => o.date),
  ["2026-11-03", "2026-11-10"],
);
// Fora do semestre: nada.
assert.equal(classOccurrences([slot(2)], term, d(2026, 12, 1), d(2026, 12, 31)).length, 0);
// Ordem por dia e hora.
const two = classOccurrences([slot(2, "21:00"), slot(2, "19:00")], null, d(2026, 11, 3), d(2026, 11, 3));
assert.deepEqual(two.map((o) => o.slot.startsAt), ["19:00", "21:00"]);

console.log("test-studies: ok");

import { defaultRepeatUntil, matchSubject } from "../src/lib/studies-math";
const subs = [{ name: "Cálculo I" }, { name: "Algoritmos e Lógica" }, { name: "Inglês" }];
assert.equal(matchSubject("calculo", subs)?.name, "Cálculo I");
assert.equal(matchSubject("algoritmo", subs)?.name, "Algoritmos e Lógica");
assert.equal(matchSubject("ingles", subs)?.name, "Inglês");
assert.equal(matchSubject("INGLÊS", subs)?.name, "Inglês");
assert.equal(matchSubject("história", subs), null);
assert.equal(defaultRepeatUntil("2026-11-23", { startsOn: "2026-08-01", endsOn: "2026-12-15" }), "2026-12-15");
assert.equal(defaultRepeatUntil("2026-11-23", null), "2027-02-15");
assert.equal(defaultRepeatUntil("2027-01-10", { startsOn: "2026-08-01", endsOn: "2026-12-15" }), "2027-04-04");
console.log("test-studies (matérias e repetição): ok");
