// Regras de calendário do dinheiro: faturas de cartão, parcelas e
// ocorrências de contas e entradas fixas dentro de um ciclo.
// Funções puras (sem banco), testadas em scripts/test-schedule.ts.
import { type CalendarDate, daysInMonth, diffInDays, fromISODate, toISODate } from "./dates";

export function addMonths(year: number, month: number, n: number) {
  const index = year * 12 + (month - 1) + n;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function clampDay(year: number, month: number, day: number): CalendarDate {
  return { year, month, day: Math.min(day, daysInMonth(year, month)) };
}

export function firstOfMonthISO(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}-01`;
}

// Em qual fatura (mês de VENCIMENTO, como "AAAA-MM-01") cai uma compra feita em `purchased`.
// Compra antes do dia de fechamento: fatura que fecha neste mês.
// Compra no dia do fechamento ou depois: fatura do mês seguinte.
export function statementMonthFor(purchased: CalendarDate, closingDay: number, dueDay: number) {
  const closingThisMonth = clampDay(purchased.year, purchased.month, closingDay);
  const closing =
    diffInDays(purchased, closingThisMonth) > 0
      ? { year: purchased.year, month: purchased.month }
      : addMonths(purchased.year, purchased.month, 1);
  const due = dueDay > closingDay ? closing : addMonths(closing.year, closing.month, 1);
  return firstOfMonthISO(due.year, due.month);
}

export function statementDueDate(statementMonthISO: string, dueDay: number): CalendarDate {
  const { year, month } = fromISODate(statementMonthISO);
  return clampDay(year, month, dueDay);
}

export function statementClosingDate(statementMonthISO: string, closingDay: number, dueDay: number): CalendarDate {
  const { year, month } = fromISODate(statementMonthISO);
  const closing = dueDay > closingDay ? { year, month } : addMonths(year, month, -1);
  return clampDay(closing.year, closing.month, closingDay);
}

// Divide o total em parcelas; a sobra de centavos fica na 1ª.
export function splitInstallments(totalCents: number, count: number) {
  const base = Math.floor(totalCents / count);
  const rest = totalCents - base * count;
  return Array.from({ length: count }, (_, i) => base + (i === 0 ? rest : 0));
}

export function installmentPlan(
  purchased: CalendarDate,
  totalCents: number,
  count: number,
  closingDay: number,
  dueDay: number,
) {
  const first = fromISODate(statementMonthFor(purchased, closingDay, dueDay));
  return splitInstallments(totalCents, count).map((amountCents, i) => {
    const m = addMonths(first.year, first.month, i);
    return { number: i + 1, amountCents, statementMonth: firstOfMonthISO(m.year, m.month) };
  });
}

// Datas em que algo que acontece "todo dia X" cai dentro de [start, end],
// respeitando início e fim opcionais.
export function monthlyOccurrences(
  dayOfMonth: number,
  start: CalendarDate,
  end: CalendarDate,
  startsOn?: string | null,
  endsOn?: string | null,
): CalendarDate[] {
  const result: CalendarDate[] = [];
  let cursor = { year: start.year, month: start.month };
  for (let i = 0; i < 3; i++) {
    const date = clampDay(cursor.year, cursor.month, dayOfMonth);
    const inCycle = diffInDays(start, date) >= 0 && diffInDays(date, end) >= 0;
    const afterStart = !startsOn || diffInDays(fromISODate(startsOn), date) >= 0;
    const beforeEnd = !endsOn || diffInDays(date, fromISODate(endsOn)) >= 0;
    if (inCycle && afterStart && beforeEnd) result.push(date);
    cursor = addMonths(cursor.year, cursor.month, 1);
  }
  return result;
}

export function inRange(iso: string, start: CalendarDate, end: CalendarDate) {
  const s = toISODate(start);
  const e = toISODate(end);
  return iso >= s && iso <= e;
}
