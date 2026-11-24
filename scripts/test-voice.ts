import assert from "node:assert/strict";
import { mergeVoice } from "../src/lib/voice-text";
// Enquanto fala: só parcial
assert.deepEqual(mergeVoice([{ transcript: "mercado", isFinal: false }]), { text: "mercado", confirmed: "" });
// Parcial crescendo
assert.equal(mergeVoice([{ transcript: "mercado 45", isFinal: false }]).text, "mercado 45");
// Trecho confirmado + novo parcial
assert.deepEqual(
  mergeVoice([
    { transcript: "mercado 45", isFinal: true },
    { transcript: " pix", isFinal: false },
  ]),
  { text: "mercado 45 pix", confirmed: "mercado 45" },
);
// Espaços extras
assert.equal(mergeVoice([{ transcript: "  prova  sexta ", isFinal: true }]).text, "prova sexta");
console.log("test-voice (texto parcial): ok");
