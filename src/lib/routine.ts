import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import {
  addDays,
  type CalendarDate,
  diffInDays,
  fromISODate,
  todayInSaoPaulo,
  toISODate,
  TIME_ZONE,
} from "@/lib/dates";

export type AgendaEvent = {
  id: string;
  title: string;
  kind: "exam" | "appointment" | "deadline" | "bill" | "other";
  date: string; // AAAA-MM-DD no fuso de São Paulo
  time: string | null; // HH:MM
  notes: string | null;
  done: boolean;
  daysLeft: number;
};

export type Task = { id: string; title: string; priority: number; dueOn: string | null; done: boolean };

export type Habit = {
  id: string;
  name: string;
  targetPerWeek: number;
  checkedToday: boolean;
  weekCount: number;
  streak: number; // dias seguidos até hoje (ou até ontem, se hoje ainda não marcou)
  last7: { date: string; checked: boolean }[];
};

function localParts(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(d);
  return { date, time };
}

export async function getAgenda(today: CalendarDate = todayInSaoPaulo()) {
  const supabase = await createClient();
  const from = toISODate(addDays(today, -7));
  const [events, tasks] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, kind, starts_at, all_day, notes, done_at")
      .eq("user_id", OWNER_ID)
      .gte("starts_at", `${from}T00:00:00-03:00`)
      .order("starts_at"),
    supabase
      .from("tasks")
      .select("id, title, priority, due_on, done_at, created_at")
      .eq("user_id", OWNER_ID)
      .order("done_at", { ascending: true, nullsFirst: true })
      .order("priority")
      .order("due_on", { ascending: true, nullsFirst: false }),
  ]);

  const list: AgendaEvent[] = (events.data ?? []).map((e) => {
    const { date, time } = localParts(e.starts_at);
    return {
      id: e.id,
      title: e.title,
      kind: e.kind,
      date,
      time: e.all_day ? null : time,
      notes: e.notes,
      done: Boolean(e.done_at),
      daysLeft: diffInDays(today, fromISODate(date)),
    };
  });

  const taskList: Task[] = (tasks.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    dueOn: t.due_on,
    done: Boolean(t.done_at),
  }));

  return {
    upcoming: list.filter((e) => e.daysLeft >= 0 && !e.done),
    overdue: list.filter((e) => e.daysLeft < 0 && !e.done),
    done: list.filter((e) => e.done),
    tasks: taskList,
  };
}

export async function getHabits(today: CalendarDate = todayInSaoPaulo()): Promise<Habit[]> {
  const supabase = await createClient();
  const since = toISODate(addDays(today, -60));
  const [habits, checks] = await Promise.all([
    supabase
      .from("habits")
      .select("id, name, target_per_week")
      .eq("user_id", OWNER_ID)
      .eq("is_archived", false)
      .order("created_at"),
    supabase.from("habit_checks").select("habit_id, checked_on").eq("user_id", OWNER_ID).gte("checked_on", since),
  ]);

  const byHabit = new Map<string, Set<string>>();
  for (const c of checks.data ?? []) {
    if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, new Set());
    byHabit.get(c.habit_id)!.add(c.checked_on);
  }

  const todayISO = toISODate(today);
  return (habits.data ?? []).map((h) => {
    const set = byHabit.get(h.id) ?? new Set<string>();
    const last7 = Array.from({ length: 7 }, (_, i) => {
      const date = toISODate(addDays(today, i - 6));
      return { date, checked: set.has(date) };
    });
    let streak = 0;
    let cursor = set.has(todayISO) ? today : addDays(today, -1);
    while (set.has(toISODate(cursor))) {
      streak++;
      cursor = addDays(cursor, -1);
    }
    return {
      id: h.id,
      name: h.name,
      targetPerWeek: h.target_per_week,
      checkedToday: set.has(todayISO),
      weekCount: last7.filter((d) => d.checked).length,
      streak,
      last7,
    };
  });
}
