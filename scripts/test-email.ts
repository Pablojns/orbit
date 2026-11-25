import assert from "node:assert/strict";
import { buildEmail } from "../src/lib/email-templates";
for (const k of ["welcome", "trial_ending", "payment_ok", "payment_late", "canceled"] as const) {
  const m = buildEmail(k, { name: "Ana", date: "1 de dezembro" });
  assert.ok(m.subject.length > 5, k);
  assert.ok(m.html.startsWith("<!doctype html>"), k);
  assert.ok(m.text.includes("Oi, Ana!"), k);
  assert.ok(!/19,90|gratuito/i.test(m.html), `${k}: preço antigo`);
}
assert.ok(buildEmail("trial_ending", { date: "1 de dezembro" }).text.includes("R$ 29,90"));
assert.ok(buildEmail("trial_ending", { date: "1 de dezembro" }).text.includes("1 de dezembro"));
assert.ok(buildEmail("welcome").text.startsWith("Sua conta está pronta"));
assert.ok(!buildEmail("welcome").text.includes("<"), "texto puro sem tags");
console.log("test-email (e-mails de sistema): ok");
