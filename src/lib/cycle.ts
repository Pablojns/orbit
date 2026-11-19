import { addDays, type CalendarDate, daysInMonth, diffInDays } from "./dates";

// O "mês financeiro" começa no dia escolhido pela pessoa (ex.: dia do salário).
// Se o mês não tem esse dia (ex.: 30 em fevereiro), o ciclo começa no último dia do mês.
export function cycleStartFor(year: number, month: number, startDay: number): CalendarDate {
  return { year, month, day: Math.min(startDay, daysInMonth(year, month)) };
}

export type Cycle = {
  start: CalendarDate;
  end: CalendarDate; // último dia do ciclo (inclusive)
  dayNumber: number; // hoje é o dia N do ciclo (1 = primeiro dia)
  totalDays: number;
  daysLeft: number; // dias restantes depois de hoje
};

export function currentCycle(today: CalendarDate, startDay: number): Cycle {
  const thisMonthStart = cycleStartFor(today.year, today.month, startDay);

  let start: CalendarDate;
  if (diffInDays(thisMonthStart, today) >= 0) {
    start = thisMonthStart;
  } else {
    const prevMonth = today.month === 1 ? 12 : today.month - 1;
    const prevYear = today.month === 1 ? today.year - 1 : today.year;
    start = cycleStartFor(prevYear, prevMonth, startDay);
  }

  const nextMonth = start.month === 12 ? 1 : start.month + 1;
  const nextYear = start.month === 12 ? start.year + 1 : start.year;
  const nextStart = cycleStartFor(nextYear, nextMonth, startDay);
  const end = addDays(nextStart, -1);

  const totalDays = diffInDays(start, end) + 1;
  const dayNumber = diffInDays(start, today) + 1;

  return { start, end, dayNumber, totalDays, daysLeft: totalDays - dayNumber };
}
