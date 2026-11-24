import Link from "next/link";
import { CreditCard, GraduationCap, Receipt } from "lucide-react";
import { AgendaBoard, type Cell } from "./agenda-board";
import { EventRow } from "@/components/event-row";
import { PageHeader } from "@/components/page-header";
import { TypesManager } from "@/components/types-manager";
import { addDays, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import {
  type CalendarItem,
  type ChecklistItem,
  type EventType,
  getAgendaMonth,
  getChecklists,
  getEventTypes,
} from "@/lib/routine";
import { getSubjects } from "@/lib/studies";
import { getClassSlots, getTerm } from "@/lib/class-slots";
import { TermEnded } from "@/components/term-ended";
import { addMonths } from "@/lib/schedule";

export const metadata = { title: "Agenda" };
export const dynamic = "force-dynamic";

const MONEY_COLOR = { fixed_bill: "#B49BFF", statement: "#B49BFF" } as const;
const CLASS_COLOR = "#A3E635";
// Legenda enxuta: tipos da pessoa + Aula + Dinheiro (conta e fatura juntos). "Feito" vira um risco, não uma cor.

const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;

function shortDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace(/\./g, "");
}

function colorOf(it: CalendarItem) {
  if (it.event) return it.event.color;
  if (it.kind === "class") return CLASS_COLOR;
  return it.kind === "statement" ? MONEY_COLOR.statement : MONEY_COLOR.fixed_bill;
}

// Contas e faturas aparecem só para mostrar a data; criar e pagar é no Dinheiro.
function MoneyRow({ it, todayISO }: { it: CalendarItem; todayISO: string }) {
  const late = !it.done && it.date < todayISO;
  return (
    <li>
      <Link
        href={it.kind === "statement" ? "/app/dinheiro/cartoes" : "/app/dinheiro/contas"}
        className="flex items-center gap-3 py-3"
      >
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: `${colorOf(it)}26`, color: it.done ? "#b9c6ff" : colorOf(it) }}
        >
          {it.kind === "statement" ? <CreditCard size={18} aria-hidden /> : <Receipt size={18} aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <p className={`truncate text-[15px] font-medium ${it.done ? "text-ink-soft line-through" : ""}`}>
            {it.title}
          </p>
          <p className={`text-[13px] ${late ? "text-loss" : "text-ink-soft"}`}>
            {it.kind === "statement" ? "Fatura" : "Conta fixa"}
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

// Aula do horário de Estudos: só mostra; editar é em Estudos.
function ClassRow({ it }: { it: CalendarItem }) {
  return (
    <li>
      <Link href="/app/estudos" className="flex items-center gap-3 py-3">
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: `${CLASS_COLOR}26`, color: CLASS_COLOR }}
        >
          <GraduationCap size={18} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-medium">{it.title}</p>
          <p className="text-[13px] text-ink-soft">
            Aula
            {it.time ? `, ${it.time}` : ""}
            {it.room ? `, ${it.room}` : ""}
          </p>
        </div>
      </Link>
    </li>
  );
}

function ItemRow({
  it,
  todayISO,
  checks,
  types,
}: {
  it: CalendarItem;
  todayISO: string;
  checks: Record<string, ChecklistItem[]>;
  types: EventType[];
}) {
  if (it.event) return <EventRow e={it.event} checklist={checks[it.event.id]} types={types} hideDate />;
  if (it.kind === "class") return <ClassRow it={it} />;
  return <MoneyRow it={it} todayISO={todayISO} />;
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
  const [cal, curMonth, nextMonth, checks, types, subjects, term, slots] = await Promise.all([
    getAgendaMonth(year, month, today),
    isCurrent ? null : getAgendaMonth(today.year, today.month, today),
    getAgendaMonth(nm.year, nm.month, today),
    getChecklists(),
    getEventTypes(),
    getSubjects(),
    getTerm(),
    getClassSlots(),
  ]);
  const termEnded = Boolean(term && slots.length && term.endsOn < todayISO);
  const thisMonth = curMonth ?? cal;

  // "Esta semana": hoje e os próximos 6 dias, só itens da agenda (sem contas e faturas).
  const weekEnd = toISODate(addDays(today, 6));
  const week = [...thisMonth.items, ...nextMonth.items].filter(
    (i) => (i.event || i.kind === "class") && i.date >= todayISO && i.date <= weekEnd,
  );

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

  // Agrupa a semana por dia, com o nome do dia em cima.
  const weekByDay = new Map<string, CalendarItem[]>();
  for (const it of week) weekByDay.set(it.date, [...(weekByDay.get(it.date) ?? []), it]);

  const listPanel = week.length ? (
    <>
      {[...weekByDay.entries()].map(([iso, items]) => (
        <div key={iso} className="mt-4 first:mt-3">
          <p className="text-sm font-semibold text-ink-soft">{iso === todayISO ? "Hoje" : shortDate(iso)}</p>
          <ul className="divide-y divide-white/[0.06]">
            {items.map((it) => (
              <ItemRow key={it.key} it={it} todayISO={todayISO} checks={checks} types={types} />
            ))}
          </ul>
        </div>
      ))}
    </>
  ) : (
    <p className="mt-4 text-[15px] leading-relaxed text-ink-soft">
      Nada nesta semana. Toque em “Novo” para colocar provas e compromissos, ou num dia do calendário para ver outra
      data.
    </p>
  );

  const dayPanels: Record<string, React.ReactNode> = {};
  for (const [iso, items] of byDay) {
    dayPanels[iso] = (
      <ul className="mt-3 divide-y divide-white/[0.06]">
        {items.map((it) => (
          <ItemRow key={it.key} it={it} todayISO={todayISO} checks={checks} types={types} />
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
            color: colorOf(it),
            done: it.done,
          })),
        }
      : null,
  );

  const activeTypes = types.filter((t) => !t.archived);

  return (
    <>
      <PageHeader
        title="Agenda"
        subtitle="Provas, compromissos e tudo que tem data. Aulas, contas e faturas aparecem no calendário."
      />
      {termEnded ? <TermEnded /> : null}
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
        types={types}
        subjects={subjects.map((x) => ({ id: x.id, name: x.name }))}
        legend={
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-white/[0.06] pt-3 text-xs text-ink-soft">
            {activeTypes.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
                {t.name}
              </span>
            ))}
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: CLASS_COLOR }} />
              Aula
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: MONEY_COLOR.fixed_bill }} />
              Contas e faturas
            </span>
            <span className="ml-auto">
              <TypesManager types={types} />
            </span>
          </div>
        }
      />
    </>
  );
}
