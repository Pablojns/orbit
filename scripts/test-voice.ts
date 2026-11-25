import assert from "node:assert/strict";
import { ClapDetector, cleanTranscript, firstSentence, hasWakeWord } from "../src/lib/voice-text";
assert.equal(hasWakeWord("Dimeta"), true);
assert.equal(hasWakeWord("ok di meta"), true);
assert.equal(hasWakeWord("quanto falta de meta"), false);
assert.equal(hasWakeWord("minha meta de viagem"), false);
assert.equal(hasWakeWord("mercado 45 pix"), false);
// Palmas: simula pedaços de 20 ms. "c" = batida (alto), "." = silêncio, "~" = som médio (voz).
const run = (pattern: string) => {
  const d = new ClapDetector();
  let fired = false;
  [...pattern].forEach((ch, i) => {
    const level = ch === "c" ? 0.8 : ch === "~" ? 0.2 : ch === "V" ? 0.5 : 0.01;
    if (d.push(i * 20, level)) fired = true;
  });
  return fired;
};
const sil = (ms: number) => ".".repeat(ms / 20);
assert.equal(run(sil(400) + "cc" + sil(300) + "cc" + sil(400)), true, "duas palmas secas");
assert.equal(run(sil(400) + "cc" + sil(60) + "cc" + sil(400)), false, "rápido demais (eco)");
assert.equal(run(sil(400) + "cc" + sil(800) + "cc" + sil(400)), false, "longe demais");
assert.equal(run(sil(400) + "cc" + sil(300) + "cc" + "~~~~" + sil(400)), false, "som logo depois");
assert.equal(run("~~~~~~" + "cc" + sil(300) + "cc" + sil(400)), false, "sem silêncio antes");
assert.equal(run(sil(400) + "VVVVVVVVVV" + sil(300) + "VVVVVVVVVV" + sil(400)), false, "voz/tosse longa");
assert.equal(run(sil(400) + "cc" + sil(140) + "~~" + sil(100) + "cc" + sil(400)), false, "barulho entre");
assert.equal(run(sil(400) + "cc" + sil(400)), false, "uma palma só");
assert.equal(cleanTranscript("Legendas pela comunidade Amara.org"), "");
assert.equal(cleanTranscript("Obrigado por assistir!"), "");
assert.equal(cleanTranscript("  Mercado 45 no pix. "), "Mercado 45 no pix.");
assert.equal(cleanTranscript("..."), "");
assert.equal(cleanTranscript("45"), "45");
assert.equal(firstSentence("Registrei 45 reais. Saldo: 300."), "Registrei 45 reais.");
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
