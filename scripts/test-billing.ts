import assert from "node:assert/strict";
import { accessFor, statusFromAsaasEvent } from "../src/lib/billing";
const now = new Date("2026-11-24T12:00:00Z");
const iso = (d: number) => new Date(now.getTime() + d * 86_400_000).toISOString();
assert.deepEqual(accessFor(null, now), { kind: "trial", daysLeft: 7 });
assert.deepEqual(accessFor({ status: "trial", trialEndsAt: iso(3), currentPeriodEnd: null }, now), { kind: "trial", daysLeft: 3 });
assert.deepEqual(accessFor({ status: "trial", trialEndsAt: iso(-1), currentPeriodEnd: null }, now), { kind: "blocked", reason: "trial_over" });
assert.equal(accessFor({ status: "active", trialEndsAt: iso(-30), currentPeriodEnd: iso(10) }, now).kind, "active");
assert.equal(accessFor({ status: "active", trialEndsAt: iso(-30), currentPeriodEnd: iso(-1) }, now).kind, "active"); // tolerância
assert.deepEqual(accessFor({ status: "active", trialEndsAt: iso(-30), currentPeriodEnd: iso(-5) }, now), { kind: "blocked", reason: "unpaid" });
assert.equal(accessFor({ status: "past_due", trialEndsAt: iso(-30), currentPeriodEnd: iso(-1) }, now).kind, "grace");
assert.deepEqual(accessFor({ status: "past_due", trialEndsAt: iso(-30), currentPeriodEnd: iso(-4) }, now), { kind: "blocked", reason: "unpaid" });
assert.equal(accessFor({ status: "canceled", trialEndsAt: iso(-30), currentPeriodEnd: iso(5) }, now).kind, "active");
assert.deepEqual(accessFor({ status: "canceled", trialEndsAt: iso(-30), currentPeriodEnd: iso(-1) }, now), { kind: "blocked", reason: "canceled" });
assert.equal(statusFromAsaasEvent("PAYMENT_RECEIVED"), "active");
assert.equal(statusFromAsaasEvent("PAYMENT_OVERDUE"), "past_due");
assert.equal(statusFromAsaasEvent("SUBSCRIPTION_DELETED"), "canceled");
assert.equal(statusFromAsaasEvent("PAYMENT_CREATED"), null);
console.log("test-billing (acesso e eventos): ok");
