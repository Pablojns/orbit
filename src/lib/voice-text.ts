// Junta os trechos do reconhecimento de voz: os já confirmados e o que ainda está em andamento.
export type VoiceResult = { transcript: string; isFinal: boolean };

export function mergeVoice(results: VoiceResult[]): { text: string; confirmed: string } {
  let confirmed = "";
  let partial = "";
  for (const r of results) {
    if (r.isFinal) confirmed += r.transcript;
    else partial += r.transcript;
  }
  const clean = (s: string) => s.replace(/\s+/g, " ").trim();
  return { text: clean(confirmed + partial), confirmed: clean(confirmed) };
}

// Palavra de chamada: "Dimeta" (o reconhecimento às vezes ouve "di meta", "de meta", "dmeta").
export function hasWakeWord(text: string): boolean {
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, " ");
  return /\b(dimeta|di meta|dee meta|d meta|dmeta|de meta)\b/.test(t);
}

// Duas palmas: dois picos de som em até 700 ms, com pelo menos 120 ms entre eles.
export function isDoubleClap(peakTimes: number[], now: number): boolean {
  const recent = peakTimes.filter((t) => now - t <= 700);
  for (let i = 1; i < recent.length; i++) {
    const gap = recent[i] - recent[i - 1];
    if (gap >= 120 && gap <= 700) return true;
  }
  return false;
}
