// Datas de gasto/entrada ditas na frase. Rodar: npx tsx scripts/test-money-date.ts
import assert from "node:assert/strict";
import { findMoneyDate } from "../src/lib/money-date";

const today = { year: 2026, month: 11, day: 21 }; // sábado
const date = (s: string) => {
  const r = findMoneyDate(s, today);
  return r.kind === "found" ? r.date : r.kind;
};
assert.equal(date("recebi 250 de freela dia 12/11"), "2026-11-12");
assert.equal(date("almoço 32 no débito anteontem"), "2026-11-19");
assert.equal(date("uber 23,50 ontem"), "2026-11-20");
assert.equal(date("gasolina 120 no inter dia 2/11"), "2026-11-02");
assert.equal(date("mercado 187,40 débito dia 24/10"), "2026-10-24");
assert.equal(date("cinema 64 sábado passado"), "2026-11-14");
assert.equal(date("pizza 40 na sexta"), "2026-11-20");
assert.equal(date("pizza 40 sábado"), "2026-11-21");
assert.equal(date("luz 120 dia 28"), "2026-10-28"); // dia 28 ainda não chegou: mês passado
assert.equal(date("luz 120 dia 15"), "2026-11-15");
assert.equal(date("café 8 há 3 dias"), "2026-11-18");
assert.equal(date("presente 90 25/12"), "2025-12-25"); // sem ano e no futuro: ano passado
assert.equal(date("presente 90 25/12/2025"), "2025-12-25");
assert.equal(date("gastei 58 na farmácia semana passada"), "vague");
assert.equal(date("mercado 45 pix"), "none");
assert.equal(date("tênis 480 no inter em 4x"), "none");
assert.equal(date("café 8 hoje"), "2026-11-21");
console.log("test-money-date: ok");
{
  const r = findMoneyDate("dentista 150 sexta", today);
  assert.ok(r.kind === "found" && !r.explicit, "dia da semana solto não é passado certo");
  const p = findMoneyDate("cinema 64 sábado passado", today);
  assert.ok(p.kind === "found" && p.explicit);
  const d = findMoneyDate("gasolina 120 dia 2/11", today);
  assert.ok(d.kind === "found" && d.explicit);
  console.log("test-money-date (explícita): ok");
}
