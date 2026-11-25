// Palavra de chamada: "Dimeta" (aceita "di meta", "dimetá", "d'meta"). "de meta" ficou de fora na
// Rodada 14: aparece em frases comuns ("quanto falta de meta") e abria sem querer.
export function hasWakeWord(text: string): boolean {
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z ]/g, " ");
  return /\b(dimeta|di meta|dee meta|d meta|dmeta|dhimeta|dimetta)\b/.test(t);
}

// Palmas (Rodada 14): só duas batidas SECAS, com 150 a 600 ms entre elas e silêncio antes,
// entre e depois. Som contínuo (voz, música, tosse longa) não conta.
// Recebe o volume de pico (0 a 1) de cada pedacinho de áudio (~20 ms) com o horário dele.
export const CLAP = {
  loud: 0.3, // pico mínimo de uma batida
  quiet: 0.06, // abaixo disso é silêncio
  silenceBeforeMs: 250,
  silenceAfterMs: 300,
  maxBurstMs: 90, // uma batida acaba rápido; voz e barulho contínuo passam disso
  minGapMs: 150,
  maxGapMs: 600,
};

type ClapState = "idle" | "burst1" | "gap" | "burst2" | "after";

export class ClapDetector {
  private state: ClapState = "idle";
  private lastLoudAt = -Infinity; // último pedaço acima de "quiet"
  private burstStart = 0;
  private firstOnset = 0;
  private burstEnd = 0;

  // Devolve true quando as duas palmas terminam (com o silêncio depois).
  push(t: number, level: number): boolean {
    const isQuiet = level < CLAP.quiet;
    const isLoud = level >= CLAP.loud;
    const quietSince = t - this.lastLoudAt;
    let fired = false;
    switch (this.state) {
      case "idle":
        if (isLoud && quietSince >= CLAP.silenceBeforeMs) {
          this.state = "burst1";
          this.burstStart = t;
          this.firstOnset = t;
        }
        break;
      case "burst1":
      case "burst2":
        if (isQuiet) {
          this.state = this.state === "burst1" ? "gap" : "after";
          this.burstEnd = t;
        } else if (t - this.burstStart > CLAP.maxBurstMs) this.reset();
        break;
      case "gap": {
        const gap = t - this.firstOnset;
        if (gap > CLAP.maxGapMs) {
          this.reset();
          break;
        }
        if (isLoud) {
          if (gap < CLAP.minGapMs) this.reset();
          else {
            this.state = "burst2";
            this.burstStart = t;
          }
        } else if (!isQuiet) this.reset(); // barulho no meio: não é palma
        break;
      }
      case "after":
        if (!isQuiet) this.reset();
        else if (t - this.burstEnd >= CLAP.silenceAfterMs) {
          fired = true;
          this.reset();
        }
        break;
    }
    if (!isQuiet) this.lastLoudAt = t;
    return fired;
  }

  reset() {
    this.state = "idle";
  }
}

// O Whisper às vezes "inventa" frases em áudio quase vazio. Estas são descartadas.
const HALLUCINATIONS = [
  /legendas? (pela|por) comunidade/i,
  /amara\.org/i,
  /obrigad[oa] por assistir/i,
  /inscreva-se/i,
  /^\W*(tchau|obrigad[oa]|ok|hum+|ah+)\W*$/i,
];
export function cleanTranscript(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || /^[\W\d]*$/.test(t) && !/\d/.test(t)) return "";
  if (HALLUCINATIONS.some((r) => r.test(t))) return "";
  return t.replace(/\bnu ?pix\b/gi, "no pix"); // "no pix" às vezes sai grudado
}

// Resposta falada: no máximo 1 frase.
export function firstSentence(text: string): string {
  const first = text.trim().split(/(?<=[.!?])\s/)[0] ?? "";
  return first.length > 140 ? `${first.slice(0, 137)}…` : first;
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
