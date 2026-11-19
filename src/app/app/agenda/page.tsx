import Link from "next/link";
import { ChevronLeft, ChevronRight, CreditCard, ListTodo, Receipt, Check, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EditTask, EVENT_KINDS } from "@/components/edit-forms";
import { EventRow } from "@/components/event-row";
import { Field, Select, TextInput } from "@/components/fields";
import { FormSheet } from "@/components/form-sheet";
import { PageHeader } from "@/components/page-header";
import { deleteTask, saveEvent, saveTask, toggleTask } from "@/app/app/actions";
import { diffInDays, fromISODate, todayInSaoPaulo, toISODate } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { type CalendarItem, getAgenda, getAgendaMonth } from "@/lib/routine";
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
};

const WEEK = ["D", "S", "T", "Q", "Q", "S", "S"];
const pad = (n: number) => String(n).padStart(2, "0");
const monthKey = (y: number, m: number) => `${y}-${pad(m)}`;

function weekdayLong(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const s = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ mes?: string; dia?: string }> }) {
  const sp = await searchParams;
  const today = todayInSaoPaulo();
  const todayISO = toISODate(today);
  const parsed = /^(\d{4})-(\d{2})$/.exec(sp.mes ?? "");
  const year = parsed ? Number(parsed[1]) : today.year;
  const month = parsed && Number(parsed[2]) >= 1 && Number(parsed[2]) <= 12 ? Number(parsed[2]) : today.month;
  const key = monthKey(year, month);
  const selected = sp.dia && sp.dia.startsWith(key) ? sp.dia : null;

  const [a, cal] = await Promise.all([getAgenda(), getAgendaMonth(year, month, today)]);
  const openTasks = a.tasks.filter((t) => !t.done);
  const doneTasks = a.tasks.filter((t) => t.done);

  const prev = addMonths(year, month, -1);
  const next = addMonths(year, month, 1);
  const firstWeekday = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: cal.daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);

  const byDay = new Map<string, CalendarItem[]>();
  for (const it of cal.items) byDay.set(it.date, [...(byDay.get(it.date) ?? []), it]);
  const visible = selected ? (byDay.get(selected) ?? []) : cal.items;
  const groups = [...new Set(visible.map((i) => i.date))];
  const monthRaw = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, 1)),
  );
  const monthTitle = monthRaw.charAt(0).toUpperCase() + monthRaw.slice(1);

  return (
    <>
      <PageHeader title="Agenda" subtitle="Provas, compromissos, contas e tarefas no calendário." />

      {a.overdue.length ? (
        <div className="mb-5 rounded-[1.75rem] border border-loss/25 bg-loss/[0.05] px-5 pt-3">
          <p className="text-sm font-semibold text-loss">Passou da data e não foi concluído</p>
          <ul className="divide-y divide-white/[0.06]">
            {a.overdue.map((e) => (
              <EventRow key={e.id} e={e} />
            ))}
          </ul>
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]">
        {/* Calendário */}
        <section className="glass h-fit rounded-[1.75rem] p-4 lg:sticky lg:top-6">
          <div className="flex items-center justify-between">
            <Link
              href={`/app/agenda?mes=${monthKey(prev.year, prev.month)}`}
              aria-label="Mês anterior"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/[0.06]"
            >
              <ChevronLeft size={18} aria-hidden />
            </Link>
            <div className="text-center">
              <p className="font-display text-lg font-semibold">{monthTitle}</p>
              {key !== monthKey(today.year, today.month) ? (
                <Link href="/app/agenda" className="text-xs text-cobalt">
                  Voltar para hoje
                </Link>
              ) : null}
            </div>
            <Link
              href={`/app/agenda?mes=${monthKey(next.year, next.month)}`}
              aria-label="Próximo mês"
              className="grid h-10 w-10 place-items-center rounded-full hover:bg-white/[0.06]"
            >
              <ChevronRight size={18} aria-hidden />
            </Link>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-xs text-ink-soft">
            {WEEK.map((w, i) => (
              <span key={i} className="py-1">
                {w}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <span key={i} />;
              const iso = `${key}-${pad(d)}`;
              const items = byDay.get(iso) ?? [];
              const isToday = iso === todayISO;
              const isSel = iso === selected;
              return (
                <Link
                  key={i}
                  href={isSel ? `/app/agenda?mes=${key}` : `/app/agenda?mes=${key}&dia=${iso}`}
                  aria-label={`${weekdayLong(iso)}${items.length ? `, ${items.length} item(s)` : ""}`}
                  className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl text-sm transition ${
                    isSel
                      ? "grad-primary font-semibold text-white"
                      : isToday
                        ? "bg-white/[0.08] font-semibold ring-1 ring-cobalt/60"
                        : "hover:bg-white/[0.05]"
                  }`}
                >
                  <span>{d}</span>
                  <span className="flex h-1.5 gap-0.5">
                    {items.slice(0, 3).map((it) => (
                      <span key={it.key} className={`h-1.5 w-1.5 rounded-full ${it.done ? "bg-gain" : DOT[it.kind]}`} />
                    ))}
                  </span>
                </Link>
              );
            })}
          </div>

          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-white/[0.06] pt-3 text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-cobalt" />
              Prova
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#c9a7ff]" />
              Compromisso
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-loss" />
              Prazo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-sun" />
              Conta
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#5fd4ff]" />
              Fatura
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-gain" />
              Feito
            </span>
          </div>
        </section>

        {/* Cards do mês / do dia */}
        <section>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{selected ? weekdayLong(selected) : "Tudo deste mês"}</h2>
              {selected ? (
                <Link href={`/app/agenda?mes=${key}`} className="text-xs text-cobalt">
                  Ver o mês inteiro
                </Link>
              ) : (
                <p className="text-sm text-ink-soft">Toque num dia para ver só ele.</p>
              )}
            </div>
            <FormSheet title="Novo prazo" trigger="Prazo" submitLabel="Salvar prazo" action={saveEvent}>
              <Field label="O que é">
                <TextInput name="title" required maxLength={80} placeholder="Ex.: Prova de Estatística" />
              </Field>
              <Field label="Tipo">
                <Select name="kind" defaultValue="exam" options={EVENT_KINDS} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Data">
                  <TextInput name="date" type="date" required defaultValue={selected ?? undefined} />
                </Field>
                <Field label="Hora (opcional)">
                  <TextInput name="time" type="time" />
                </Field>
              </div>
              <Field label="Anotação (opcional)">
                <TextInput name="notes" maxLength={500} placeholder="Ex.: levar documento, sala 12" />
              </Field>
            </FormSheet>
          </div>

          {groups.length ? (
            <div className="mt-3 space-y-4">
              {groups.map((date) => {
                const days = diffInDays(today, fromISODate(date));
                return (
                  <div key={date}>
                    {!selected ? (
                      <p className={`mb-1.5 text-sm font-semibold ${days === 0 ? "text-cobalt" : "text-ink-soft"}`}>
                        {weekdayLong(date)}
                        {days === 0 ? ", hoje" : days === 1 ? ", amanhã" : ""}
                      </p>
                    ) : null}
                    <ul className="glass divide-y divide-white/[0.06] rounded-[1.5rem] px-5">
                      {visible
                        .filter((i) => i.date === date)
                        .map((it) =>
                          it.event ? (
                            <EventRow key={it.key} e={it.event} />
                          ) : (
                            <li key={it.key}>
                              <Link
                                href={
                                  it.kind === "statement" ? "/app/dinheiro/cartoes" : "/app/dinheiro/contas?lado=contas"
                                }
                                className="flex items-center gap-3 py-3"
                              >
                                <span
                                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl ${
                                    it.done ? "bg-gain/15 text-gain" : "bg-sun/15 text-sun"
                                  }`}
                                >
                                  {it.kind === "statement" ? (
                                    <CreditCard size={19} aria-hidden />
                                  ) : (
                                    <Receipt size={19} aria-hidden />
                                  )}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`truncate text-[15px] font-medium ${it.done ? "text-ink-soft line-through" : ""}`}
                                  >
                                    {it.title}
                                  </p>
                                  <p className="text-[13px] text-ink-soft">
                                    {it.kind === "statement" ? "Fatura do cartão" : "Conta fixa"}
                                    {it.done ? ", paga" : ""}
                                  </p>
                                </div>
                                {it.amountCents ? (
                                  <span className="shrink-0 font-display font-semibold">
                                    {formatCents(it.amountCents)}
                                  </span>
                                ) : null}
                              </Link>
                            </li>
                          ),
                        )}
                    </ul>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="mt-3">
              <EmptyState
                icon={ListTodo}
                title={selected ? "Nada neste dia" : "Mês livre"}
                description="Cadastre provas, entregas e compromissos. Contas fixas e faturas aparecem aqui sozinhas."
              />
            </div>
          )}
        </section>
      </div>

      <div className="mt-8 max-w-3xl">
        <section>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Tarefas</h2>
            <FormSheet
              title="Nova tarefa"
              trigger="Tarefa"
              submitLabel="Salvar tarefa"
              action={saveTask}
              variant="glass"
            >
              <Field label="Tarefa">
                <TextInput name="title" required maxLength={120} placeholder="Ex.: Enviar atividade de extensão" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Prioridade">
                  <Select
                    name="priority"
                    defaultValue="2"
                    options={[
                      { value: "1", label: "Alta" },
                      { value: "2", label: "Média" },
                      { value: "3", label: "Baixa" },
                    ]}
                  />
                </Field>
                <Field label="Para quando (opcional)">
                  <TextInput name="due_on" type="date" />
                </Field>
              </div>
            </FormSheet>
          </div>

          {a.tasks.length ? (
            <ul className="glass mt-3 divide-y divide-white/[0.06] rounded-[1.75rem] px-5">
              {[...openTasks, ...doneTasks].map((t) => (
                <li key={t.id} className="flex items-center gap-3 py-3">
                  <form action={toggleTask}>
                    <input type="hidden" name="id" value={t.id} />
                    <input type="hidden" name="done" value={String(t.done)} />
                    <button
                      type="submit"
                      aria-label={t.done ? `Reabrir ${t.title}` : `Concluir ${t.title}`}
                      className={`grid h-7 w-7 place-items-center rounded-lg border ${
                        t.done
                          ? "border-gain bg-gain text-[#05201a]"
                          : "border-white/25 text-transparent hover:text-ink-soft"
                      }`}
                    >
                      <Check size={15} strokeWidth={3} aria-hidden />
                    </button>
                  </form>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-[15px] ${t.done ? "text-ink-soft line-through" : ""}`}>{t.title}</p>
                    {t.dueOn ? (
                      <p className="text-[13px] text-ink-soft">
                        Até{" "}
                        {new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" })
                          .format(new Date(`${t.dueOn}T12:00:00Z`))
                          .replace(".", "")}
                      </p>
                    ) : null}
                  </div>
                  {!t.done ? (
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PRIORITY[t.priority].tone}`}>
                      {PRIORITY[t.priority].label}
                    </span>
                  ) : null}
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
              ))}
            </ul>
          ) : (
            <div className="mt-3">
              <EmptyState
                icon={ListTodo}
                title="Nenhuma tarefa"
                description="Anote o que precisa fazer, com prioridade e data se quiser."
              />
            </div>
          )}
        </section>
      </div>
    </>
  );
}
