import "server-only";
import { habitStreak, weeklyStreak } from "./habit-math";
import { createClient } from "@/lib/supabase/server";
import { OWNER_ID } from "@/lib/owner";
import { firstOfMonthISO, monthlyOccurrences, statementDueDate } from "@/lib/schedule";
import { classOccurrences } from "@/lib/studies-math";
import { getClassSlots, getTerm } from "@/lib/class-slots";
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
  kind: "exam" | "appointment" | "deadline" | "bill" | "other" | "study";
  date: string; // AAAA-MM-DD no fuso de São Paulo
  time: string | null; // HH:MM
  notes: string | null;
  done: boolean;
  daysLeft: number;
  seriesId: string | null;
  remindDays: number;
  typeId: string | null;
  typeName: string;
  color: string; // cor do tipo (#RRGGBB)
  priority: number | null; // 1 alta, 2 média, 3 baixa, ou sem prioridade
  subjectId: string | null; // matéria de Estudos, quando é prova ou trabalho
};

// Tipos da agenda: a pessoa cria, renomeia e arquiva. "baseKind" diz o comportamento.
export type EventType = {
  id: string;
  name: string;
  color: string;
  baseKind: AgendaEvent["kind"];
  archived: boolean;
};

export const DEFAULT_EVENT_TYPES: { name: string; color: string; baseKind: AgendaEvent["kind"] }[] = [
  { name: "Prova", color: "#3B82F6", baseKind: "exam" },
  { name: "Compromisso", color: "#F4B740", baseKind: "appointment" },
  { name: "Entrega", color: "#FF7A93", baseKind: "deadline" },
  { name: "Lembrete", color: "#94A3B8", baseKind: "other" },
  { name: "Estudo", color: "#22D3EE", baseKind: "study" },
];

// Para itens sem tipo (antigos ou criados pela frase), usa o padrão do comportamento.
const FALLBACK_TYPE: Record<AgendaEvent["kind"], { name: string; color: string }> = {
  exam: { name: "Prova", color: "#3B82F6" },
  appointment: { name: "Compromisso", color: "#F4B740" },
  deadline: { name: "Entrega", color: "#FF7A93" },
  other: { name: "Lembrete", color: "#94A3B8" },
  study: { name: "Estudo", color: "#22D3EE" },
  bill: { name: "Conta", color: "#B49BFF" },
};

export async function getEventTypes(): Promise<EventType[]> {
  const supabase = await createClient();
  const read = () =>
    supabase
      .from("event_types")
      .select("id, name, color, base_kind, is_archived")
      .eq("user_id", OWNER_ID)
      .order("position")
      .order("created_at");
  let { data } = await read();
  if (data && data.length === 0) {
    await supabase.from("event_types").insert(
      DEFAULT_EVENT_TYPES.map((t, i) => ({
        user_id: OWNER_ID,
        name: t.name,
        color: t.color,
        base_kind: t.baseKind,
        position: i + 1,
      })),
    );
    ({ data } = await read());
  }
  return (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    baseKind: t.base_kind,
    archived: Boolean(t.is_archived),
  }));
}

const EVENT_COLUMNS =
  "id, title, kind, starts_at, all_day, notes, done_at, series_id, remind_days, type_id, priority, subject_id, type:event_types(name, color)";

type EventRowData = {
  id: string;
  title: string;
  kind: AgendaEvent["kind"];
  starts_at: string;
  all_day: boolean;
  notes: string | null;
  done_at: string | null;
  series_id: string | null;
  remind_days: number | null;
  type_id: string | null;
  priority: number | null;
  subject_id: string | null;
  type: { name: string; color: string } | { name: string; color: string }[] | null;
};

function toEvent(e: EventRowData, today: CalendarDate): AgendaEvent {
  const { date, time } = localParts(e.starts_at);
  const t = Array.isArray(e.type) ? (e.type[0] ?? null) : e.type;
  const fb = FALLBACK_TYPE[e.kind] ?? FALLBACK_TYPE.other;
  return {
    id: e.id,
    title: e.title,
    kind: e.kind,
    date,
    time: e.all_day ? null : time,
    notes: e.notes,
    done: Boolean(e.done_at),
    daysLeft: diffInDays(today, fromISODate(date)),
    seriesId: e.series_id,
    remindDays: e.remind_days ?? 0,
    typeId: e.type_id,
    typeName: t?.name ?? fb.name,
    color: t?.color ?? fb.color,
    priority: e.priority ?? null,
    subjectId: e.subject_id ?? null,
  };
}

export type ChecklistItem = { id: string; text: string; done: boolean };

// Passos (checklist) de provas e tarefas, agrupados pelo item dono.
export async function getChecklists() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("checklist_items")
    .select("id, parent_id, text, done")
    .eq("user_id", OWNER_ID)
    .order("created_at");
  const map: Record<string, ChecklistItem[]> = {};
  for (const r of data ?? []) (map[r.parent_id] ??= []).push({ id: r.id, text: r.text, done: r.done });
  return map;
}

export type Task = { id: string; title: string; priority: number; dueOn: string | null; done: boolean };

export type Habit = {
  id: string;
  name: string;
  targetPerWeek: number;
  checkedToday: boolean;
  weekCount: number;
  streak: number; // dias seguidos até hoje (ou até ontem, se hoje ainda não marcou)
  last7: { date: string; checked: boolean }[];
  last14: { date: string; checked: boolean }[];
  streakUnit: "dias" | "semanas"; // diário conta dias seguidos; meta semanal conta semanas seguidas
  history: { date: string; checked: boolean }[]; // últimos 35 dias, para a grade mensal
};

function localParts(iso: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", { timeZone: TIME_ZONE, hour: "2-digit", minute: "2-digit" }).format(d);
  return { date, time };
}

export async function getAgenda(today: CalendarDate = todayInSaoPaulo()) {
  const supabase = await createClient();
  const from = toISODate(addDays(today, -30)); // atrasados do último mês
  const [events, tasks] = await Promise.all([
    supabase
      .from("events")
      .select(EVENT_COLUMNS)
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

  const list: AgendaEvent[] = ((events.data ?? []) as EventRowData[]).map((e) => toEvent(e, today));

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
    const last14 = Array.from({ length: 14 }, (_, i) => {
      const date = toISODate(addDays(today, i - 13));
      return { date, checked: set.has(date) };
    });
    const weekly = h.target_per_week < 7;
    const streak = weekly ? weeklyStreak(set, today, h.target_per_week) : habitStreak(set, today);
    const history = Array.from({ length: 35 }, (_, i) => {
      const date = toISODate(addDays(today, i - 34));
      return { date, checked: set.has(date) };
    });
    return {
      id: h.id,
      name: h.name,
      targetPerWeek: h.target_per_week,
      checkedToday: set.has(todayISO),
      weekCount: last7.filter((d) => d.checked).length,
      streak,
      last7,
      last14,
      streakUnit: weekly ? ("semanas" as const) : ("dias" as const),
      history,
    };
  });
}

// ---------- calendário do mês ---------------------------------------

export type CalendarItem = {
  key: string;
  date: string; // AAAA-MM-DD
  time: string | null;
  title: string;
  kind: "exam" | "appointment" | "deadline" | "bill" | "other" | "study" | "fixed_bill" | "statement" | "task" | "class";
  amountCents?: number;
  done: boolean;
  event?: AgendaEvent; // presente quando é um prazo editável
  task?: Task; // presente quando é uma tarefa com data
  room?: string | null; // aula: sala
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
      .select(EVENT_COLUMNS)
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

  // Tarefa deixou de ser tipo separado (21/11): o calendário mostra só itens da agenda, contas e faturas.
  const items: CalendarItem[] = [];

  for (const e of (events.data ?? []) as EventRowData[]) {
    const ev = toEvent(e, today);
    items.push({
      key: `e-${e.id}`,
      date: ev.date,
      time: ev.time,
      title: e.title,
      kind: e.kind,
      done: ev.done,
      event: ev,
    });
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

  // Aulas do horário de Estudos (só para mostrar; editar é em Estudos).
  const [slots, term] = await Promise.all([getClassSlots(), getTerm()]);
  for (const o of classOccurrences(slots, term, start, end)) {
    items.push({
      key: `a-${o.slot.id}-${o.date}`,
      date: o.date,
      time: o.slot.startsAt,
      title: `Aula: ${o.slot.subjectName}`,
      kind: "class",
      done: false,
      room: o.slot.room,
    });
  }

  items.sort((a, b) =>
    a.date === b.date ? (a.time ?? "99").localeCompare(b.time ?? "99") : a.date.localeCompare(b.date),
  );
  return { items, daysInMonth: last };
}
