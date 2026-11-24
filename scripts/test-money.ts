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

import { centsToCsv, toCsv } from "../src/lib/csv";
assert.equal(centsToCsv(123456), "1234,56");
assert.equal(toCsv([["a;b", 'x"y'], [1, null]]), '﻿"a;b";"x""y"\r\n1;');
console.log("test-money (CSV): ok");

import { budgetLevel } from "../src/lib/budget";
assert.equal(budgetLevel(7000, 10000), "ok");
assert.equal(budgetLevel(7500, 10000), "75");
assert.equal(budgetLevel(9000, 10000), "90");
assert.equal(budgetLevel(10000, 10000), "100");
assert.equal(budgetLevel(15000, null), "ok");
console.log("test-money (orçamento): ok");
