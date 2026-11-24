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
