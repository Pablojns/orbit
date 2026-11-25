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

import { hasWakeWord, isDoubleClap } from "../src/lib/voice-text";
assert.equal(hasWakeWord("Dimeta"), true);
assert.equal(hasWakeWord("ok di meta"), true);
assert.equal(hasWakeWord("de meta, quanto posso gastar"), true);
assert.equal(hasWakeWord("minha meta de viagem"), false);
assert.equal(hasWakeWord("mercado 45 pix"), false);
assert.equal(isDoubleClap([1000, 1300], 1400), true);
assert.equal(isDoubleClap([1000, 1050], 1100), false); // eco do mesmo estalo
assert.equal(isDoubleClap([1000, 1900], 2000), false); // longe demais
assert.equal(isDoubleClap([0, 300], 2000), false); // antigo
console.log("test-voice (palavra Dimeta e palmas): ok");

// Transcrições de exemplo (números e nomes) passam pela mesma leitura da barra.
import { parseQuickText } from "../src/lib/quick-parse";
const cats = [{ id: "m", name: "Mercado", kind: "expense" }, { id: "t", name: "Transporte", kind: "expense" }];
const cards = [{ id: "n", name: "Nubank" }];
// O reconhecimento de voz entrega números como dígitos e nomes com maiúscula.
const ditos: [string, number][] = [["Mercado 45 pix", 4500], ["Uber 18 reais no Nubank", 1800], ["mercado 32,50", 3250]];
for (const [said, cents] of ditos) {
  const r = parseQuickText(said, cats, cards) as { amountCents?: number };
  assert.equal(r.amountCents, cents, `não leu: ${said}`);
}
console.log("test-voice (transcrições de exemplo): ok");
import { afterWakeWord, choiceFromSpeech, spokenConfirm } from "../src/lib/voice-text";
for (const w of ["Dimeta", "di meta", "dimetá", "Ei Dimeta!"]) assert.ok(hasWakeWord(w), w);
assert.ok(!hasWakeWord("meta de viagem"));
assert.equal(afterWakeWord("Dimeta, mercado 45 pix"), "mercado 45 pix");
assert.equal(afterWakeWord("dimetá"), "");
assert.equal(spokenConfirm("Gasto: R$ 45,00 · Mercado · Pix · hoje, 24/11."), "Registrei 45 reais em mercado.");
assert.equal(spokenConfirm("Gasto: R$ 1.234,50 · Lazer · Débito · hoje."), "Registrei 1234 reais e 50 centavos em lazer.");
assert.equal(spokenConfirm("Entrada: R$ 2.000,00 · Salário · hoje, 24/11."), "Registrei a entrada de 2000 reais.");
assert.equal(spokenConfirm("Na agenda: Prova de Estatística — sex 27/11 às 19:00. Aviso na véspera."), "Marquei Prova de Estatística.");
assert.equal(spokenConfirm("Guardado: R$ 200,00 em Viagem."), "Guardei 200 reais em Viagem.");
assert.equal(choiceFromSpeech("é um gasto"), "expense");
assert.equal(choiceFromSpeech("compromisso"), "event");
assert.equal(choiceFromSpeech("sei lá"), null);
console.log("test-voice (conversa por voz): ok");
