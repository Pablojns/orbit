// Data de um gasto ou entrada dita na frase. Dinheiro é sempre passado ou hoje:
// "ontem", "anteontem", "dia 12", "12/11", "sábado passado", "na sexta", "há 3 dias".
// "semana passada" / "mês passado" sem o dia: não dá para saber, então pergunta.
// Funções puras, testadas em scripts/test-money-date.ts.
import { addDays, type CalendarDate, diffInDays, toISODate } from "./dates";
import { clampDay } from "./schedule";

export type MoneyDate =
  // words: palavras usadas, para tirar da descrição. explicit: data sem dúvida de passado
  // (ontem, 12/11, dia 12, "sábado passado"); um dia da semana solto pode ser futuro na agenda.
  | { kind: "found"; date: string; words: string[]; explicit?: boolean }
  | { kind: "vague"; words: string[] } // falou de um tempo sem dia exato: perguntar
  | { kind: "none" };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const WD: Record<string, number> = {
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

function pastOrToday(d: CalendarDate, today: CalendarDate) {
  return diffInDays(d, today) >= 0;
}

export function findMoneyDate(text: string, today: CalendarDate): MoneyDate {
  const t = norm(text);
  let m: RegExpExecArray | null;

  if (/\bhoje\b/.test(t)) return { kind: "found", date: toISODate(today), words: ["hoje"] };
  if ((m = /\banteontem\b/.exec(t))) return { kind: "found", date: toISODate(addDays(today, -2)), words: ["anteontem"], explicit: true };
  if ((m = /\bontem\b/.exec(t))) return { kind: "found", date: toISODate(addDays(today, -1)), words: ["ontem"], explicit: true };
  if ((m = /\b(?:ha|faz) (\d{1,2}) dias?\b/.exec(t))) {
    return { kind: "found", date: toISODate(addDays(today, -Number(m[1]))), words: m[0].split(" "), explicit: true };
  }

  // 12/11 ou 12/11/2026 (sempre a data passada mais próxima quando não tem ano)
  if ((m = /\b(?:dia |em |no dia )?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/.exec(t))) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      let year = m[3] ? Number(m[3].length === 2 ? `20${m[3]}` : m[3]) : today.year;
      let d = clampDay(year, month, day);
      if (!m[3] && !pastOrToday(d, today)) {
        year -= 1;
        d = clampDay(year, month, day);
      }
      return { kind: "found", date: toISODate(d), words: m[0].split(" "), explicit: true };
    }
  }

  // "dia 12": este mês, ou o mês passado se o dia ainda não chegou
  if ((m = /\bdia (\d{1,2})\b/.exec(t))) {
    const day = Number(m[1]);
    if (day >= 1 && day <= 31) {
      let d = clampDay(today.year, today.month, day);
      if (!pastOrToday(d, today)) {
        const prev = today.month === 1 ? { y: today.year - 1, mo: 12 } : { y: today.year, mo: today.month - 1 };
        d = clampDay(prev.y, prev.mo, day);
      }
      return { kind: "found", date: toISODate(d), words: m[0].split(" "), explicit: true };
    }
  }

  // "sábado passado", "na sexta", "segunda": o último desse dia (hoje conta só sem "passado")
  if ((m = /\b(?:(?:na|no|nessa|nesse|essa|esse) )?(domingo|segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado)( passad[oa])?\b/.exec(t))) {
    const target = WD[m[1]];
    const todayWd = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay();
    let back = (todayWd - target + 7) % 7;
    if (back === 0 && m[2]) back = 7;
    return { kind: "found", date: toISODate(addDays(today, -back)), words: m[0].split(" "), explicit: Boolean(m[2]) };
  }

  if ((m = /\b(semana passada|mes passado|outro dia|esses dias|uns dias atras|semana retrasada)\b/.exec(t))) {
    return { kind: "vague", words: m[0].split(" ") };
  }
  return { kind: "none" };
}

// "19/11" para mostrar na mensagem de sucesso.
export function shortDate(iso: string) {
  const [, mo, d] = iso.split("-");
  return `${d}/${mo}`;
}
