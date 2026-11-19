import "server-only";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { firstOfMonthISO, monthlyOccurrences, statementDueDate } from "@/lib/schedule";
import {
  addDays,
  daysInMonth,
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

// ---------- calendário do mês ---------------------------------------

export type CalendarItem = {
  key: string;
  date: string; // AAAA-MM-DD
  time: string | null;
  title: string;
  kind: "exam" | "appointment" | "deadline" | "bill" | "other" | "fixed_bill" | "statement";
  amountCents?: number;
  done: boolean;
  event?: AgendaEvent; // presente quando é um prazo editável
};

export async function getAgendaMonth(year: number, month: number, today: CalendarDate = todayInSaoPaulo()) {
  const supabase = await createClient();
  const last = daysInMonth(year, month);
  const startISO = `${year}-${String(month).padStart(2, "0")}-01`;
  const endISO = `${year}-${String(month).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  const monthISO = firstOfMonthISO(year, month);

  const [events, bills, billPays, inst, cards, payments] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, kind, starts_at, all_day, notes, done_at")
      .eq("user_id", OWNER_ID)
      .gte("starts_at", `${startISO}T00:00:00-03:00`)
      .lte("starts_at", `${endISO}T23:59:59-03:00`)
      .order("starts_at"),
    supabase
      .from("bills")
      .select("id, name, amount_cents, due_day, starts_on, ends_on")
      .eq("user_id", OWNER_ID)
      .eq("is_active", true),
    supabase.from("bill_payments").select("bill_id").eq("user_id", OWNER_ID).eq("reference_month", monthISO),
    supabase
      .from("installments")
      .select("card_id, amount_cents")
      .eq("user_id", OWNER_ID)
      .eq("statement_month", monthISO),
    supabase.from("credit_cards").select("id, name, due_day").eq("user_id", OWNER_ID).eq("is_archived", false),
    supabase
      .from("card_statement_payments")
      .select("card_id, amount_cents")
      .eq("user_id", OWNER_ID)
      .eq("statement_month", monthISO),
  ]);

  const items: CalendarItem[] = [];

  for (const e of events.data ?? []) {
    const { date, time } = localParts(e.starts_at);
    const ev: AgendaEvent = {
      id: e.id,
      title: e.title,
      kind: e.kind,
      date,
      time: e.all_day ? null : time,
      notes: e.notes,
      done: Boolean(e.done_at),
      daysLeft: diffInDays(today, fromISODate(date)),
    };
    items.push({ key: `e-${e.id}`, date, time: ev.time, title: e.title, kind: e.kind, done: ev.done, event: ev });
  }

  const paid = new Set((billPays.data ?? []).map((p) => p.bill_id));
  const start = { year, month, day: 1 };
  const end = { year, month, day: last };
  for (const b of bills.data ?? []) {
    for (const d of monthlyOccurrences(b.due_day, start, end, b.starts_on, b.ends_on)) {
      items.push({
        key: `b-${b.id}`,
        date: toISODate(d),
        time: null,
        title: b.name,
        kind: "fixed_bill",
        amountCents: Number(b.amount_cents),
        done: paid.has(b.id),
      });
    }
  }

  const byCard = new Map<string, number>();
  for (const i of inst.data ?? []) byCard.set(i.card_id, (byCard.get(i.card_id) ?? 0) + Number(i.amount_cents));
  const paidByCard = new Map<string, number>();
  for (const p of payments.data ?? [])
    paidByCard.set(p.card_id, (paidByCard.get(p.card_id) ?? 0) + Number(p.amount_cents));
  for (const c of cards.data ?? []) {
    const total = byCard.get(c.id);
    if (!total) continue;
    items.push({
      key: `s-${c.id}`,
      date: toISODate(statementDueDate(monthISO, c.due_day)),
      time: null,
      title: `Fatura ${c.name}`,
      kind: "statement",
      amountCents: total,
      done: (paidByCard.get(c.id) ?? 0) >= total,
    });
  }

  items.sort((a, b) =>
    a.date === b.date ? (a.time ?? "99").localeCompare(b.time ?? "99") : a.date.localeCompare(b.date),
  );
  return { items, daysInMonth: last };
}
