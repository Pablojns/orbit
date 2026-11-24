import Link from "next/link";
import { BookOpen, CalendarClock, Check, GraduationCap } from "lucide-react";
import {
  payStatement,
  receiveIncome,
  toggleBillPaid,
  toggleHabit,
} from "@/app/app/actions";
import { ProfileButton } from "@/components/app-nav";
import { QuickText } from "@/components/quick-text";
import { addDays, diffInDays, fromISODate, toISODate } from "@/lib/dates";
import { getClassSlots, getTerm } from "@/lib/class-slots";
import { classOccurrences } from "@/lib/studies-math";
import { getFinance } from "@/lib/finance";
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
    <div className="space-y-4 pt-5 lg:space-y-5 lg:pt-7">
      <header className="flex items-center justify-between gap-4 lg:items-baseline">
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

      <div className="grid gap-4 lg:grid-cols-2 lg:items-start lg:gap-5">
        {/* Coluna da esquerda: Saldo, barra de IA e Agenda */}
        <div className="space-y-4 lg:space-y-5">
          <section className="hero-card space-y-3.5 rounded-3xl p-[22px] lg:px-7">
            <Link href="/app/dinheiro" className="block">
              <p className="text-[13px] font-bold text-[#b9c2f5] lg:text-sm">
                Saldo
              </p>
              <p
                className={`mt-0.5 text-[44px] leading-[1.05] font-extrabold tracking-[-0.03em] lg:text-[52px] ${
                  s.balanceCents < 0 ? "text-[#ff9db0]" : ""
                }`}
              >
                {formatCents(s.balanceCents)}
              </p>
              {s.upcomingCents > 0 ? (
                <p className="mt-1 text-[13px] font-semibold text-[#c7cff7]">
                  já descontadas {formatCents(s.upcomingCents)} de contas a
                  vencer
                </p>
              ) : null}
            </Link>
            <div className="flex gap-2.5 lg:gap-3">
              <div className="flex-1 rounded-2xl bg-white/[0.08] px-3.5 py-3 lg:px-4 lg:py-3.5">
                <p className="text-xs font-semibold text-[#c7cff7] lg:text-[13px]">
                  Pode gastar
                </p>
                <p className="mt-0.5 text-lg font-extrabold lg:text-[22px]">
                  {formatCents(s.perDayCents)}
                  <span className="text-[15px] font-bold lg:text-lg">
                    {" "}
                    por dia
                  </span>
                </p>
              </div>
              <div className="flex-1 rounded-2xl bg-white/[0.08] px-3.5 py-3 lg:px-4 lg:py-3.5">
                <p className="text-xs font-semibold text-[#c7cff7] lg:text-[13px]">
                  Até o salário
                </p>
                <p className="mt-0.5 text-lg font-extrabold lg:text-[22px]">
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

          <QuickText />

          <section className="rounded-3xl border border-[#a78bfa]/45 bg-[#121a45] px-[18px] pt-5 pb-2.5 lg:px-6 lg:pb-4">
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
                    <li
                      key={r.key}
                      className="flex items-center gap-3 border-t border-white/[0.07] py-3"
                    >
                      <span className="grid h-[42px] w-[42px] shrink-0 place-items-center rounded-xl bg-[#151d45] text-[15px] font-extrabold text-ink-soft lg:h-[46px] lg:w-[46px]">
                        {r.study ? (
                          <BookOpen size={19} aria-hidden />
                        ) : r.cls ? (
                          <GraduationCap size={19} aria-hidden />
                        ) : (
                          fromISODate(r.date).day
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
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
        <div className="space-y-4 lg:space-y-5">
          <section className="glass rounded-3xl p-[18px] lg:px-6 lg:py-[22px]">
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
                      <form action={d.card ? payStatement : toggleBillPaid}>
                        {Object.entries(d.pay).map(([k, v]) => (
                          <input key={k} type="hidden" name={k} value={v} />
                        ))}
                        <button
                          type="submit"
                          aria-label={`Pagar ${d.name}`}
                          className="h-11 rounded-xl border border-[#4361f5] px-3.5 text-[13px] font-bold text-[#b9c6ff] hover:bg-[#4361f5]/20 lg:h-9"
                        >
                          Pagar
                        </button>
                      </form>
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
            <section className="glass rounded-3xl p-[18px] lg:px-6 lg:py-[22px]">
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

          <section className="glass rounded-3xl p-[18px] lg:px-6 lg:py-[22px]">
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
                    <li key={c.name} className="flex items-center gap-2.5">
                      <span
                        className="h-2.5 w-2.5 rounded-[3px]"
                        style={{ background: CAT_COLORS[i] }}
                        aria-hidden
                      />
                      <span className="flex-1">{c.name}</span>
                      <span className="font-extrabold">
                        {formatCents(c.cents)}
                      </span>
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
