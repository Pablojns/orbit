// Valores do jeito que o brasileiro escreve. Rodar: npx tsx scripts/test-money.ts
import assert from "node:assert/strict";
import { formatCents, parseToCents } from "../src/lib/money";

assert.equal(parseToCents("6.000"), 600000);
assert.equal(parseToCents("6.000,00"), 600000);
assert.equal(parseToCents("1.234,56"), 123456);
assert.equal(parseToCents("1.50"), 150);
assert.equal(parseToCents("1.5"), 150);
assert.equal(parseToCents("1.500"), 150000);
assert.equal(parseToCents("1.234.567"), 123456700);
assert.equal(parseToCents("R$ 45"), 4500);
assert.equal(parseToCents("44,90"), 4490);
assert.equal(parseToCents("12"), 1200);
assert.equal(parseToCents("abc"), null);
assert.equal(parseToCents("1.2345"), null);
assert.equal(formatCents(-68870), "− R$ 688,70");
assert.equal(formatCents(68870), "R$ 688,70");
assert.equal(formatCents(0), "R$ 0,00");
console.log("test-money: ok");
