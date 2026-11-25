// Seletor de período do Extrato (Rodada 13).
import { type CalendarDate, daysInMonth, diffInDays, fromISODate, toISODate } from "./dates";
import { currentCycle } from "./cycle";

export type PeriodKind = "ciclo" | "mes" | "mes-passado" | "ano" | "personalizado";
export const PERIODS: { kind: PeriodKind; label: string }[] = [
  { kind: "ciclo", label: "Este ciclo" },
  { kind: "mes", label: "Este mês" },
  { kind: "mes-passado", label: "Mês passado" },
  { kind: "ano", label: "Este ano" },
  { kind: "personalizado", label: "Personalizado" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function periodRange(
  kind: string | undefined,
  today: CalendarDate,
  cycleStartDay: number,
  de?: string,
  ate?: string,
): { kind: PeriodKind; start: CalendarDate; end: CalendarDate } {
  const k = (PERIODS.find((p) => p.kind === kind)?.kind ?? "ciclo") as PeriodKind;
  if (k === "mes") {
    return { kind: k, start: { ...today, day: 1 }, end: { ...today, day: daysInMonth(today.year, today.month) } };
  }
  if (k === "mes-passado") {
    const y = today.month === 1 ? today.year - 1 : today.year;
    const m = today.month === 1 ? 12 : today.month - 1;
    return { kind: k, start: { year: y, month: m, day: 1 }, end: { year: y, month: m, day: daysInMonth(y, m) } };
  }
  if (k === "ano") {
    return { kind: k, start: { year: today.year, month: 1, day: 1 }, end: { year: today.year, month: 12, day: 31 } };
  }
  if (k === "personalizado" && de && ate && ISO.test(de) && ISO.test(ate)) {
    let a = fromISODate(de);
    let b = fromISODate(ate);
    if (diffInDays(a, b) < 0) [a, b] = [b, a];
    // no máximo 2 anos, para a consulta não ficar pesada
    if (diffInDays(a, b) > 731) a = fromISODate(`${b.year - 2}-${String(b.month).padStart(2, "0")}-${String(b.day).padStart(2, "0")}`);
    return { kind: k, start: a, end: b };
  }
  const c = currentCycle(today, cycleStartDay);
  return { kind: k === "personalizado" ? "personalizado" : "ciclo", start: c.start, end: c.end };
}

export function periodLabel(start: CalendarDate, end: CalendarDate) {
  const f = (d: CalendarDate) => `${String(d.day).padStart(2, "0")}/${String(d.month).padStart(2, "0")}`;
  return start.year === end.year ? `${f(start)} a ${f(end)}` : `${toISODate(start)} a ${toISODate(end)}`;
}
