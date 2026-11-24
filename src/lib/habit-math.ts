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
