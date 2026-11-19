import Link from "next/link";
import { Check, CreditCard, Receipt, Trash2 } from "lucide-react";
import { AgendaBoard, type Cell } from "./agenda-board";
import { EditTask } from "@/components/edit-forms";
import { EventRow } from "@/components/event-row";
import { PageHeader } from "@/components/page-header";
import { deleteTask, toggleTask } from "@/app/app/actions";
import { addDays, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { type CalendarItem, getAgenda, getAgendaMonth, type Task } from "@/lib/routine";
import { addMonths } from "@/lib/schedule";

export const metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

const PRIORITY = {
  1: { label: "Alta", tone: "bg-loss/15 text-loss" },
  2: { label: "Média", tone: "bg-sun/20 text-sun" },
  3: { label: "Baixa", tone: "bg-white/[0.06] text-ink-soft" },
} as Record<number, { label: string; tone: string }>;

const DOT: Record<CalendarItem["kind"], string> = {
  exam: "bg-cobalt",
  appointment: "bg-[#c9a7ff]",
  deadline: "bg-loss",
  bill: "bg-sun",
  other: "bg-ink-soft",
  fixed_bill: "bg-sun",
  statement: "bg-[#5fd4ff]",
  task: "bg-white/70",
};

const LEGEND = [
  { label: "Prova", dot: "bg-cobalt" },
  { label: "Compromisso", dot: "bg-[#c9a7ff]" },
  { label: "Entrega", dot: "bg-loss" },
  { label: "Tarefa", dot: "bg-white/70" },
  { label: "Conta", dot: "bg-sun" },
  { label: "Fatura", dot: "bg-[#5fd4ff]" },
  { label: "Feito", dot: "bg-gain" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;

function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(/\./g, "");
}

function TaskRow({ t, todayISO }: { t: Task; todayISO: string }) {
  const late = !t.done && t.dueOn && t.dueOn < todayISO;
  return (
    <li className="flex items-center gap-2.5 py-3">
      <form action={toggleTask}>
        <input type="hidden" name="id" value={t.id} />
        <input type="hidden" name="done" value={String(t.done)} />
        <button
          type="submit"
          aria-label={t.done ? `Reabrir ${t.title}` : `Concluir ${t.title}`}
          className={`grid h-7 w-7 place-items-center rounded-lg border ${
            t.done ? "border-gain bg-gain text-[#05201a]" : "border-white/25 text-transparent hover:text-ink-soft"
          }`}
        >
          <Check size={15} strokeWidth={3} aria-hidden />
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-[15px] font-medium ${t.done ? "text-ink-soft line-through" : ""}`}>{t.title}</p>
        <p className={`text-[13px] ${late ? "text-loss" : "text-ink-soft"}`}>
          Tarefa{t.dueOn ? `, ${shortDate(t.dueOn)}` : ", sem data"}
          {!t.done ? (
            <span className={`ml-1.5 rounded-full px-1.5 py-px text-[11px] font-semibold ${PRIORITY[t.priority].tone}`}>
              {PRIORITY[t.priority].label}
            </span>
          ) : null}
        </p>
      </div>
      <EditTask t={t} />
      <form action={deleteTask}>
        <input type="hidden" name="id" value={t.id} />
        <button
          type="submit"
          aria-label={`Excluir ${t.title}`}
          className="grid h-9 w-9 place-items-center rounded-full text-ink-soft hover:text-loss"
        >
          <Trash2 size={15} aria-hidden />
        </button>
      </form>
    </li>
  );
}

function ItemRow({ it, todayISO }: { it: CalendarItem; todayISO: string }) {
  if (it.event) return <EventRow e={it.event} />;
  if (it.task) return <TaskRow t={it.task} todayISO={todayISO} />;
  const late = !it.done && it.date < todayISO;
  return (
    <li>
      <Link
        href={it.kind === "statement" ? "/app/dinheiro/cartoes" : "/app/dinheiro/contas?lado=contas"}
        className="flex items-center gap-2.5 py-3"
      >
        <span
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
            it.done ? "bg-gain/15 text-gain" : late ? "bg-loss/15 text-loss" : "bg-sun/15 text-sun"
          }`}
        >
          {it.kind === "statement" ? <CreditCard size={19} aria-hidden /> : <Receipt size={19} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] font-medium ${it.done ? "text-ink-soft line-through" : ""}`}>
            {it.title}
          </p>
          <p className={`text-[13px] ${late ? "text-loss" : "text-ink-soft"}`}>
            {it.kind === "statement" ? "Fatura" : "Conta fixa"}, {shortDate(it.date)}
            {it.done ? ", paga" : late ? ", não paga" : ""}
          </p>
        </div>
        {it.amountCents ? (
          <span className="shrink-0 font-display text-sm font-semibold">{formatCents(it.amountCents)}</span>
        ) : null}
      </Link>
    </li>
  );
}

function Group({
  title,
  tone,
  items,
  todayISO,
}: {
  title: string;
  tone?: string;
  items: CalendarItem[];
  todayISO: string;
}) {
  if (!items.length) return null;
  return (
    <div className="mt-4 first:mt-3">
      <p className={`text-sm font-semibold ${tone ?? "text-ink-soft"}`}>{title}</p>
      <ul className="divide-y divide-white/[0.06]">
        {items.map((it) => (
          <ItemRow key={it.key} it={it} todayISO={todayISO} />
        ))}
      </ul>
    </div>
  );
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ mes?: string; dia?: string }> }) {
  const sp = await searchParams;
  const today = todayInSaoPaulo();
  const todayISO = toISODate(today);
  const parsed = /^(\d{4})-(\d{2})$/.exec(sp.mes ?? "");
  const year = parsed ? Number(parsed[1]) : today.year;
  const month = parsed && Number(parsed[2]) >= 1 && Number(parsed[2]) <= 12 ? Number(parsed[2]) : today.month;
  const key = monthKey(year, month);
  const selected = sp.dia && /^\d{4}-\d{2}-\d{2}$/.test(sp.dia) && sp.dia.startsWith(key) ? sp.dia : null;

  const isCurrent = year === today.year && month === today.month;
  const nm = addMonths(today.year, today.month, 1);
  const [a, cal, curMonth, nextMonth] = await Promise.all([
    getAgenda(today),
    getAgendaMonth(year, month, today),
    isCurrent ? null : getAgendaMonth(today.year, today.month, today),
    getAgendaMonth(nm.year, nm.month, today),
  ]);
  const thisMonth = curMonth ?? cal;

  // Lista do lado: o que passou sem fazer, os próximos 14 dias e tarefas sem data.
  const horizon = toISODate(addDays(today, 14));
  const soon = [...thisMonth.items, ...nextMonth.items].filter(
    (i) => !i.done && i.date >= todayISO && i.date <= horizon,
  );
  const lateEvents: CalendarItem[] = a.overdue.map((e) => ({
    key: `e-${e.id}`,
    date: e.date,
    time: e.time,
    title: e.title,
    kind: e.kind,
    done: false,
    event: e,
  }));
  const lateTasks: CalendarItem[] = a.tasks
    .filter((t) => !t.done && t.dueOn && t.dueOn < todayISO)
    .map((t) => ({ key: `t-${t.id}`, date: t.dueOn!, time: null, title: t.title, kind: "task", done: false, task: t }));
  const lateMoney = thisMonth.items.filter(
    (i) => !i.done && i.date < todayISO && (i.kind === "fixed_bill" || i.kind === "statement"),
  );
  const late = [...lateEvents, ...lateTasks, ...lateMoney].sort((x, y) => x.date.localeCompare(y.date));
  const undated: CalendarItem[] = a.tasks
    .filter((t) => !t.done && !t.dueOn)
    .map((t) => ({ key: `t-${t.id}`, date: "", time: null, title: t.title, kind: "task", done: false, task: t }));

  const byDay = new Map<string, CalendarItem[]>();
  for (const it of cal.items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);

  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: cal.daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  const monthRaw = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  const monthTitle = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);
  const nothing = !late.length && !soon.length && !undated.length;

  const listPanel = nothing ? (
    <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
      Nada nos próximos 14 dias. Cadastre provas, compromissos e tarefas em “Novo”. Contas fixas e faturas do cartão
      aparecem sozinhas.
    </p>
  ) : (
    <>
      <Group title="Ficou para trás" tone="text-loss" items={late} todayISO={todayISO} />
      <Group title="Próximos 14 dias" items={soon} todayISO={todayISO} />
      <Group title="Tarefas sem data" items={undated} todayISO={todayISO} />
    </>
  );

  const dayPanels: Record<string, React.ReactNode> = {};
  for (const [iso, items] of byDay) {
    dayPanels[iso] = (
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {items.map((it) => (
          <ItemRow key={it.key} it={it} todayISO={todayISO} />
        ))}
      </ul>
    );
  }

  const cellData: Cell[] = cells.map((d) =>
    d
      ? {
          iso: `${key}-${pad(d)}`,
          day: d,
          items: (byDay.get(`${key}-${pad(d)}`) ?? []).map((it) => ({
            key: it.key,
            title: it.title,
            dot: DOT[it.kind],
            done: it.done,
          })),
        }
      : null,
  );

  return (
    <>
      <PageHeader title="Agenda" subtitle="Provas, compromissos, entregas, tarefas, contas e faturas num lugar só." />
      <AgendaBoard
        monthKey={key}
        monthTitle={monthTitle}
        prevHref={`/app/agenda?mes=${monthKey(prev.year, prev.month)}`}
        nextHref={`/app/agenda?mes=${monthKey(next.year, next.month)}`}
        isCurrent={isCurrent}
        todayISO={todayISO}
        initialSelected={selected}
        cells={cellData}
        listPanel={listPanel}
        dayPanels={dayPanels}
        legend={
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/[0.06] pt-3 text-xs text-ink-soft">
            {LEGEND.map((l) => (
              <span key={l.label} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${l.dot}`} />
                {l.label}
              </span>
            ))}
          </div>
        }
      />
    </>
  );
}
