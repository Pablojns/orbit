import Link from "next/link";
import { BookOpen, CalendarClock, Check, GraduationCap } from "lucide-react";
import {
  payStatement,
  receiveIncome,
  toggleBillPaid,
  toggleHabit,
} from "@/app/app/actions";
import { ProfileButton } from "@/components/app-nav";
import { addDays, diffInDays, fromISODate, toISODate } from "@/lib/dates";
import { getClassSlots, getTerm } from "@/lib/class-slots";
import { classOccurrences } from "@/lib/studies-math";
import { getFinance, type Movement } from "@/lib/finance";
import { SheetButton } from "@/components/sheet-button";
import { BUDGET_LABEL, budgetLevel } from "@/lib/budget";
import { formatCents } from "@/lib/money";
import { requireProfile } from "@/lib/profile";
import { getAgenda, getHabits } from "@/lib/routine";

export const dynamic = "force-dynamic";

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("pt-BR", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: "America/Sao_Paulo",
    }).format(new Date()),
  );
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}

function longDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const s = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
  return s.charAt(0).toUpperCase() + s.slice(1).replace("-feira", "");
}

function shortDay(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "UTC",
  })
    .format(new Date(Date.UTC(y, m - 1, d)))
    .replace("-feira", "");
  return wd.charAt(0).toUpperCase() + wd.slice(1);
}

function inDays(n: number) {
  if (n === 0) return "hoje";
  if (n === 1) return "amanhã";
  return `em ${n} dias`;
}

const CAT_COLORS = ["#4361F5", "#A78BFA", "#7DD3FC", "#C4B5FD"];

function MiniMovements({ list }: { list: Movement[] }) {
  if (!list.length)
    return (
      <p className="text-[15px] text-ink-soft">Nada lançado neste ciclo.</p>
    );
  return (
    <ul>
      {list.map((m) => (
        <li
          key={`${m.source}-${m.id}`}
          className="flex items-center gap-3 border-t border-white/[0.07] py-2.5 first:border-t-0"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-bold">
              {m.description || m.category?.name || "Lançamento"}
            </span>
            <span className="block text-[13px] text-ink-soft">
              {fromISODate(m.occurredOn).day}/{fromISODate(m.occurredOn).month}
              {m.category?.name ? ` · ${m.category.name}` : ""}
              {m.cardName ? ` · ${m.cardName}` : ""}
            </span>
          </span>
          <span
            className={`shrink-0 text-[15px] font-extrabold ${m.type === "income" ? "text-[#b9c6ff]" : ""}`}
          >
            {m.type === "income" ? "+ " : "− "}
            {formatCents(m.amountCents)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function HomePage() {
  const profile = await requireProfile();
  const [f, agenda, habits, slots, term] = await Promise.all([
    getFinance(profile.cycleStartDay),
    getAgenda(),
    getHabits(),
    getClassSlots(),
    getTerm(),
  ]);
  const { cycle, today, summary: s } = f;
  const firstName = profile.displayName?.split(" ")[0];
  const todayIso = toISODate(today);
  const daysToPay = cycle.daysLeft + 1;

  // ---------- Contas: a pagar (faturas e contas do ciclo ainda abertas) e vai entrar
  const dues = [
    ...f.statements
      .filter(
        (st) =>
          st.status !== "paid" &&
          diffInDays(st.dueDate, cycle.end) >= 0 &&
          diffInDays(cycle.start, st.dueDate) >= 0,
      )
      .map((st) => ({
        key: `c-${st.cardId}-${st.month}`,
        name: `Fatura ${st.cardName}`,
        cents: st.remainingCents,
        date: st.dueDate,
        card: true,
        pay: {
          card_id: st.cardId,
          month: st.month,
          amount: String(st.remainingCents),
        } as Record<string, string>,
      })),
    ...f.billsInCycle
      .filter((b) => !b.paid)
      .map((b) => ({
        key: `b-${b.billId}-${b.referenceMonth}`,
        name: b.name,
        cents: b.amountCents,
        date: b.dueDate,
        card: false,
        pay: {
          bill_id: b.billId,
          reference_month: b.referenceMonth,
          amount: String(b.amountCents),
          paid: "false",
        } as Record<string, string>,
      })),
  ].sort((a, b) => diffInDays(b.date, a.date));
  const pendingIncomes = f.incomesInCycle.filter((i) => !i.received);

  // ---------- Agenda: próxima prova em destaque; depois hoje e os próximos 7 dias
  const nextExam =
    agenda.upcoming.find(
      (e) => e.kind === "exam" && !e.done && e.daysLeft >= 0,
    ) ?? null;
  type Row = {
    key: string;
    date: string;
    time: string | null;
    title: string;
    sub: string;
    study: boolean;
    cls: boolean;
    type: string;
    notes: string | null;
  };
  const classRows: Row[] = classOccurrences(
    slots,
    term,
    today,
    addDays(today, 7),
  ).map((o) => ({
    key: `a-${o.slot.id}-${o.date}`,
    date: o.date,
    time: o.slot.startsAt,
    title: `Aula: ${o.slot.subjectName}`,
    sub: `às ${o.slot.startsAt}${o.slot.room ? `, ${o.slot.room}` : ""}`,
    study: false,
    cls: true,
    type: "Aula",
    notes: null,
  }));
  const eventRows: Row[] = agenda.upcoming
    .filter((e) => e.daysLeft >= 0 && e.daysLeft <= 7 && e.id !== nextExam?.id)
    .map((e) => ({
      key: e.id,
      date: e.date,
      time: e.time,
      title: e.title,
      sub: e.time ? `às ${e.time}` : e.typeName,
      study: e.kind === "study",
      cls: false,
      type: e.typeName,
      notes: e.notes,
    }));
  const rows = [...eventRows, ...classRows]
    .sort((a, b) =>
      a.date === b.date
        ? (a.time ?? "99").localeCompare(b.time ?? "99")
        : a.date.localeCompare(b.date),
    )
    .slice(0, 6);

  // ---------- Para onde foi: só as maiores categorias
  const topCategories = s.byCategory.slice(0, 4);
  const budgetOf = (name: string) =>
    budgetLevel(c2(name), f.categories.find((x) => x.kind === "expense" && x.name === name)?.budgetCents);
  const c2 = (name: string) => s.byCategory.find((x) => x.name === name)?.cents ?? 0;
  const topTotal = topCategories.reduce((a, c) => a + c.cents, 0) || 1;

  const cycleDone = Math.min(
    100,
    Math.round((cycle.dayNumber / cycle.totalDays) * 100),
  );

  const sectionHead = (
    title: string,
    href: string,
    link: string,
    big = false,
  ) => (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className={big ? "text-[22px] lg:text-2xl" : "text-[17px]"}>
        {title}
      </h2>
      <Link
        href={href}
        className="text-sm font-bold text-[#c4b5fd] hover:text-white"
      >
        {link}
      </Link>
    </div>
  );

  return (
    <div className="space-y-4 pt-5 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:gap-5 lg:space-y-0 lg:pt-7">
      <header className="flex items-center justify-between gap-4 lg:items-baseline lg:pr-14">
        <div>
          <h1 className="text-2xl leading-tight lg:text-[28px]">
            {firstName ? `${greeting()}, ${firstName}` : greeting()}
          </h1>
          <p className="mt-0.5 text-[13px] font-semibold text-ink-soft lg:hidden">
            {longDate(todayIso)}
          </p>
        </div>
        <p className="hidden text-sm font-semibold text-ink-soft lg:block">
          {longDate(todayIso)}
        </p>
        <div className="lg:hidden">
          <ProfileButton initial={(firstName?.[0] ?? "D").toUpperCase()} />
        </div>
      </header>

      <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:grid-rows-[minmax(0,1fr)] lg:gap-5">
        {/* Coluna da esquerda: Saldo, barra de IA e Agenda */}
        <div className="space-y-4 lg:flex lg:min-h-0 lg:flex-col lg:gap-5 lg:space-y-0">
          <section className="hero-card space-y-3.5 rounded-3xl p-[22px] lg:shrink-0 lg:px-7">
            <SheetButton
              title="Extrato rápido"
              label={`Saldo ${formatCents(s.balanceCents)}. Abrir extrato rápido`}
              className="block w-full text-left"
              trigger={
                <>
                  <span className="block text-[13px] font-bold text-[#b9c2f5] lg:text-sm">
                    Saldo
                  </span>
                  <span
                    className={`mt-0.5 block text-[44px] leading-[1.05] font-extrabold tracking-[-0.03em] lg:text-[52px] ${
                      s.balanceCents < 0 ? "text-[#ff9db0]" : ""
                    }`}
                  >
                    {formatCents(s.balanceCents)}
                  </span>
                  {s.upcomingCents > 0 ? (
                    <span className="mt-1 block text-[13px] font-semibold text-[#c7cff7]">
                      já descontadas {formatCents(s.upcomingCents)} de contas a
                      vencer
                    </span>
                  ) : null}
                </>
              }
            >
              <MiniMovements list={f.movements.slice(0, 8)} />
              <Link
                href="/app/dinheiro"
                className="mt-4 flex h-12 items-center justify-center rounded-2xl border border-white/[0.14] text-[15px] font-bold hover:bg-white/[0.05]"
              >
                Ver extrato completo
              </Link>
            </SheetButton>
            <div className="flex gap-2.5 lg:gap-3">
              <SheetButton
                title="Como chegamos no “pode gastar”"
                className="flex-1 rounded-2xl bg-white/[0.08] px-3.5 py-3 text-left hover:bg-white/[0.12] lg:px-4 lg:py-3.5"
                trigger={
                  <>
                    <span className="block text-xs font-semibold text-[#c7cff7] lg:text-[13px]">
                      Pode gastar
                    </span>
                    <span className="mt-0.5 block text-lg font-extrabold whitespace-nowrap lg:text-[22px]">
                      {formatCents(s.perDayCents)}
                      <span className="text-[13px] font-bold text-[#c7cff7] lg:text-[15px]"> /dia</span>
                    </span>
                  </>
                }
              >
                <dl className="space-y-2.5 text-[15px]">
                  {(
                    [
                      ["Entrou neste ciclo", s.receivedCents],
                      ["Saiu", -s.spentCents],
                      ["Guardado em metas", -s.savedCents],
                      ["Contas e faturas que ainda vencem", -s.committedCents],
                    ] as const
                  ).map(([label, v]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <dt className="text-ink-soft">{label}</dt>
                      <dd className="font-bold">{formatCents(v)}</dd>
                    </div>
                  ))}
                  <div className="flex justify-between gap-3 border-t border-white/10 pt-2.5">
                    <dt className="font-bold">Livre até o salário</dt>
                    <dd
                      className={`font-extrabold ${s.freeCents < 0 ? "text-loss" : ""}`}
                    >
                      {formatCents(s.freeCents)}
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm leading-relaxed text-ink-soft">
                  {s.freeCents > 0
                    ? `${formatCents(s.freeCents)} divididos por ${daysToPay} ${daysToPay === 1 ? "dia" : "dias"} até o salário dá ${formatCents(s.perDayCents)} por dia.`
                    : "O que vence até o salário passa do que entrou, então não sobra nada por dia. Veja o que dá para adiar."}
                </p>
              </SheetButton>
              <div className="flex-1 rounded-2xl bg-white/[0.08] px-3.5 py-3 lg:px-4 lg:py-3.5">
                <p className="text-xs font-semibold text-[#c7cff7] lg:text-[13px]">
                  Até o salário
                </p>
                <p className="mt-0.5 text-lg font-extrabold whitespace-nowrap lg:text-[22px]">
                  {daysToPay === 1 ? "falta 1 dia" : `faltam ${daysToPay} dias`}
                </p>
              </div>
            </div>
            <div
              className="h-1.5 rounded-full bg-white/[0.12]"
              role="img"
              aria-label={`Dia ${cycle.dayNumber} de ${cycle.totalDays} do ciclo`}
            >
              <div
                className="h-1.5 rounded-full bg-[#a78bfa]"
                style={{ width: `${cycleDone}%` }}
              />
            </div>
          </section>

          <section className="rounded-3xl border border-[#a78bfa]/45 bg-[#121a45] px-[18px] pt-5 pb-2.5 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:pb-4">
            {sectionHead("Agenda", "/app/agenda", "Ver tudo", true)}
            {nextExam ? (
              <Link
                href="/app/estudos"
                className="mt-3 flex items-center gap-3 rounded-2xl bg-[#2a2158] p-3.5 hover:brightness-110"
              >
                <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-[#4b3a9e] text-[15px] font-extrabold text-[#d9ccff] lg:h-[46px] lg:w-[46px]">
                  {fromISODate(nextExam.date).day}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-bold">
                    {nextExam.title}
                  </span>
                  <span className="block text-[13px] text-ink-soft">
                    {longDate(nextExam.date)}
                    {nextExam.time ? `, ${nextExam.time}` : ""}
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-[#3a2d80] px-3 py-1.5 text-[13px] font-bold text-[#d9ccff]">
                  {inDays(nextExam.daysLeft)}
                </span>
              </Link>
            ) : null}
            <p className="mt-3 mb-1 text-xs font-bold text-ink-soft">
              Hoje e próximos dias
            </p>
            {rows.length ? (
              <ul>
                {rows.map((r) => {
                  const days = diffInDays(today, fromISODate(r.date));
                  return (
                    <li key={r.key} className="border-t border-white/[0.07]">
                      <SheetButton
                        title={r.title}
                        className="flex w-full items-center gap-3 py-3 text-left hover:bg-white/[0.02]"
                        trigger={
                          <>
                            <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-[#151d45] text-[15px] font-extrabold text-ink-soft lg:h-[46px] lg:w-[46px]">
                              {r.study ? (
                                <BookOpen size={19} aria-hidden />
                              ) : r.cls ? (
                                <GraduationCap size={19} aria-hidden />
                              ) : (
                                fromISODate(r.date).day
                              )}
                            </span>
                            <span className="min-w-0 flex-1 block">
                              <span className="block truncate text-[15px] font-bold">
                                {r.title}
                              </span>
                              <span className="block text-[13px] text-ink-soft">
                                {days === 0
                                  ? "Hoje"
                                  : days === 1
                                    ? "Amanhã"
                                    : shortDay(r.date)}{" "}
                                · {r.sub}
                              </span>
                            </span>
                          </>
                        }
                      >
                        <dl className="space-y-2 text-[15px]">
                          <div className="flex justify-between gap-3">
                            <dt className="text-ink-soft">Quando</dt>
                            <dd className="font-bold">
                              {longDate(r.date)}
                              {r.time ? `, ${r.time}` : ""}
                            </dd>
                          </div>
                          <div className="flex justify-between gap-3">
                            <dt className="text-ink-soft">Tipo</dt>
                            <dd className="font-bold">{r.type}</dd>
                          </div>
                        </dl>
                        {r.notes ? (
                          <p className="mt-3 rounded-xl bg-white/[0.05] p-3 text-sm whitespace-pre-line">
                            {r.notes}
                          </p>
                        ) : null}
                        <Link
                          href={
                            r.cls ? "/app/estudos" : `/app/agenda?dia=${r.date}`
                          }
                          className="mt-5 flex h-12 items-center justify-center rounded-2xl border border-white/[0.14] text-[15px] font-bold hover:bg-white/[0.05]"
                        >
                          {r.cls ? "Abrir Estudos" : "Abrir na Agenda"}
                        </Link>
                      </SheetButton>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="flex items-center gap-2 border-t border-white/[0.07] py-3 text-[15px] text-ink-soft">
                <CalendarClock size={18} aria-hidden /> Nada marcado nos
                próximos 7 dias.
              </p>
            )}
          </section>
        </div>

        {/* Coluna da direita: Contas, Hábitos, Para onde foi */}
        <div className="space-y-4 lg:flex lg:min-h-0 lg:flex-col lg:gap-5 lg:space-y-0">
          <section className="glass rounded-3xl p-[18px] lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:py-[22px]">
            {sectionHead("Contas", "/app/dinheiro/contas", "Contas fixas")}
            <p className="mt-3 text-xs font-bold text-ink-soft">A pagar</p>
            {dues.length ? (
              <ul className="mt-1.5">
                {dues.slice(0, 4).map((d) => {
                  const days = diffInDays(today, d.date);
                  return (
                    <li
                      key={d.key}
                      className="flex items-center gap-2.5 border-t border-white/[0.07] py-2.5"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold">
                          {d.name}
                        </span>
                        <span
                          className={`block text-[13px] ${days < 0 ? "text-loss" : "text-ink-soft"}`}
                        >
                          {days < 0
                            ? `venceu dia ${d.date.day}`
                            : days === 0
                              ? "vence hoje"
                              : `vence dia ${d.date.day}`}
                        </span>
                      </span>
                      <span className="text-[15px] font-extrabold">
                        {formatCents(d.cents)}
                      </span>
                      <SheetButton
                        title="Confirmar pagamento"
                        label={`Pagar ${d.name}`}
                        className="h-11 rounded-xl border border-[#4361f5] px-3.5 text-[13px] font-bold text-[#b9c6ff] hover:bg-[#4361f5]/20 lg:h-9"
                        trigger="Pagar"
                      >
                        <p className="text-[15px]">
                          <strong>{d.name}</strong>, {formatCents(d.cents)},
                          vencimento dia {d.date.day}.
                        </p>
                        <p className="mt-1 text-sm text-ink-soft">
                          O pagamento entra hoje no seu extrato e sai do Saldo.
                        </p>
                        <form
                          action={d.card ? payStatement : toggleBillPaid}
                          className="mt-5"
                        >
                          {Object.entries(d.pay).map(([k, v]) => (
                            <input key={k} type="hidden" name={k} value={v} />
                          ))}
                          <button
                            type="submit"
                            className="grad-primary h-12 w-full rounded-2xl text-base font-bold text-white"
                          >
                            Confirmar pagamento de {formatCents(d.cents)}
                          </button>
                        </form>
                      </SheetButton>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1.5 border-t border-white/[0.07] py-2.5 text-[15px] text-ink-soft">
                {f.bills.length || f.cards.length
                  ? "Nada a pagar até o salário."
                  : "Cadastre suas contas fixas e cartões."}
              </p>
            )}
            <p className="mt-2 text-xs font-bold text-ink-soft">Vai entrar</p>
            {pendingIncomes.length ? (
              <ul className="mt-1.5">
                {pendingIncomes.map((i) => {
                  const days = diffInDays(today, i.date);
                  return (
                    <li
                      key={`${i.incomeId}-${i.date.month}`}
                      className="flex items-center gap-2.5 border-t border-white/[0.07] pt-2.5 pb-1"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-bold">
                          {i.name}
                        </span>
                        <span className="block text-[13px] text-ink-soft">
                          dia {i.date.day}
                        </span>
                      </span>
                      <span className="text-[15px] font-extrabold text-[#b9c6ff]">
                        + {formatCents(i.amountCents)}
                      </span>
                      {days <= 0 ? (
                        <form action={receiveIncome}>
                          <input
                            type="hidden"
                            name="income_id"
                            value={i.incomeId}
                          />
                          <button
                            type="submit"
                            className="h-11 rounded-xl border border-[#4361f5] px-3.5 text-[13px] font-bold text-[#b9c6ff] hover:bg-[#4361f5]/20 lg:h-9"
                          >
                            Recebi
                          </button>
                        </form>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-1.5 border-t border-white/[0.07] pt-2.5 text-[15px] text-ink-soft">
                {f.incomes.length
                  ? "Tudo já entrou neste ciclo."
                  : "Cadastre seu salário em Contas fixas."}
              </p>
            )}
          </section>

          {profile.hideHabits ? null : (
            <section className="glass rounded-3xl p-[18px] lg:shrink-0 lg:px-6 lg:py-[22px]">
              {sectionHead("Hábitos de hoje", "/app/habitos", "Ver todos")}
              {habits.length ? (
                <ul className="mt-3 grid grid-cols-2 gap-2.5 lg:gap-3">
                  {habits.map((h) => (
                    <li key={h.id}>
                      <form action={toggleHabit}>
                        <input type="hidden" name="habit_id" value={h.id} />
                        <input
                          type="hidden"
                          name="checked"
                          value={String(h.checkedToday)}
                        />
                        <button
                          type="submit"
                          aria-pressed={h.checkedToday}
                          aria-label={
                            h.checkedToday
                              ? `Desmarcar ${h.name} hoje`
                              : `Marcar ${h.name} hoje`
                          }
                          className={`flex h-12 w-full items-center gap-2.5 rounded-2xl border px-3.5 text-left text-[15px] font-bold lg:h-[52px] ${
                            h.checkedToday
                              ? "border-[#4361f5] bg-[#1b2a8a] text-white"
                              : "border-white/[0.12] bg-[#151d45] text-ink"
                          }`}
                        >
                          {h.checkedToday ? (
                            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#4361f5]">
                              <Check size={12} strokeWidth={3.5} aria-hidden />
                            </span>
                          ) : (
                            <span className="h-5 w-5 shrink-0 rounded-full border-2 border-ink-soft" />
                          )}
                          <span className="truncate">{h.name}</span>
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-[15px] text-ink-soft">
                  Nenhum hábito ainda.{" "}
                  <Link
                    href="/app/habitos"
                    className="font-bold text-[#a78bfa]"
                  >
                    Criar o primeiro
                  </Link>
                </p>
              )}
            </section>
          )}

          <section className="glass rounded-3xl p-[18px] lg:shrink-0 lg:px-6 lg:py-[22px]">
            {sectionHead(
              "Para onde foi o dinheiro",
              "/app/dinheiro",
              "Extrato",
            )}
            {topCategories.length ? (
              <>
                <div
                  className="mt-3 flex h-2.5 gap-[3px] overflow-hidden rounded-full"
                  aria-hidden
                >
                  {topCategories.map((c, i) => (
                    <div
                      key={c.name}
                      style={{
                        flex: c.cents / topTotal,
                        background: CAT_COLORS[i],
                      }}
                    />
                  ))}
                </div>
                <ul className="mt-3.5 space-y-2 text-sm font-semibold">
                  {topCategories.map((c, i) => (
                    <li key={c.name}>
                      <SheetButton
                        title={c.name}
                        className="flex min-h-9 w-full items-center gap-2.5 rounded-lg text-left hover:bg-white/[0.04]"
                        trigger={
                          <>
                            <span
                              className="h-2.5 w-2.5 rounded-[3px]"
                              style={{ background: CAT_COLORS[i] }}
                              aria-hidden
                            />
                            <span className="flex-1">
                              {c.name}
                              {budgetOf(c.name) !== "ok" ? (
                                <span
                                  className={`ml-2 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                    budgetOf(c.name) === "100" ? "bg-loss/20 text-loss" : "bg-[#2a2158] text-[#d9ccff]"
                                  }`}
                                >
                                  {BUDGET_LABEL[budgetOf(c.name)]}
                                </span>
                              ) : null}
                            </span>
                            <span className="font-extrabold">
                              {formatCents(c.cents)}
                            </span>
                          </>
                        }
                      >
                        <MiniMovements
                          list={f.movements.filter(
                            (m) =>
                              m.type === "expense" &&
                              (m.category?.name ?? "Sem categoria") === c.name,
                          )}
                        />
                      </SheetButton>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="mt-2 text-[15px] text-ink-soft">
                Quando você lançar gastos, as maiores categorias aparecem aqui.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
