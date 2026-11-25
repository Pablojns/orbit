import assert from "node:assert/strict";
import { periodRange } from "../src/lib/period";
import { toISODate } from "../src/lib/dates";
const t = { year: 2026, month: 11, day: 24 };
const r = (k: string, de?: string, ate?: string) => {
  const p = periodRange(k, t, 5, de, ate);
  return `${toISODate(p.start)}..${toISODate(p.end)}`;
};
assert.equal(r("ciclo"), "2026-11-05..2026-12-04");
assert.equal(r("mes"), "2026-11-01..2026-11-30");
assert.equal(r("mes-passado"), "2026-10-01..2026-10-31");
assert.equal(r("ano"), "2026-01-01..2026-12-31");
assert.equal(r("personalizado", "2026-11-20", "2026-11-01"), "2026-11-01..2026-11-20");
assert.equal(r("personalizado"), "2026-11-05..2026-12-04"); // sem datas: ciclo
assert.equal(r("qualquer"), "2026-11-05..2026-12-04");
const jan = periodRange("mes-passado", { year: 2027, month: 1, day: 10 }, 5);
assert.equal(`${toISODate(jan.start)}..${toISODate(jan.end)}`, "2026-12-01..2026-12-31");
console.log("test-period (seletor de período): ok");
