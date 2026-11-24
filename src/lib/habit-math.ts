import { addDays, type CalendarDate, toISODate } from "./dates";

// Sequência = dias seguidos marcados até hoje. Se hoje ainda não foi marcado, conta a partir de ontem.
export function habitStreak(checked: Set<string>, today: CalendarDate): number {
  let streak = 0;
  let cursor = checked.has(toISODate(today)) ? today : addDays(today, -1);
  while (checked.has(toISODate(cursor))) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

// Hábito com meta semanal: semanas seguidas (segunda a domingo) em que a meta foi batida.
// A semana atual só entra se já bateu a meta; se não, a contagem parte da semana passada.
export function weeklyStreak(checked: Set<string>, today: CalendarDate, target: number): number {
  const wd = new Date(Date.UTC(today.year, today.month - 1, today.day)).getUTCDay(); // 0 = domingo
  const monday = addDays(today, -((wd + 6) % 7));
  const countWeek = (start: CalendarDate) => {
    let n = 0;
    for (let i = 0; i < 7; i++) if (checked.has(toISODate(addDays(start, i)))) n++;
    return n;
  };
  let start = countWeek(monday) >= target ? monday : addDays(monday, -7);
  let streak = 0;
  for (let guard = 0; guard < 60 && countWeek(start) >= target; guard++) {
    streak++;
    start = addDays(start, -7);
  }
  return streak;
}
