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

const foldText = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ,]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// O que vem depois de "Dimeta" na mesma fala ("Dimeta, mercado 45 pix" → "mercado 45 pix").
export function afterWakeWord(text: string): string {
  const t = foldText(text);
  const m = t.match(/\b(?:dimeta|di meta|dee meta|d meta|dmeta|de meta)\b[ ,]*(.*)$/);
  return (m?.[1] ?? "").replace(/^,\s*/, "").trim();
}

// Resposta curta falada depois de registrar ("Registrei 45 reais em mercado").
function spokenMoney(v: string): string {
  const [int, cents] = v.replace(/\./g, "").split(",");
  return cents && cents !== "00" ? `${int} reais e ${Number(cents)} centavos` : `${int} reais`;
}
export function spokenConfirm(message: string): string {
  const m = message.trim();
  let r = m.match(/^Gasto: R\$ ([\d.,]+) · ([^·]+)/);
  if (r) return `Registrei ${spokenMoney(r[1])} em ${r[2].trim().toLowerCase()}.`;
  r = m.match(/^Entrada: R\$ ([\d.,]+)/);
  if (r) return `Registrei a entrada de ${spokenMoney(r[1])}.`;
  r = m.match(/^Na agenda: ([^—]+)/);
  if (r) return `Marquei ${r[1].trim()}.`;
  r = m.match(/^Conta fixa: ([^,]+)/);
  if (r) return `Cadastrei a conta ${r[1].trim()}.`;
  r = m.match(/^Guardado: R\$ ([\d.,]+) em (.+?)\.?$/);
  if (r) return `Guardei ${spokenMoney(r[1])} em ${r[2].trim()}.`;
  const first = m.split(/(?<=[.!?])\s/)[0];
  return first.length > 140 ? `${first.slice(0, 137)}…` : first;
}

// Resposta falada a "é gasto, entrada ou compromisso?".
export function choiceFromSpeech(text: string): "expense" | "income" | "event" | null {
  const t = foldText(text);
  if (/\b(gasto|gastei|despesa|paguei|compra)\b/.test(t)) return "expense";
  if (/\b(entrada|recebi|ganhei|receita)\b/.test(t)) return "income";
  if (/\b(compromisso|agenda|evento|consulta|prova|lembrete)\b/.test(t)) return "event";
  return null;
}
