// Entende frases de agenda como "prova facul sexta algoritmo e lógica",
// "entrega do trabalho dia 28 23h", "dentista amanhã 14h30" ou "reunião 02/12 às 9".
import { addDays, type CalendarDate, toISODate } from "./dates";

export type AgendaParsed = {
  kind: "exam" | "deadline" | "appointment" | "other";
  title: string;
  date: string; // AAAA-MM-DD
  time: string | null; // HH:MM
  summary: string;
};

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

const KIND_WORDS: [AgendaParsed["kind"], string[], string][] = [
  ["exam", ["prova", "provas", "avaliacao", "simulado", "teste"], "Prova"],
  ["deadline", ["trabalho", "entrega", "entregar", "prazo", "tcc", "atividade", "mapa", "relatorio", "seminario"], "Entrega"],
  ["appointment", ["consulta", "dentista", "medico", "reuniao", "entrevista", "aula", "exame", "compromisso", "encontro"], ""],
];

const WEEKDAYS: Record<string, number> = {
  domingo: 0,
  segunda: 1,
  "segunda-feira": 1,
  terca: 2,
  "terca-feira": 2,
  quarta: 3,
  "quarta-feira": 3,
  quinta: 4,
  "quinta-feira": 4,
  sexta: 5,
  "sexta-feira": 5,
  sabado: 6,
};

// Palavras que só ligam a frase e não entram no título.
const FILLER = new Set(["facul", "faculdade", "na", "no", "de", "da", "do", "dia", "as", "a", "que", "vem", "proxima", "proximo", "feira", "em", "pra", "para"]);

function weekdayOf(d: CalendarDate) {
  return new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
}

function capitalize(s: string) {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const WEEK_LABEL = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** Retorna null quando a frase não parece ser de agenda (ex.: tem valor em dinheiro). */
export function parseAgendaText(text: string, today: CalendarDate): AgendaParsed | null {
  const original = text.trim().replace(/\s+/g, " ");
  const words = original.split(" ");
  const keys = words.map(norm);
  const used = new Array(words.length).fill(false);

  let date: CalendarDate | null = null;
  let time: string | null = null;
  let kind: AgendaParsed["kind"] | null = null;
  let label = "";

  for (let i = 0; i < keys.length; i++) {
    const k = keys[i].replace(/[.,;!?]$/, "");
    if (!date) {
      if (k === "hoje") {
        date = today;
        used[i] = true;
        continue;
      }
      if (k === "amanha") {
        date = addDays(today, 1);
        used[i] = true;
        continue;
      }
      if (k === "depois" && keys[i + 1] === "de" && norm(keys[i + 2] ?? "") === "amanha") {
        date = addDays(today, 2);
        used[i] = used[i + 1] = used[i + 2] = true;
        continue;
      }
      if (k in WEEKDAYS) {
        const target = WEEKDAYS[k];
        const ahead = (target - weekdayOf(today) + 7) % 7;
        date = addDays(today, ahead);
        used[i] = true;
        if (keys[i + 1] === "feira" || keys[i + 1] === "-feira") used[i + 1] = true;
        continue;
      }
      const dm = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/.exec(k);
      if (dm) {
        const day = Number(dm[1]);
        const month = Number(dm[2]);
        let year = dm[3] ? Number(dm[3].length === 2 ? `20${dm[3]}` : dm[3]) : today.year;
        if (!dm[3] && (month < today.month || (month === today.month && day < today.day))) year++;
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          date = { year, month, day };
          used[i] = true;
          continue;
        }
      }
      if (k === "dia" && /^\d{1,2}$/.test(keys[i + 1] ?? "")) {
        const day = Number(keys[i + 1]);
        if (day >= 1 && day <= 31) {
          let { year, month } = today;
          if (day < today.day) {
            month++;
            if (month > 12) {
              month = 1;
              year++;
            }
          }
          date = { year, month, day };
          used[i] = used[i + 1] = true;
          continue;
        }
      }
    }
    if (!time) {
      const tm = /^(\d{1,2})(?:h|:)(\d{2})?h?$/.exec(k) ?? /^(\d{1,2})h(\d{2})$/.exec(k);
      const unitNext = /^(h|hs|hr|hrs|hora|horas)$/.test(keys[i + 1] ?? "") && /^\d{1,2}$/.test(k);
      const compact = /^(\d{1,2})(hs|hr|hrs|horas?)$/.exec(k);
      const afterAs = ((keys[i - 1] === "as" || keys[i - 1] === "às") && /^\d{1,2}$/.test(k)) || unitNext || !!compact;
      if ((tm && (k.includes("h") || k.includes(":"))) || afterAs) {
        const h = Number(tm ? tm[1] : compact ? compact[1] : k);
        const m = tm && tm[2] ? Number(tm[2]) : 0;
        if (h <= 23 && m <= 59) {
          time = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
          used[i] = true;
          if (afterAs && !unitNext && !compact) used[i - 1] = true;
          if (unitNext) used[i + 1] = true;
          continue;
        }
      }
    }
    if (!kind) {
      for (const [kk, list, lab] of KIND_WORDS) {
        if (list.includes(k)) {
          kind = kk;
          label = lab || capitalize(words[i].replace(/[.,;!?]$/, ""));
          used[i] = true;
          break;
        }
      }
    }
  }

  if (!date && !kind) return null;
  const moneyWord = keys.some((k) => ["pix", "debito", "credito", "dinheiro", "reais", "r$"].includes(k));
  if (kind && !time && !moneyWord) {
    const idx = keys.findIndex((k, i) => !used[i] && /^\d{1,2}$/.test(k) && Number(k) <= 23);
    if (idx >= 0) {
      time = `${keys[idx].padStart(2, "0")}:00`;
      used[idx] = true;
    }
  }
  // Sobrou número solto (ex.: "mercado 45 amanhã")? Então é dinheiro, não agenda.
  if (keys.some((k, i) => !used[i] && /^r?\$?\d+([.,]\d+)?$/.test(k))) return null;
  if (keys.some((k, i) => !used[i] && ["pix", "debito", "credito", "dinheiro", "reais"].includes(k))) return null;

  const rest = words
    .filter((_, i) => !used[i])
    .map((w) => w.replace(/[.,;!?]$/, ""))
    .filter((w, idx, arr) => {
      const n = norm(w);
      // tira conectivos só nas pontas, para manter "algoritmo e lógica"
      if (!FILLER.has(n)) return true;
      const before = arr.slice(0, idx).some((x) => !FILLER.has(norm(x)));
      const after = arr.slice(idx + 1).some((x) => !FILLER.has(norm(x)));
      return before && after && !["facul", "faculdade", "dia", "feira", "vem"].includes(n);
    })
    .join(" ")
    .trim();

  const finalKind = kind ?? "other";
  const title = (label ? (rest ? `${label}: ${rest}` : label) : capitalize(rest) || "Compromisso").slice(0, 80);
  const d = date ?? today;
  const iso = toISODate(d);
  const when = `${WEEK_LABEL[weekdayOf(d)]} ${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}`;
  const avisos = time ? "Aviso na véspera, no dia e 3 horas antes." : "Aviso na véspera e no dia.";
  return {
    kind: finalKind,
    title,
    date: iso,
    time,
    summary: `${title} — ${when}${time ? ` às ${time}` : ""}. ${avisos}`,
  };
}
