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
