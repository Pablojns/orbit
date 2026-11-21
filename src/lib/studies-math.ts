// Contas de Estudos sem banco: faltas e dias de aula do horário.
import { addDays, type CalendarDate, diffInDays, fromISODate, toISODate } from "./dates";

export type AbsenceStatus =
  | { kind: "no-limit"; absences: number }
  | { kind: "ok" | "near" | "at-limit" | "over"; absences: number; max: number; left: number };

// "Perto do limite": faltam 2 ou menos, ou já usou 75% ou mais das faltas.
export function absenceStatus(absences: number, max: number | null): AbsenceStatus {
  if (max === null || max === undefined) return { kind: "no-limit", absences };
  const left = max - absences;
  if (left < 0) return { kind: "over", absences, max, left };
  if (left === 0) return { kind: "at-limit", absences, max, left };
  if (left <= 2 || absences >= max * 0.75) return { kind: "near", absences, max, left };
  return { kind: "ok", absences, max, left };
}

export type ClassSlot = {
  id: string;
  subjectId: string;
  subjectName: string;
  weekday: number; // 0 domingo ... 6 sábado
  startsAt: string; // HH:MM
  endsAt: string | null;
  room: string | null;
};

export type Term = { startsOn: string; endsOn: string } | null;

// Datas (AAAA-MM-DD) em que cada aula acontece entre start e end (inclusive),
// respeitando o semestre quando ele foi cadastrado.
export function classOccurrences(slots: ClassSlot[], term: Term, start: CalendarDate, end: CalendarDate) {
  let from = start;
  let to = end;
  if (term) {
    const ts = fromISODate(term.startsOn);
    const te = fromISODate(term.endsOn);
    if (diffInDays(from, ts) > 0) from = ts;
    if (diffInDays(te, to) > 0) to = te;
  }
  const out: { date: string; slot: ClassSlot }[] = [];
  for (let d = from; diffInDays(d, to) >= 0; d = addDays(d, 1)) {
    const wd = new Date(Date.UTC(d.year, d.month - 1, d.day)).getUTCDay();
    for (const s of slots) if (s.weekday === wd) out.push({ date: toISODate(d), slot: s });
  }
  return out.sort((a, b) => (a.date === b.date ? a.slot.startsAt.localeCompare(b.slot.startsAt) : a.date.localeCompare(b.date)));
}

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Acha a matéria pelo nome que a pessoa falou ("calculo", "algoritmo", "ingles").
// Prefere nome igual; depois nome que contém ou está contido; depois palavra em comum.
export function matchSubject<T extends { name: string }>(said: string, subjects: T[]): T | null {
  const q = fold(said);
  if (!q) return null;
  const exact = subjects.find((s) => fold(s.name) === q);
  if (exact) return exact;
  const contains = subjects.filter((s) => fold(s.name).includes(q) || q.includes(fold(s.name)));
  if (contains.length === 1) return contains[0];
  const words = q.split(" ").filter((w) => w.length >= 4);
  const byWord = subjects.filter((s) => fold(s.name).split(" ").some((w) => words.includes(w)));
  return byWord.length === 1 ? byWord[0] : (contains[0] ?? null);
}

// Até quando repete quando a frase não diz: fim do semestre (se houver e for depois)
// ou 12 semanas depois da primeira data.
export function defaultRepeatUntil(firstISO: string, term: Term): string {
  if (term && term.endsOn > firstISO) return term.endsOn;
  const d = fromISODate(firstISO);
  return toISODate(addDays(d, 7 * 12));
}

// Frases de Estudos por regras (antes da IA): são padrões fixos, então as regras acertam sempre.
export type StudyParsed =
  | { intent: "grade"; subject: string; value: number; label: string | null }
  | { intent: "absence"; subject: string; count: number }
  | { intent: "class"; subject: string; weekday: number; time: string; endTime: string | null }
  | { intent: "study_plan"; subject: string; sessions: number };

const NUM_WORDS: Record<string, number> = { um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6 };
const WD: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const hm = (h: string, m?: string) => {
  const hh = Number(h);
  const mm = m ? Number(m) : 0;
  return hh <= 23 && mm <= 59 ? `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}` : null;
};
const clean = (s: string) => s.replace(/[.!?]+$/, "").trim();

export function parseStudyText(text: string): StudyParsed | null {
  const t = text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const original = text.replace(/\s+/g, " ").trim();
  // Recorta da frase original o mesmo trecho achado na versão sem acento (mesmo tamanho).
  const cut = (start: number, len: number) => clean(original.slice(start, start + len));

  let m = /^faltei(?: (\d+|uma|duas|tres) aulas?)?(?: hoje)? (?:em|de|na|no|nas|nos|a aula de) (.+)$/.exec(t);
  if (m) {
    const c = m[1] ? (NUM_WORDS[m[1]] ?? Number(m[1])) : 1;
    const subject = cut(t.lastIndexOf(m[2]), m[2].length);
    return subject ? { intent: "absence", subject, count: Math.min(10, Math.max(1, c)) } : null;
  }

  m = /^(?:tirei|minha nota foi|nota)(?: nota)? (\d{1,3}(?:[.,]\d{1,2})?) (?:na|no|em) (?:(prova|trabalho|atividade|mapa|seminario|p\d|av\d)(?: \d)? (?:de|da|do) )?(.+)$/.exec(
    t,
  );
  if (m) {
    const value = Number(m[1].replace(",", "."));
    const subject = cut(t.lastIndexOf(m[3]), m[3].length);
    const label = m[2] ? m[2].charAt(0).toUpperCase() + m[2].slice(1) : null;
    return subject && value <= 100 ? { intent: "grade", subject, value, label: label === "Seminario" ? "Seminário" : label } : null;
  }

  m =
    /^(?:tenho )?aula de (.+?) (?:toda |todas as |as )?(domingo|segunda|terca|quarta|quinta|sexta|sabado)s?(?:-feiras?)?(?: (?:as|a partir das))? (\d{1,2})(?:h|:)(\d{2})?h?(?: (?:as|ate|-) (\d{1,2})(?:h|:)?(\d{2})?h?)?$/.exec(
      t,
    );
  if (m) {
    const time = hm(m[3], m[4]);
    const end = m[5] ? hm(m[5], m[6]) : null;
    const subject = cut(t.indexOf(m[1], 4), m[1].length);
    return subject && time
      ? { intent: "class", subject, weekday: WD[m[2]], time, endTime: end && end > time ? end : null }
      : null;
  }

  m = /^quero estudar (\d|uma|duas|tres|quatro|cinco|seis) vez(?:es)? (?:para|pra) (?:a )?prova (?:de|da|do) (.+)$/.exec(t);
  if (m) {
    const n = NUM_WORDS[m[1]] ?? Number(m[1]);
    const subject = cut(t.lastIndexOf(m[2]), m[2].length);
    return subject ? { intent: "study_plan", subject, sessions: Math.min(8, n) } : null;
  }
  return null;
}
