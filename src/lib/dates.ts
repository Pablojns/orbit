// Datas "de calendário" (sem hora), sempre no fuso de São Paulo.
export const TIME_ZONE = "America/Sao_Paulo";

export type CalendarDate = { year: number; month: number; day: number }; // month: 1–12

export function todayInSaoPaulo(now: Date = new Date()): CalendarDate {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

export function daysInMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function toUTC(d: CalendarDate) {
  return Date.UTC(d.year, d.month - 1, d.day);
}

export function fromUTC(ms: number): CalendarDate {
  const date = new Date(ms);
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

export function addDays(d: CalendarDate, days: number): CalendarDate {
  return fromUTC(toUTC(d) + days * 86_400_000);
}

export function diffInDays(a: CalendarDate, b: CalendarDate) {
  return Math.round((toUTC(b) - toUTC(a)) / 86_400_000);
}

export function formatShort(d: CalendarDate) {
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(toUTC(d)))
    .replace(".", "");
}

export function toISODate(d: CalendarDate) {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

export function fromISODate(s: string): CalendarDate {
  const [year, month, day] = s.split("-").map(Number);
  return { year, month, day };
}

export function formatDayLabel(iso: string, today: CalendarDate) {
  const d = fromISODate(iso);
  const diff = diffInDays(d, today);
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Ontem";
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(toUTC(d)))
    .replace(/\./g, "");
}
