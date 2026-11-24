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
